#!/usr/bin/env node
// brief CLI — project management + knowledge graph.
// Resource-based commands: brief <resource> <action> [args] [flags]

import { existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { execSync } from "node:child_process";

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

function findProjectRoot(startDir) {
  if (explicitRoot) {
    if (existsSync(join(explicitRoot, ".project/knowledge.db"))) return explicitRoot;
    return null;
  }
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd: startDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (existsSync(join(gitRoot, ".project/knowledge.db"))) return gitRoot;
  } catch {}

  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, ".project/knowledge.db"))) return dir;
    dir = dirname(dir);
  }
  return null;
}

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
  next [type]          Print next available ID (default: story)

Project Setup:
  init                 Scaffold canonical project structure
  migrate              Check/apply brief format upgrades

MCP Server:
  serve --mcp          Start MCP server (stdio transport)
  install [--write]    Show/write MCP config

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

// Resource commands
if (command === "story") {
  const { storyCommand } = await import("./lib/commands/story.mjs");
  storyCommand(root, args[1], args.slice(2), rawArgs);

} else if (["todo", "decision", "research", "audit"].includes(command)) {
  const { itemCommand } = await import("./lib/commands/item.mjs");
  itemCommand(root, command, args[1], args.slice(2), rawArgs);

} else if (command === "log") {
  const { logCommand } = await import("./lib/commands/log.mjs");
  logCommand(root, args[1], args.slice(2), rawArgs);

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

// Next ID query
} else if (command === "next") {
  const type = args[1] || "story";
  const { readTracker, nextId, TYPE_CONFIG } = await import("./lib/tracker.mjs");
  if (!TYPE_CONFIG[type]) {
    console.error(`Unknown type: ${type}. Valid: story, todo, decision, research, audit`);
    process.exit(1);
  }
  const items = readTracker(root);
  const id = nextId(items, type, root);
  console.log(id);

// Init / Generate / Migrate
} else if (command === "init") {
  const reindex = rawArgs.includes("--reindex");
  const { initProject } = await import("./lib/init.mjs");
  const { created, skipped } = initProject(root, { reindex });
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

// MCP Server
} else if (command === "serve") {
  const dbRoot = findProjectRoot(process.cwd());
  if (dbRoot) process.env.KNOWLEDGE_ROOT = dbRoot;
  await import("./serve.mjs");

} else if (command === "install") {
  const target = args[1] || "claude";
  const config = {
    type: "stdio",
    command: "brief",
    args: ["serve", "--mcp"],
  };
  console.log(`# Add to ~/.claude.json (or equivalent for ${target}):\n`);
  console.log(JSON.stringify({ mcpServers: { knowledge: config } }, null, 2));

  if (rawArgs.includes("--write")) {
    const { readFileSync, writeFileSync } = await import("node:fs");
    const claudeJson = join(process.env.HOME, ".claude.json");
    const existing = existsSync(claudeJson)
      ? JSON.parse(readFileSync(claudeJson, "utf8"))
      : {};
    existing.mcpServers = existing.mcpServers || {};
    existing.mcpServers.knowledge = config;
    writeFileSync(claudeJson, JSON.stringify(existing, null, 2) + "\n");
    console.log(`\n✓ Written to ${claudeJson}`);
  }

} else {
  console.error(`Unknown command: ${command}. Run: brief help`);
  process.exit(1);
}

// Log usage (non-blocking, never fails)
import { logUsage } from "./lib/usage.mjs";
logUsage(basename(root), args.join(" "), startTime);
