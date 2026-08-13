#!/usr/bin/env node
/**
 * knowledge-graph CLI
 * Usage:
 *   knowledge-graph serve --mcp     Start MCP server (stdio transport)
 *   knowledge-graph status           Show DB status and counts
 *   knowledge-graph search <query>   Quick search from terminal
 *   knowledge-graph install          Install into Claude Code, Cursor, etc.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";

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

// --- Commands ---

if (!command || command === "--help" || command === "-h") {
  console.log(`Usage: knowledge-graph [options] [command]

Commands:
  serve --mcp    Start MCP server (stdio transport)
  status         Show project knowledge DB status
  search <query> Search knowledge by keyword
  install        Install MCP server into agents (Claude Code, Cursor)
  version        Print version

Options:
  --root <path>  Explicit project root (skips auto-detection from cwd)
  -h, --help     Show this help
  -V, --version  Print version`);
  process.exit(0);
}

if (command === "version" || command === "--version" || command === "-V") {
  console.log("knowledge-graph v0.0.1");
  process.exit(0);
}

if (command === "serve") {
  const root = findProjectRoot(process.cwd());
  if (root) process.env.KNOWLEDGE_ROOT = root;
  await import("./serve.mjs");
} else if (command === "status") {
  const root = findProjectRoot(process.cwd());
  if (!root) {
    console.error("✗ No .project/knowledge.db found.");
    process.exit(1);
  }
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(root, ".project/knowledge.db"));
  const tables = ["stories", "todos", "decisions", "constraints", "memory", "retro_findings", "anchors"];
  console.log(`Knowledge graph: ${root}/.project/knowledge.db\n`);
  for (const t of tables) {
    try {
      const [row] = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).all();
      console.log(`  ${t.padEnd(16)} ${row.n}`);
    } catch {}
  }
  const [log] = db.prepare("SELECT COUNT(*) as n FROM query_log").all();
  console.log(`\n  query_log       ${log.n} queries recorded`);
} else if (command === "search") {
  const query = args.slice(1).join(" ");
  if (!query) {
    console.error("Usage: knowledge-graph search <query>");
    process.exit(1);
  }
  const root = findProjectRoot(process.cwd());
  if (!root) {
    console.error("✗ No .project/knowledge.db found.");
    process.exit(1);
  }
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(root, ".project/knowledge.db"));
  const pattern = `%${query}%`;
  const tables = [
    { name: "todos", col: "title", hasStatus: true },
    { name: "decisions", col: "title", hasStatus: true },
    { name: "constraints", col: "summary", hasStatus: false },
    { name: "memory", col: "summary", hasStatus: false },
    { name: "retro_findings", col: "summary", hasStatus: false },
  ];
  let total = 0;
  for (const { name, col, hasStatus } of tables) {
    const select = hasStatus ? `${col}, status` : col;
    const rows = db.prepare(`SELECT ${select} FROM ${name} WHERE ${col} LIKE ?`).all(pattern);
    for (const r of rows) {
      console.log(`[${name}] ${r[col]}${r.status ? ` (${r.status})` : ""}`);
      total++;
    }
  }
  if (total === 0) console.log("No results.");
  else console.log(`\n${total} result(s)`);
} else if (command === "install") {
  const target = args[1] || "claude";
  const config = {
    type: "stdio",
    command: "knowledge-graph",
    args: ["serve", "--mcp"],
  };
  console.log(`# Add to ~/.claude.json (or equivalent for ${target}):\n`);
  console.log(JSON.stringify({ mcpServers: { knowledge: config } }, null, 2));
  console.log(`\nOr run: knowledge-graph install --write`);

  if (args.includes("--write")) {
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
  console.error(`Unknown command: ${command}. Run: knowledge-graph --help`);
  process.exit(1);
}
