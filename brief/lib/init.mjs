import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, appendFileSync, rmSync, renameSync, lstatSync, readlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { homedir } from "node:os";

import { detectStack } from "./detect.mjs";
import { createLink } from "./symlink.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../../templates/project-structure");
const RULES_TEMPLATES_DIR = join(__dirname, "../templates/rules");
const CODEGRAPH_BIN = join(__dirname, "../node_modules/.bin/codegraph");
const BRIEF_SKILLS_PATH = join(homedir(), ".agents", "brief", "skills", "brief");

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

  // Create AGENTS.md only if Codex detected
  if (detection.agents.codex) {
    const agentsMdDest = join(projectRoot, "AGENTS.md");
    if (!existsSync(agentsMdDest)) {
      const agentsMdSrc = join(TEMPLATES_DIR, "AGENTS.md");
      if (existsSync(agentsMdSrc)) {
        copyFileSync(agentsMdSrc, agentsMdDest);
        created.push("AGENTS.md");
      }
    } else {
      skipped.push("AGENTS.md");
    }
  }

  // 4. Determine relevant rules
  const relevantRules = filterRelevantRules(detection);

  // 5. Interactive confirmation
  if (!nonInteractive) {
    printSummary(projectRoot, detection, relevantRules);
    const proceed = await ask("Proceed?", "Y");
    if (proceed === "n" || proceed === "no") {
      console.log("Aborted. No changes made beyond documentation scaffold.");
      return { created: scaffold.created, skipped: scaffold.skipped };
    }
  }

  // 5b. Migrate old symlinks (custom-skills/ → brief/skills/brief/)
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

  // 9. Update .gitignore
  ensureGitignoreEntries(projectRoot, [
    ".agents/skills/",
    ".claude/skills/",
    ".agents/brief-manifest.json",
    ".codegraph/",
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

function filterRelevantRules(detection) {
  const manifestPath = join(RULES_TEMPLATES_DIR, "manifest.json");
  if (!existsSync(manifestPath)) return [];

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const relevant = [];

  for (const template of manifest.templates) {
    if (matchesDetection(template.detect, detection)) {
      relevant.push(template);
    }
  }
  return relevant;
}

function matchesDetection(detectPatterns, detection) {
  for (const pattern of detectPatterns) {
    if (pattern === "*") return true;
    if (pattern === ".git" || pattern === ".github") return true;

    const [file, frameworks] = pattern.split(":");
    if (!frameworks) {
      // File existence checks (Cargo.toml, go.mod, etc.)
      if (file === "Cargo.toml" && detection.runtime === "rust") return true;
      if (file === "go.mod" && detection.runtime === "go") return true;
      if (file === "Dockerfile" || file === "fly.toml" || file === "wrangler.jsonc") continue;
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
  const manifestDir = join(projectRoot, ".agents");
  mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    version: "1.0.0",
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

function ensureGitignoreEntries(projectRoot, entries) {
  const giPath = join(projectRoot, ".gitignore");
  let content = "";
  if (existsSync(giPath)) {
    content = readFileSync(giPath, "utf8");
  }

  const missing = entries.filter(e => !content.includes(e));
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

function printSummary(projectRoot, detection, relevantRules) {
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

  if (relevantRules.length) {
    console.log("");
    console.log("Rules to install (based on detected stack):");
    for (const rule of relevantRules) {
      console.log(`  + ${rule.file.padEnd(28)} (${rule.name.toLowerCase()})`);
    }
  }
  console.log("──────────────────────────────────────────────────");
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

const OLD_PATH_PATTERN = /custom-skills/;
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
