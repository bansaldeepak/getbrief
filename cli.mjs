#!/usr/bin/env node
// brief CLI — project management + knowledge graph.
// Resource-based commands: brief <resource> <action> [args] [flags]

import { existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";
import { homedir } from "node:os";

const startTime = Date.now();

const rawArgs = process.argv.slice(2);

// Extract --root flag from anywhere in args
let explicitRoot = null;
const args = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--root" && rawArgs[i + 1]) {
    explicitRoot = rawArgs[++i];
  } else if (rawArgs[i].startsWith("--root=")) {
    explicitRoot = rawArgs[i].slice("--root=".length);
  } else {
    args.push(rawArgs[i]);
  }
}

const command = args[0];

// --- Project root detection ---

function findGitRoot() {
  if (explicitRoot) return explicitRoot;
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

// --- Help ---

const HELP = `brief — project management CLI

Resource Commands:
  story <action>       Manage stories and tasks
  todo <action>        Manage TODOs
  decision <action>    Manage decisions
  research <action>    Manage research items
  audit <action>       Manage audits
  bug <action>         Manage bugs
  memory <action>      Manage memory entries
  log <action>         Project log entries (multi-agent safe)
  tracker <action>     Rebuild/inspect tracker.yaml

  Run "brief <resource> help" for resource-specific actions.

Cross-Type Views:
  status               Summary counts (type × status)
  pending              All open/planned items across types
  active               All in_progress items across types
  completed            All done items across types
  stats [--global]     Usage stats (queries per project per day)

Search:
  search <query>       Search all types
    --story            Filter to stories
    --todo             Filter to TODOs
    --decision         Filter to decisions
    --memory           Filter to memory
    --retro            Filter to retro findings

Utilities:
  next [type]          Print next available ID (--feature=<slug> for scoped stories)
  verify-records       Validate records/logs; --base=<ref> checks immutable history

Project Setup:
  install [--dry-run] [--source=<path>]  Install the home workflow package
  init [--scope=local|global] [--source=<path>]  Set up a project (local recommended)
  update --check|--dry-run|--apply [--global] [--source=<path>]
                       Review or apply an explicit workflow package update
  update --recover     Roll back an interrupted installation (--global for machine)
  update --notice=on|off|snooze  Configure local update notices
  doctor [--json]      Check project health (symlinks, manifest, rules)
  migrate              Check/apply brief format upgrades

Options:
  --root <path>        Explicit project root
  -h, --help           Show this help
  -V, --version        Print version`;

// --- Command routing ---

if (!command || command === "--help" || command === "-h" || command === "help") {
  console.log(HELP);
  process.exit(0);
}

if (command === "version" || command === "--version" || command === "-V") {
  console.log("brief v0.2.0");
  process.exit(0);
}

const root = findGitRoot();
if (["status", "pending", "active"].includes(command)) {
  const { updateNotice } = await import("./lib/workflow-package.mjs");
  const notice = updateNotice(root);
  if (notice) console.error(notice);
}

// Resource commands
if (command === "story") {
  const { storyCommand } = await import("./lib/commands/story.mjs");
  await storyCommand(root, args[1], args.slice(2), rawArgs);

} else if (["todo", "decision", "research", "audit", "bug", "memory"].includes(command)) {
  const { itemCommand } = await import("./lib/commands/item.mjs");
  await itemCommand(root, command, args[1], args.slice(2), rawArgs);

} else if (command === "log") {
  const { logCommand } = await import("./lib/commands/log.mjs");
  await logCommand(root, args[1], args.slice(2), rawArgs);

} else if (command === "tracker") {
  const { trackerCommand } = await import("./lib/commands/tracker.mjs");
  trackerCommand(root, args[1], args.slice(2), rawArgs);

// Cross-type filters
} else if (command === "status") {
  const { statusCommand } = await import("./lib/commands/filters.mjs");
  statusCommand(root);

} else if (command === "pending") {
  const { pendingCommand } = await import("./lib/commands/filters.mjs");
  pendingCommand(root);

} else if (command === "active") {
  const { activeCommand } = await import("./lib/commands/filters.mjs");
  activeCommand(root);

} else if (command === "completed") {
  const { completedCommand } = await import("./lib/commands/filters.mjs");
  completedCommand(root);

} else if (command === "stats") {
  const { statsCommand } = await import("./lib/usage.mjs");
  const projectFilter = args[1] === "--global" ? null : basename(root);
  statsCommand(projectFilter);

// Search
} else if (command === "search") {
  const query = args.slice(1).filter((a) => !a.startsWith("--")).join(" ");
  if (!query) {
    console.error("Usage: brief search <query> [--story|--todo|--decision|--memory|--retro]");
    process.exit(1);
  }

  const typeFilter = [];
  if (rawArgs.includes("--story")) typeFilter.push("story");
  if (rawArgs.includes("--todo")) typeFilter.push("todo");
  if (rawArgs.includes("--decision")) typeFilter.push("decision");
  if (rawArgs.includes("--memory")) typeFilter.push("memory");
  if (rawArgs.includes("--retro")) typeFilter.push("retro");

  const { searchFiles } = await import("./lib/search.mjs");
  let results = searchFiles(root, query);

  if (typeFilter.length > 0) {
    results = results.filter((r) => typeFilter.includes(r.type));
  }

  if (results.length === 0) {
    console.log("No results.");
  } else {
    for (const r of results) {
      const status = r.status ? ` (${r.status})` : "";
      const id = r.id ? `${r.id}: ` : "";
      console.log(`[${r.type}] ${id}${r.brief || ""}${status}`);
      console.log(`  → ${r.file}`);
    }
    console.log(`\n${results.length} result(s)`);
  }

// Unified query (code + docs)
} else if (command === "query") {
  const { queryCommand } = await import("./lib/commands/query.mjs");
  await queryCommand(root, args.slice(1), rawArgs);

// Context (graduate, list, search)
} else if (command === "context") {
  const { contextCommand } = await import("./lib/commands/context.mjs");
  await contextCommand(root, args.slice(1), rawArgs);

// Next ID query
} else if (command === "verify-records") {
  const { verifyRecords } = await import("./lib/verify-records.mjs");
  const result = verifyRecords(root, { base: args.find(a => a.startsWith("--base="))?.slice(7) });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} else if (command === "next") {
  const type = args.slice(1).find(arg => !arg.startsWith("--")) || "story";
  const { readTracker, nextId, TYPE_CONFIG } = await import("./lib/tracker.mjs");
  if (!TYPE_CONFIG[type]) {
    console.error(`Unknown type: ${type}. Valid: story, todo, decision, research, audit, bug, memory`);
    process.exit(1);
  }
  const items = readTracker(root);
  const { recordMode } = await import("./lib/records.mjs");
  const { nextFeatureStory } = await import("./lib/identifiers.mjs");
  const feature = args.find(a => a.startsWith("--feature="))?.slice(10);
  const id = type === "story" && recordMode(root) ? nextFeatureStory(root, feature) : nextId(items, type, root, { _peek: true });
  console.log(id);

// Init / Generate / Migrate
} else if (command === "init") {
  const reindex = rawArgs.includes("--reindex");
  const nonInteractive = rawArgs.includes("--non-interactive");
  const { initProject } = await import("./lib/init.mjs");
  const scope = args.find(a => a.startsWith("--scope="))?.slice(8);
  const source = args.find(a => a.startsWith("--source="))?.slice(9);
  const { created, skipped } = await initProject(root, { reindex, nonInteractive, scope, source });
  if (created.length) {
    console.log("Created:");
    for (const f of created) console.log(`  + ${f}`);
  }
  if (skipped.length) {
    console.log("Already exists (skipped):");
    for (const f of skipped) console.log(`  . ${f}`);
  }
  if (!created.length) console.log("Nothing to do — project already initialized.");
  else console.log(`\n✓ Project scaffolded at ${root}`);

} else if (command === "update") {
  const { planWorkflow, applyWorkflow, recoverWorkflow, updateNotice, workflowPreview, resolveWorkflowSource } = await import("./lib/workflow-package.mjs");
  const global = args.includes("--global"), target = global ? homedir() : root;
  const setting = args.find(a => a.startsWith("--notice="))?.slice(9);
  const modes = ["--check", "--dry-run", "--apply", "--recover"].filter(flag => args.includes(flag));
  if (modes.length > 1 || (setting && modes.length)) throw new Error("Choose one update operation");
  if (setting) { updateNotice(target, { setting }); console.log(`Update notices: ${setting}`); }
  else if (args.includes("--recover")) console.log(JSON.stringify(recoverWorkflow(target), null, 2));
  else {
    if (!global && existsSync(join(root, ".brief/install.json"))) {
      let installScope;
      try { installScope = JSON.parse(readFileSync(join(root, ".brief/install.json"), "utf8")).scope; } catch {}
      if (installScope === "global") throw new Error("This project uses the machine workflow package; run brief update --global to review or update that scope");
    }
    const source = resolveWorkflowSource({ source: args.find(a => a.startsWith("--source="))?.slice(9), global });
    const plan = planWorkflow(target, { source, scope: global ? "global" : "local" });
    console.log(JSON.stringify(workflowPreview(plan, { diff: args.includes("--dry-run") }), null, 2));
    if (args.includes("--apply")) applyWorkflow(plan);
    if (plan.conflicts.length) process.exitCode = 1;
  }
} else if (command === "migrate") {
  const { migrateProject } = await import("./lib/migrate.mjs");
  const { added, totalItems } = migrateProject(root);
  if (added.length) {
    console.log("Migrated:");
    for (const { id, title, source } of added) {
      console.log(`  + ${id}: ${title} (from ${source})`);
    }
    console.log(`\n✓ ${added.length} items added. Total: ${totalItems}`);
  } else {
    console.log("Nothing to migrate — no new items found.");
  }

} else if (command === "doctor") {
  const json = rawArgs.includes("--json");
  const { runDoctor, printDoctorResult } = await import("./lib/doctor.mjs");
  const result = runDoctor(root, { json });
  printDoctorResult(root, result, json);
  process.exit(result.exitCode || 0);

} else if (command === "install") {
  const { installCommand } = await import("./lib/commands/install.mjs");
  installCommand(args.slice(1));

} else {
  console.error(`Unknown command: ${command}. Run: brief help`);
  process.exit(1);
}

// Log usage (non-blocking, never fails)
import { logUsage } from "./lib/usage.mjs";
logUsage(basename(root), args.join(" "), startTime);
