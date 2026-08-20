// brief log <action> — project log entries, multi-agent safe
// Each entry is a separate .md file in logs/ — no corruption from concurrent writes.

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { table } from "../format.mjs";

const LOGS_DIR = "logs";

export function logCommand(root, action, args, rawArgs) {
  switch (action) {
    case "add": return logAdd(root, args, rawArgs);
    case "list": return logList(root, args);
    case "show": return logShow(root, args[0]);
    case "help": return logHelp();
    default:
      if (action && !action.startsWith("-")) {
        // Shorthand: brief log "message" = brief log add "message"
        return logAdd(root, [action, ...args], rawArgs);
      }
      console.error(`Unknown log action: ${action}. Run: brief log help`);
      process.exit(1);
  }
}

function logAdd(root, args, rawArgs) {
  const messageParts = args.filter((a) => !a.startsWith("--"));
  const message = messageParts.join(" ");
  if (!message) {
    console.error("Usage: brief log add <message> [--tag=<tag>] [--story=S-NNN]");
    console.error("       brief log <message>     (shorthand)");
    process.exit(1);
  }

  let tag = null;
  let story = null;
  for (const arg of rawArgs) {
    if (arg.startsWith("--tag=")) tag = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--story=")) story = arg.split("=").slice(1).join("=");
  }

  const logsDir = join(root, LOGS_DIR);
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  // Filename: timestamp-based for uniqueness (ISO without colons for filesystem safety)
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 23);
  const fileName = `${ts}.md`;

  const content = `---
date: ${now.toISOString().slice(0, 10)}
time: ${now.toISOString().slice(11, 19)}
tag: ${tag || "general"}
story: ${story || "null"}
---

${message}
`;

  writeFileSync(join(logsDir, fileName), content);
  console.log(`✓ Logged: ${message}`);
  console.log(`  → ${LOGS_DIR}/${fileName}`);
}

function logList(root, args) {
  const logsDir = join(root, LOGS_DIR);
  if (!existsSync(logsDir)) {
    console.log("No logs yet. Run: brief log add <message>");
    return;
  }

  let files = readdirSync(logsDir).filter((f) => f.endsWith(".md")).sort().reverse();

  // --last=N flag
  let limit = 20;
  const tagFilter = [];
  for (const arg of args) {
    if (arg.startsWith("--last=")) limit = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--tag=")) tagFilter.push(arg.split("=")[1]);
  }

  // Parse entries
  const entries = [];
  for (const file of files) {
    const content = readFileSync(join(logsDir, file), "utf8");
    const dateMatch = content.match(/^date:\s*(.+)/m);
    const timeMatch = content.match(/^time:\s*(.+)/m);
    const tagMatch = content.match(/^tag:\s*(.+)/m);
    const storyMatch = content.match(/^story:\s*(.+)/m);

    const date = dateMatch ? dateMatch[1].trim() : file.slice(0, 10);
    const time = timeMatch ? timeMatch[1].trim() : "";
    const entryTag = tagMatch ? tagMatch[1].trim() : "general";
    const entryStory = storyMatch ? storyMatch[1].trim() : "null";

    if (tagFilter.length > 0 && !tagFilter.includes(entryTag)) continue;

    // Extract message (first non-empty line after frontmatter)
    const lines = content.split("\n");
    let pastFm = !content.startsWith("---");
    let fmCount = 0;
    let msg = "";
    for (const line of lines) {
      if (line.trim() === "---") { fmCount++; if (fmCount >= 2) pastFm = true; continue; }
      if (!pastFm) continue;
      if (line.trim()) { msg = line.trim(); break; }
    }

    entries.push([date, time.slice(0, 5), entryTag, msg.length > 60 ? msg.slice(0, 57) + "..." : msg, entryStory === "null" ? "" : entryStory]);
  }

  const shown = entries.slice(0, limit);
  console.log(table(["Date", "Time", "Tag", "Message", "Story"], shown));
  console.log(`\n${shown.length} of ${entries.length} log entries (use --last=N to adjust)`);
}

function logShow(root, fileName) {
  if (!fileName) {
    console.error("Usage: brief log show <filename>");
    process.exit(1);
  }

  const filePath = join(root, LOGS_DIR, fileName.endsWith(".md") ? fileName : `${fileName}.md`);
  if (!existsSync(filePath)) {
    console.error(`Log entry not found: ${fileName}`);
    process.exit(1);
  }

  console.log(`→ ${LOGS_DIR}/${fileName}`);
  console.log(readFileSync(filePath, "utf8"));
}

function logHelp() {
  console.log(`brief log <action>

Actions:
  add <message>         Add a log entry [--tag=<tag>] [--story=S-NNN]
  <message>             Shorthand for "add"
  list [--last=20]      List recent entries [--tag=<filter>]
  show <filename>       Show full entry
  help                  Show this help`);
}
