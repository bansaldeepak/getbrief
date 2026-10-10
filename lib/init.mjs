import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, appendFileSync, rmSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { planWorkflow, applyWorkflow, readWorkflowManifest, planGlobalProject, WORKFLOW_DIR, CLI_SOURCE } from "./workflow-package.mjs";
import { safeProjectPath, migrateRecordAuthority, recordFiles } from "./records.mjs";


import { detectStack } from "./detect.mjs";
import { detectHarnessState, applyHarness } from "./harness.mjs";

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
  const installed = readWorkflowManifest(projectRoot);
  const scopeFile = safeProjectPath(projectRoot, ".brief/install.json");
  const previousScope = installed?.scope || (existsSync(scopeFile) ? JSON.parse(readFileSync(scopeFile, "utf8")).scope : null);
  let scope = opts.scope || previousScope;
  if (!scope && !nonInteractive) scope = await ask("Install scope: local (tracked project copy, recommended) or global (machine)?", "local");
  scope ||= "local";
  if (!["local", "global"].includes(scope)) throw new Error("Scope must be local or global");
  if (previousScope && previousScope !== scope) throw new Error("Scope already selected; preserve the current install and plan an explicit scope migration");
  // All destination and ownership checks precede scaffold/harness mutation.
  const target = scope === "global" ? home : projectRoot;
  const existingPackage = scope === "local" ? installed : readWorkflowManifest(home);
  const packagePlan = existingPackage ? null : planWorkflow(target, { scope, source });
  if (packagePlan?.conflicts.length) throw new Error(`Workflow conflicts:\n${packagePlan.conflicts.join("\n")}`);
  if (scope === "global") planGlobalProject(projectRoot, existingPackage ? join(home, WORKFLOW_DIR) : source);
  for (const file of [...DIRS, ...FILES.map(f => f.dest), "AGENTS.md", "CLAUDE.md", "GEMINI.md", ".claude/rules", ".brief/.gitignore"]) safeProjectPath(projectRoot, file);
  const freshRecords = !existsSync(join(projectRoot, "documentation/tracker.yaml")) && recordFiles(projectRoot).length === 0;
  const detection = detectStack(projectRoot), relevantRules = filterRelevantRules(detection, projectRoot);
  const harnessState = detectHarnessState(projectRoot);
  if (!nonInteractive) {
    printSummary(projectRoot, detection, relevantRules, harnessState);
    const proceed = await ask("Proceed?", "Y");
    if (["n", "no"].includes(proceed)) return { created: [], skipped: [] };
  }
  const scaffold = scaffoldDocs(projectRoot), created = [...scaffold.created], skipped = [...scaffold.skipped];
  const memory = injectMemoryHarness(projectRoot); created.push(...memory.created); skipped.push(...memory.skipped);
  const harness = applyHarness(projectRoot, detectHarnessState(projectRoot)); created.push(...harness.injected); skipped.push(...harness.skipped);
  const rules = copyRelevantRules(projectRoot, relevantRules); created.push(...rules.created); skipped.push(...rules.skipped);
  if (packagePlan) {
    // Harness updates above intentionally change instruction-file surroundings, so rebase the
    // preflight plan onto those bytes while retaining exactly the selected candidate source.
    created.push(...applyWorkflow(planWorkflow(target, { scope, source })).changed);
  } else skipped.push(`${WORKFLOW_DIR}/`, ...Object.keys(installed?.registrations || {}));
  if (scope === "global") created.push(...applyWorkflow(planGlobalProject(projectRoot, join(home, WORKFLOW_DIR))).changed);
  if (freshRecords) migrateRecordAuthority(projectRoot, { apply: true });
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
