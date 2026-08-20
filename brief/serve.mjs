#!/usr/bin/env node
/**
 * Global brief MCP server.
 * Auto-detects .project/knowledge.db from cwd (walks up to git root).
 * Never crashes on missing DB — starts gracefully, reports via tool responses.
 * Runs on Node 22+ with native node:sqlite.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";

// --- Project root detection ---

function findProjectRoot(startDir) {
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

const ROOT = process.env.KNOWLEDGE_ROOT || findProjectRoot(process.cwd());

let kdb = null;
let cgdb = null;
let logQuery = null;

if (ROOT) {
  const KNOWLEDGE_DB = join(ROOT, ".project/knowledge.db");
  const CODEGRAPH_DB = join(ROOT, ".codegraph/codegraph.db");

  kdb = new DatabaseSync(KNOWLEDGE_DB);
  kdb.exec("PRAGMA journal_mode=WAL");

  cgdb = existsSync(CODEGRAPH_DB)
    ? new DatabaseSync(CODEGRAPH_DB, { readOnly: true })
    : null;

  logQuery = kdb.prepare(`
    INSERT INTO query_log (tool, caller, input_json, result_count, duration_ms)
    VALUES (?, ?, ?, ?, ?)
  `);

  process.stderr.write(`brief: serving ${KNOWLEDGE_DB}\n`);
} else {
  process.stderr.write(
    "brief: no .project/knowledge.db found in cwd hierarchy. Tools will report unavailable.\n",
  );
}

// --- Helpers ---

function requireDb() {
  if (!kdb) {
    throw new Error(
      "No knowledge graph found. Run `npm run knowledge:init` in your project, " +
        "or start this server from a directory containing .project/knowledge.db",
    );
  }
}

function withLog(tool, input, fn) {
  const start = performance.now();
  const { result, count } = fn();
  const duration = Math.round(performance.now() - start);
  const caller = process.env.MCP_CALLER || null;
  logQuery.run(tool, caller, JSON.stringify(input), count, duration);
  return result;
}

// --- Tool implementations ---

function knowledgeContext(path) {
  requireDb();
  const normalized = path.replace(/^\.?\//, "");

  const anchors = kdb
    .prepare("SELECT * FROM anchors WHERE file_path LIKE ? || '%'")
    .all(normalized);

  if (cgdb) {
    const symbols = cgdb
      .prepare(
        "SELECT name, file_path FROM nodes WHERE file_path LIKE ? || '%'",
      )
      .all(normalized);

    for (const sym of symbols) {
      const symAnchors = kdb
        .prepare(
          "SELECT * FROM anchors WHERE symbol_name = ? AND file_path = ?",
        )
        .all(sym.name, sym.file_path);
      for (const a of symAnchors) {
        if (!anchors.find((x) => x.id === a.id)) anchors.push(a);
      }
    }
  }

  const knowledgeIds = new Map();
  for (const a of anchors) {
    const key = a.knowledge_type;
    if (!knowledgeIds.has(key)) knowledgeIds.set(key, new Set());
    knowledgeIds.get(key).add(a.knowledge_id);
  }

  const todos = resolveItems("todos", knowledgeIds.get("todo"));
  const decisions = resolveItems("decisions", knowledgeIds.get("decision"));
  const constraints = resolveItems(
    "constraints",
    knowledgeIds.get("constraint"),
  );
  const memory = resolveItems("memory", knowledgeIds.get("memory"));

  return { result: { anchors, todos, decisions, constraints, memory }, count: anchors.length };
}

function resolveItems(table, ids) {
  if (!ids || ids.size === 0) return [];
  const placeholders = [...ids].map(() => "?").join(",");
  return kdb
    .prepare(`SELECT * FROM ${table} WHERE id IN (${placeholders})`)
    .all(...ids);
}

function knowledgeSearch(query, type) {
  requireDb();
  const pattern = `%${query}%`;
  let results = [];

  const tables = type
    ? [type]
    : ["todos", "decisions", "constraints", "memory", "retro_findings"];

  for (const table of tables) {
    const titleCol =
      table === "retro_findings" || table === "constraints"
        ? "summary"
        : "title";
    const rows = kdb
      .prepare(
        `SELECT *, '${table}' as _type FROM ${table} WHERE ${titleCol} LIKE ?`,
      )
      .all(pattern);
    results.push(...rows);
  }

  return { result: { results }, count: results.length };
}

function knowledgeStatus(feature) {
  requireDb();
  let stories;
  let todos;

  if (feature) {
    stories = kdb
      .prepare("SELECT * FROM stories WHERE feature = ?")
      .all(feature);
    todos = kdb.prepare("SELECT * FROM todos WHERE status = 'open'").all();
  } else {
    stories = kdb
      .prepare("SELECT * FROM stories WHERE status != 'completed' LIMIT 20")
      .all();
    todos = kdb.prepare("SELECT * FROM todos WHERE status = 'open'").all();
  }

  return { result: { stories, todos, open_count: todos.length }, count: stories.length + todos.length };
}

// --- MCP Server setup ---

const server = new Server(
  { name: "knowledge", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "knowledge_context",
      description:
        "Get relevant project knowledge (TODOs, decisions, constraints, memory) for a file or directory path",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File or directory path (repo-relative)",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "knowledge_search",
      description: "Search project knowledge by keyword",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword" },
          type: {
            type: "string",
            enum: [
              "todos",
              "decisions",
              "constraints",
              "memory",
              "retro_findings",
            ],
            description: "Filter by type",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "knowledge_status",
      description: "Get project status (stories, open TODOs)",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Filter by feature name" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let content;

    switch (name) {
      case "knowledge_context": {
        const result = withLog("knowledge_context", args, () =>
          knowledgeContext(args.path),
        );
        content = JSON.stringify(result, null, 2);
        break;
      }
      case "knowledge_search": {
        const result = withLog("knowledge_search", args, () =>
          knowledgeSearch(args.query, args?.type),
        );
        content = JSON.stringify(result, null, 2);
        break;
      }
      case "knowledge_status": {
        const result = withLog("knowledge_status", args, () =>
          knowledgeStatus(args?.feature),
        );
        content = JSON.stringify(result, null, 2);
        break;
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return { content: [{ type: "text", text: content }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
