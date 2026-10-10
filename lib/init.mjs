import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, appendFileSync, mkdtempSync, readdirSync, lstatSync, rmSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { homedir, tmpdir } from "node:os";
import { planWorkflow, applyWorkflow, readWorkflowManifest, planGlobalProject, WORKFLOW_DIR, CLI_SOURCE, planFileWrites, assertWorkflowReady } from "./workflow-package.mjs";
import { safeProjectPath, recordMode, recordFiles } from "./records.mjs";


import { detectStack } from "./detect.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../templates/project-structure");
const RULES_TEMPLATES_DIR = join(__dirname, "../templates/rules");
const CODEGRAPH_BIN = join(__dirname, "../node_modules/.bin/codegraph");

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
  const { nonInteractive = false, reindex = false, source = CLI_SOURCE, home = homedir() } = opts;
  assertWorkflowReady(projectRoot);
  recordMode(projectRoot); // A pending record migration also blocks setup.
  const installed = readWorkflowManifest(projectRoot);
  const scopeFile = safeProjectPath(projectRoot, ".brief/install.json");
  const previousScope = installed?.scope || (existsSync(scopeFile) ? JSON.parse(readFileSync(scopeFile, "utf8")).scope : null);
  let scope = opts.scope || previousScope;
  if (!scope && !nonInteractive) scope = await ask("Install scope: local (tracked project copy, recommended) or global (machine)?", "local");
  scope ||= "local";
  if (!["local", "global"].includes(scope)) throw new Error("Scope must be local or global");
  if (previousScope && previousScope !== scope) throw new Error("Scope already selected; preserve the current install and plan an explicit scope migration");
  const target = scope === "global" ? home : projectRoot;
  assertWorkflowReady(target);
  const existingPackage = scope === "local" ? installed : readWorkflowManifest(home);
  const pinnedSource = existingPackage ? join(target, WORKFLOW_DIR) : source;
  const packagePlan = existingPackage ? { root: target, scope, changes: [], conflicts: [], manifest: existingPackage } : planWorkflow(target, { scope, source: pinnedSource });
  if (packagePlan.conflicts.length) throw new Error(`Workflow conflicts:\n${packagePlan.conflicts.join("\n")}`);
  let projectPlan = scope === "local" ? packagePlan : planGlobalProject(projectRoot, pinnedSource);
  const freshRecords = !existsSync(join(projectRoot, "documentation/tracker.yaml")) && recordFiles(projectRoot).length === 0 && !recordMode(projectRoot);
  const detection = detectStack(projectRoot), relevantRules = filterRelevantRules(detection, projectRoot);
  // Build the scaffold in a private staging directory. Every existing input and selected output
  // is validated before the first project/home mutation, including MEMORY and rule-file leaves.
  const fileNames = [...FILES.map(f => f.dest), ...relevantRules.map(rule => `.claude/rules/${rule.file}`)];
  for (const file of fileNames) {
    const path = safeProjectPath(projectRoot, file), info = lstatSync(path, { throwIfNoEntry: false });
    if (info && !info.isFile()) throw new Error(`Expected a regular scaffold file: ${file}`);
  }
  for (const dir of [...DIRS, ".claude/rules"]) {
    const path = safeProjectPath(projectRoot, dir), info = lstatSync(path, { throwIfNoEntry: false });
    if (info && !info.isDirectory()) throw new Error(`Expected scaffold directory: ${dir}`);
  }
  const stage = mkdtempSync(join(tmpdir(), "brief-init-stage-"));
  let scaffold, memory, rules, files = {};
  try {
    for (const file of fileNames) if (existsSync(join(projectRoot, file))) {
      mkdirSync(dirname(join(stage, file)), { recursive: true }); copyFileSync(join(projectRoot, file), join(stage, file));
    }
    scaffold = scaffoldDocs(stage); memory = injectMemoryHarness(stage); rules = copyRelevantRules(stage, relevantRules);
    for (const file of fileNames) if (existsSync(join(stage, file))) files[file] = readFileSync(join(stage, file), "utf8");
  } finally { rmSync(stage, { recursive: true, force: true }); }
  if (freshRecords) {
    files[".brief/records.json"] = JSON.stringify({ version: 1, authority: "markdown" }, null, 2) + "\n";
    const path = safeProjectPath(projectRoot, "documentation/.gitignore");
    let ignore = existsSync(path) ? readFileSync(path, "utf8") : "";
    for (const entry of ["/tracker.yaml", "/PROJECT-TRACKER.md"]) if (!ignore.split(/\r?\n/).includes(entry)) ignore += (ignore && !ignore.endsWith("\n") ? "\n" : "") + entry + "\n";
    files["documentation/.gitignore"] = ignore;
  }
  const additional = planFileWrites(projectRoot, files);
  projectPlan = { ...projectPlan, changes: [...additional, ...projectPlan.changes] };
  if (!nonInteractive) {
    printSummary(projectRoot, detection, relevantRules, null);
    const proceed = await ask("Proceed?", "Y");
    if (["n", "no"].includes(proceed)) return { created: [], skipped: [] };
  }
  if (scope === "global") applyWorkflow(packagePlan);
  const result = applyWorkflow(projectPlan);
  const created = [...result.changed], skipped = [...scaffold.skipped, ...memory.skipped, ...rules.skipped];
  for (const dir of DIRS) if (!existsSync(join(projectRoot, dir))) { mkdirSync(join(projectRoot, dir), { recursive: true }); created.push(dir + "/"); }
  if (scaffold.created.includes("documentation/")) created.push("documentation/");
  if (!result.changed.length) skipped.push(`${WORKFLOW_DIR}/`);
  skipped.push(...Object.keys(installed?.registrations || {}).filter(file => !result.changed.includes(file)));
  if (!opts.skipCodegraph) {
    const cgResult = initCodegraph(projectRoot, { reindex });
    if (cgResult === "created") created.push(".codegraph/");
    else if (cgResult === "exists") skipped.push(".codegraph/");
  }
  return { created, skipped, scope };
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

