#!/usr/bin/env node
/**
 * Split taiboli-app's monolithic log.md into individual log entry files.
 *
 * Usage: node split-logs.mjs <project-root> [--dry-run]
 *
 * Reads: documentation/log.md (structured table format)
 * Writes: documentation/logs/<timestamp>.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!projectRoot) {
  console.error("Usage: node split-logs.mjs <project-root> [--dry-run]");
  process.exit(1);
}

const logFile = join(projectRoot, "documentation/log.md");
if (!existsSync(logFile)) {
  console.error(`Not found: ${logFile}`);
  process.exit(1);
}

const logsDir = join(projectRoot, "documentation/logs");
if (!dryRun && !existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const content = readFileSync(logFile, "utf8");
const lines = content.split("\n");

// Find the entries section (after the ``` block starts the log entries)
let inEntries = false;
let inCodeBlock = false;
const entries = [];

for (const line of lines) {
  // Track code blocks
  if (line.trim() === "```") {
    if (inCodeBlock) {
      inCodeBlock = false;
      continue;
    }
    inCodeBlock = true;
    continue;
  }

  // Skip format section header, table header, and "## Entries" marker
  if (line.startsWith("## Entries")) {
    inEntries = true;
    continue;
  }

  if (!inEntries && !inCodeBlock) continue;
  if (!inCodeBlock && !inEntries) continue;

  // Parse log lines: DATE  ACTION  NODES  STORY  PR  NOTE
  // Format is whitespace-separated (2+ spaces between columns)
  const match = line.match(/^(\d{4}-\d{2}-\d{2})\s{2,}(\w+)\s{2,}(\S+)\s{2,}(\S+)\s{2,}(\S+)\s{2,}(.+)$/);
  if (match) {
    entries.push({
      date: match[1],
      action: match[2],
      nodes: match[3],
      story: match[4],
      pr: match[5],
      note: match[6].trim(),
    });
  }
}

console.log(`Found ${entries.length} log entries\n`);

// Generate unique filenames based on date + sequence
const dateCounts = {};
let written = 0;

for (const entry of entries) {
  dateCounts[entry.date] = (dateCounts[entry.date] || 0) + 1;
  const seq = String(dateCounts[entry.date]).padStart(3, "0");
  // Use date + sequence as filename since we don't have exact timestamps
  const fileName = `${entry.date}T00-00-${seq}.md`;
  const filePath = join(logsDir, fileName);

  const fileContent = `---
date: ${entry.date}
action: ${entry.action}
nodes: ${entry.nodes}
story: ${entry.story}
pr: ${entry.pr}
note: ${entry.note.length > 200 ? entry.note.slice(0, 200) + "..." : entry.note}
---

${entry.note}
`;

  if (dryRun) {
    console.log(`[DRY] ${fileName} — ${entry.action} ${entry.nodes} (${entry.story})`);
  } else {
    writeFileSync(filePath, fileContent);
    console.log(`  + ${fileName} — ${entry.action} ${entry.nodes}`);
    written++;
  }
}

console.log(`\n${dryRun ? "Would write" : "Wrote"} ${written || entries.length} files to documentation/logs/`);
