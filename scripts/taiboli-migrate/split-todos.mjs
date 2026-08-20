#!/usr/bin/env node
/**
 * Split taiboli-app's monolithic TODOS.md into individual TODO-NNN.md files.
 *
 * Usage: node split-todos.mjs <project-root> [--dry-run]
 *
 * Reads: documentation/TODOS.md
 * Writes: documentation/todo/TODO-NNN-<slug>.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!projectRoot) {
  console.error("Usage: node split-todos.mjs <project-root> [--dry-run]");
  process.exit(1);
}

const todosFile = join(projectRoot, "documentation/TODOS.md");
if (!existsSync(todosFile)) {
  console.error(`Not found: ${todosFile}`);
  process.exit(1);
}

const todoDir = join(projectRoot, "documentation/todo");
if (!dryRun && !existsSync(todoDir)) {
  mkdirSync(todoDir, { recursive: true });
}

const content = readFileSync(todosFile, "utf8");
const lines = content.split("\n");

const entries = [];
let current = null;
let currentSection = "";

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Track section headers (## headings)
  if (line.startsWith("## ")) {
    currentSection = line.replace("## ", "").trim();
    continue;
  }

  // Match TODO entries: ### TODO-NNN: or ### ~~TODO-NNN:~~
  const match = line.match(/^### (?:~~)?(TODO-(\d+)):\s*(.+?)(?:~~)?\s*(?:(DONE|OBSOLETE|MOOT))?$/);
  if (match) {
    if (current) entries.push(current);
    const id = match[1];
    const num = match[2];
    const titleRaw = match[3].replace(/~~/g, "").trim();
    const inlineStatus = match[4] || null;
    const isStruck = line.includes("~~");

    let status = "open";
    if (inlineStatus === "DONE") status = "done";
    else if (inlineStatus === "OBSOLETE") status = "obsolete";
    else if (inlineStatus === "MOOT") status = "moot";
    else if (isStruck) status = "done";

    current = {
      id,
      num,
      title: titleRaw,
      status,
      section: currentSection,
      body: [],
    };
    continue;
  }

  if (current) {
    current.body.push(line);
  }
}
if (current) entries.push(current);

// Extract key fields for frontmatter without removing them from body
function parseFields(bodyLines) {
  const fields = {};

  for (const line of bodyLines) {
    const fieldMatch = line.match(/^\*\*([^*]+)\*\*:?\s*(.+)/);
    if (fieldMatch) {
      const key = fieldMatch[1].toLowerCase().replace(/\s+/g, "_");
      fields[key] = fieldMatch[2].trim();
    }
  }

  return { fields, bodyText: bodyLines };
}

console.log(`Found ${entries.length} TODO entries\n`);

let written = 0;
for (const entry of entries) {
  const { fields, bodyText } = parseFields(entry.body);
  const fileName = `${entry.id}.md`;
  const filePath = join(todoDir, fileName);

  // Build frontmatter
  const frontmatter = [
    "---",
    `id: ${entry.id}`,
    `title: "${entry.title.replace(/"/g, '\\"')}"`,
    `status: ${entry.status}`,
  ];

  if (fields.priority) frontmatter.push(`priority: ${fields.priority.split(" ")[0]}`);
  else frontmatter.push("priority: P2");

  if (fields.source) frontmatter.push(`source: "${fields.source}"`);
  if (fields.depends_on) frontmatter.push(`depends_on: "${fields.depends_on}"`);
  if (entry.section) frontmatter.push(`section: "${entry.section}"`);

  frontmatter.push("---");
  frontmatter.push("");

  // Build body
  const body = [`# ${entry.id}: ${entry.title}`, ""];

  // Add non-empty body lines (trim leading/trailing blanks)
  const trimmed = bodyText.join("\n").trim();
  if (trimmed) {
    body.push(trimmed);
    body.push("");
  }

  const fileContent = frontmatter.join("\n") + body.join("\n");

  if (dryRun) {
    console.log(`[DRY] ${fileName} (${entry.status})`);
  } else {
    writeFileSync(filePath, fileContent);
    console.log(`  + ${fileName} (${entry.status})`);
    written++;
  }
}

console.log(`\n${dryRun ? "Would write" : "Wrote"} ${written || entries.length} files to documentation/todo/`);