const MEMORY_HARNESS_OPEN = "<!-- brief:memory-harness -->";
const MEMORY_HARNESS_CLOSE = "<!-- /brief:memory-harness -->";
const MEMORY_HARNESS_SNIPPET = `${MEMORY_HARNESS_OPEN}
Use \`brief memory\` commands instead of reading files directly:
- \`brief memory list\` — concise index of all memories
- \`brief memory show <name>\` — view a specific memory
- \`brief memory create <name> --memtype=<type>\` — create a new memory
- \`brief memory update <name>\` — update an existing memory

Do NOT read \`documentation/memory/*.md\` files directly — use the commands above.
${MEMORY_HARNESS_CLOSE}`;

function injectMemoryHarness(projectRoot) {
  const created = [];
  const skipped = [];
  const memoryPath = join(projectRoot, "MEMORY.md");

  if (!existsSync(memoryPath)) {
    skipped.push("MEMORY.md (missing)");
    return { created, skipped };
  }

  const content = readFileSync(memoryPath, "utf8");
  if (content.includes(MEMORY_HARNESS_OPEN)) {
    skipped.push("MEMORY.md (harness present)");
    return { created, skipped };
  }

  const headingRe = /^# .+\n/m;
  const match = content.match(headingRe);
  let updated;
  if (match) {
    const insertAt = match.index + match[0].length;
    updated = content.slice(0, insertAt) + "\n" + MEMORY_HARNESS_SNIPPET + "\n\n" + content.slice(insertAt);
  } else {
    updated = MEMORY_HARNESS_SNIPPET + "\n\n" + content;
  }

  const tmpPath = memoryPath + ".tmp";
  writeFileSync(tmpPath, updated);
  renameSync(tmpPath, memoryPath);
  created.push("MEMORY.md (harness injected)");
  return { created, skipped };
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
    const detectedFrameworks = detection.frameworks ?? [];
    for (const name of names) {
      if (detectedFrameworks.includes(name)) return true;
      // Check with @ prefix for scoped packages
      if (name.startsWith("@") && detectedFrameworks.some(f => f.startsWith(name))) return true;
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
