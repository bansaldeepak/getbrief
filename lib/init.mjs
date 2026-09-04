import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, appendFileSync, rmSync, renameSync, lstatSync, readlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";


import { detectStack } from "./detect.mjs";
import { createLink } from "./symlink.mjs";
import { detectHarnessState, applyHarness, VERSION } from "./harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../templates/project-structure");
const RULES_TEMPLATES_DIR = join(__dirname, "../templates/rules");
const CODEGRAPH_BIN = join(__dirname, "../node_modules/.bin/codegraph");
const BRIEF_SKILLS_PATH = join(__dirname, "../skills/brief");

if (!existsSync(TEMPLATES_DIR)) {
  console.warn(`Warning: templates directory not found at ${TEMPLATES_DIR}. Scaffold files will be skipped.`);
}

const DIRS = [
  "documentation",
  "documentation/stories",
  "documentation/decisions",
  "documentation/todo",
  "documentation/logs",
  "documentation/memory",
  "documentation/context",
  ".claude",
];

const FILES = [
  { src: "tracker.yaml", dest: "documentation/tracker.yaml" },
  { src: "MEMORY.md", dest: "MEMORY.md" },
  { src: "PROJECT-TRACKER.md", dest: "documentation/PROJECT-TRACKER.md" },
  { src: "CLAUDE.md", dest: ".claude/CLAUDE.md" },
];

export async function initProject(projectRoot, opts = {}) {
  const { nonInteractive = false, reindex = false } = opts;
  const created = [];
  const skipped = [];

  // 1. Scaffold documentation structure
  const scaffold = scaffoldDocs(projectRoot);
  created.push(...scaffold.created);
  skipped.push(...scaffold.skipped);

  // 2-3. Detect tech stack + agents
  const detection = detectStack(projectRoot);

  // 3.5. Detect harness injection state (before confirmation)
  let harnessState = null;
  try {
    harnessState = detectHarnessState(projectRoot, { codexDetected: detection.agents.codex });
  } catch (err) {
    console.warn(`Warning: harness detection failed: ${err.message}`);
  }

  // 4. Determine relevant rules
  const relevantRules = filterRelevantRules(detection, projectRoot);

  // 5. Interactive confirmation
  if (!nonInteractive) {
    printSummary(projectRoot, detection, relevantRules, harnessState);
    const proceed = await ask("Proceed?", "Y");
    if (proceed === "n" || proceed === "no") {
      console.log("Aborted. No changes made beyond documentation scaffold.");
      return { created: scaffold.created, skipped: scaffold.skipped };
    }
  }

  // 5b. Apply harness injection (after confirmation)
  if (harnessState) {
    try {
      const harnessResult = applyHarness(projectRoot, harnessState);
      created.push(...harnessResult.injected);
      skipped.push(...harnessResult.skipped);
    } catch (err) {
      console.warn(`Warning: harness injection failed: ${err.message}`);
    }
  }

  // 5c. Migrate old symlinks (custom-skills/ → brief/skills/brief/)
  const migration = migrateOldSymlinks(projectRoot);
  if (migration.migrated.length || migration.removed.length) {
    console.log("Migrated old symlinks:");
    for (const m of migration.migrated) {
      console.log(`  ↻ ${m.path} (updated to new location)`);
    }
    for (const r of migration.removed) {
      console.log(`  ✗ ${r.path} (removed — now a sub-skill of /brief)`);
    }
  }

  // 6. Create symlinks for detected agents
  const symlinkResults = createProjectSymlinks(projectRoot, detection.agents);
  created.push(...symlinkResults.created);
  skipped.push(...symlinkResults.skipped);

  // 7. Copy relevant rule templates
  const rulesResult = copyRelevantRules(projectRoot, relevantRules);
  created.push(...rulesResult.created);
  skipped.push(...rulesResult.skipped);

  // 8. Write manifest
  writeManifest(projectRoot, detection, symlinkResults.entries, rulesResult.installed);

  // 9. Scoped .gitignore files (inside managed dirs, not root)
  ensureGitignoreEntries(join(projectRoot, ".agents"), [
    "skills/brief",
  ]);
  ensureGitignoreEntries(join(projectRoot, ".brief"), [
    "brief-manifest.json",
  ]);
  ensureGitignoreEntries(join(projectRoot, ".claude"), [
    "skills/brief",
  ]);

  // 10. Codegraph (non-critical)
  const cgResult = initCodegraph(projectRoot, { reindex });
  if (cgResult === "created") created.push(".codegraph/");
  else if (cgResult === "exists") skipped.push(".codegraph/");

  return { created, skipped };
}

function scaffoldDocs(projectRoot) {
  const created = [];
  const skipped = [];

  for (const dir of DIRS) {
    const fullPath = join(projectRoot, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      created.push(dir + "/");
    } else {
      skipped.push(dir + "/");
    }
  }

  for (const { src, dest } of FILES) {
    const destPath = join(projectRoot, dest);
    if (!existsSync(destPath)) {
      const srcPath = join(TEMPLATES_DIR, src);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        created.push(dest);
      }
    } else {
      skipped.push(dest);
    }
  }

  return { created, skipped };
}

function createProjectSymlinks(projectRoot, agents) {
  const created = [];
  const skipped = [];
  const entries = [];

  const links = [];

  if (agents.claude) {
    links.push({ linkPath: join(projectRoot, ".claude", "skills", "brief"), label: ".claude/skills/brief" });
  }

  // Universal agent reader directory — always create
  links.push({ linkPath: join(projectRoot, ".agents", "skills", "brief"), label: ".agents/skills/brief" });

  for (const { linkPath, label } of links) {
    const result = createLink(BRIEF_SKILLS_PATH, linkPath);
    if (result.status === "created") {
      created.push(label);
    } else {
      skipped.push(label);
    }
    entries.push({ source: label, target: "~/.agents/brief/skills/brief", status: result.status === "created" || result.status === "exists" ? "ok" : "copy", mode: result.mode });
  }

  return { created, skipped, entries };
}

export function filterRelevantRules(detection, projectRoot) {
  const manifestPath = join(RULES_TEMPLATES_DIR, "manifest.json");
  if (!existsSync(manifestPath)) return [];

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const relevant = [];

  for (const template of manifest.templates) {
    if (matchesDetection(template.detect, detection, projectRoot)) {
      relevant.push(template);
    }
  }
  return relevant;
}

export function matchesDetection(detectPatterns, detection, projectRoot) {
  for (const pattern of detectPatterns) {
    if (pattern === "*") return true;
    if (pattern === ".git" || pattern === ".github") return true;

    const [file, frameworks] = pattern.split(":");
    if (!frameworks) {
      if (file === "Cargo.toml" && detection.runtime === "rust") return true;
      if (file === "go.mod" && detection.runtime === "go") return true;
      if (projectRoot && existsSync(join(projectRoot, file))) return true;
      if (file === ".github/workflows" && detection.hasCI) return true;
      continue;
    }

    // Pattern: "package.json:express|fastify|hono|koa"
    const names = frameworks.split("|");
    for (const name of names) {
      if (detection.frameworks.includes(name)) return true;
      // Check with @ prefix for scoped packages
      if (name.startsWith("@") && detection.frameworks.some(f => f.startsWith(name))) return true;
    }
  }
  return false;
}

function copyRelevantRules(projectRoot, relevantRules) {
  const created = [];
  const skipped = [];
  const installed = [];

  const rulesDir = join(projectRoot, ".claude", "rules");
  mkdirSync(rulesDir, { recursive: true });

  for (const template of relevantRules) {
    const src = join(RULES_TEMPLATES_DIR, template.file);
    const dest = join(rulesDir, template.file);

    if (existsSync(dest)) {
      skipped.push(`.claude/rules/${template.file}`);
      installed.push(template.file);
      continue;
    }

    if (existsSync(src)) {
      copyFileSync(src, dest);
      created.push(`.claude/rules/${template.file}`);
      installed.push(template.file);
    }
  }

  return { created, skipped, installed };
}

function writeManifest(projectRoot, detection, symlinkEntries, rulesInstalled) {
  const manifestDir = join(projectRoot, ".brief");
  mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    version: VERSION,
    installed_at: new Date().toISOString(),
    mode: symlinkEntries.some(e => e.mode === "copy") ? "copy" : "symlink",
    detection: {
      languages: detection.languages,
      frameworks: detection.frameworks,
      testing: detection.testing,
      runtime: detection.runtime,
      agents: detection.agents,
    },
    symlinks: symlinkEntries.map(e => ({ source: e.source, target: e.target, status: e.status })),
    rules_installed: rulesInstalled,
  };

  const manifestPath = join(manifestDir, "brief-manifest.json");
  const tmpPath = manifestPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(tmpPath, manifestPath);
}

function ensureGitignoreEntries(dir, entries) {
  mkdirSync(dir, { recursive: true });
  const giPath = join(dir, ".gitignore");
  let content = "";
  if (existsSync(giPath)) {
    content = readFileSync(giPath, "utf8");
  }

  const lines = content.split("\n").map(l => l.trim());
  const missing = entries.filter(e => !lines.includes(e));
  if (missing.length) {
    const suffix = (content && !content.endsWith("\n") ? "\n" : "") + missing.join("\n") + "\n";
    appendFileSync(giPath, suffix);
  }
}

function initCodegraph(projectRoot, opts = {}) {
  const codegraphDir = join(projectRoot, ".codegraph");

  if (opts.reindex) {
    if (existsSync(codegraphDir)) {
      rmSync(codegraphDir, { recursive: true });
    }
  }

  if (!existsSync(codegraphDir)) {
    try {
      execFileSync(CODEGRAPH_BIN, ["init", "-i", projectRoot], {
        stdio: "pipe",
        timeout: 120000,
      });
      ensureGitignoreEntries(codegraphDir, ["*", "!.gitignore"]);
      return "created";
    } catch {
      if (existsSync(codegraphDir)) {
        rmSync(codegraphDir, { recursive: true });
      }
      return "skipped";
    }
  }
  return "exists";
}

function printSummary(projectRoot, detection, relevantRules, harnessState) {
  console.log("");
  console.log("brief init");
  console.log("──────────────────────────────────────────────────");
  console.log(`Project: ${projectRoot}`);

  const stack = [detection.runtime, ...detection.frameworks].filter(Boolean).join(", ");
  if (stack) console.log(`Detected: ${stack}`);
  if (detection.languages.length) console.log(`Languages: ${detection.languages.join(", ")}`);

  const agentList = Object.entries(detection.agents).filter(([, v]) => v).map(([k]) => k);
  if (agentList.length) console.log(`Agents: ${agentList.join(", ")}`);

  console.log("");
  console.log("Skills to install:");
  console.log("  brief/      (lifecycle, project management, memory)");

  if (harnessState) {
    console.log("");
    console.log("Harness injection:");
    for (const action of harnessState.actions) {
      console.log(`  + ${action}`);
    }
  }

  if (relevantRules.length) {
    const universal = relevantRules.filter(isUniversalRule);
    const specific = relevantRules.filter(r => !isUniversalRule(r));

    console.log("");
    if (universal.length) {
      console.log(`Rules to install: Universal: ${universal.length} rules`);
    }
    if (specific.length) {
      console.log(universal.length ? "Stack-specific rules:" : "Rules to install (based on detected stack):");
      for (const rule of specific) {
        console.log(`  + ${rule.file.padEnd(28)} (${rule.name.toLowerCase()})`);
      }
    }
  }
  console.log("──────────────────────────────────────────────────");
}

function isUniversalRule(rule) {
  return rule.detect.some(p => p === "*") ||
    rule.detect.every(p => p === ".git" || p === ".github");
}

function ask(question, defaultAnswer = "Y") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} [${defaultAnswer === "Y" ? "Y/n" : "y/N"}] `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() || defaultAnswer.toLowerCase());
    });
  });
}

const OLD_PATH_PATTERN = /[/\\]custom-skills[/\\]/;
const OLD_SYMLINKS_TO_REMOVE = ["sdlc", "project-memory"];

function migrateOldSymlinks(projectRoot) {
  const migrated = [];
  const removed = [];

  const linksToCheck = [
    { dir: ".claude/skills", name: "brief" },
    { dir: ".claude/skills", name: "sdlc" },
    { dir: ".claude/skills", name: "project-memory" },
    { dir: ".agents/skills", name: "brief" },
    { dir: ".agents/skills", name: "sdlc" },
    { dir: ".agents/skills", name: "project-memory" },
  ];

  for (const { dir, name } of linksToCheck) {
    const linkPath = join(projectRoot, dir, name);
    const target = safeLinkTarget(linkPath);
    if (!target) continue;

    if (!OLD_PATH_PATTERN.test(target)) continue;

    rmSync(linkPath);

    if (OLD_SYMLINKS_TO_REMOVE.includes(name)) {
      removed.push({ path: `${dir}/${name}`, oldTarget: target, action: "removed" });
    } else {
      migrated.push({ path: `${dir}/${name}`, oldTarget: target, action: "migrated" });
    }
  }

  return { migrated, removed };
}

function safeLinkTarget(p) {
  try {
    const stat = lstatSync(p);
    if (stat.isSymbolicLink()) return readlinkSync(p);
    return null;
  } catch { return null; }
}
