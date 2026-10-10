// brief log <action> — project log entries, multi-agent safe
// Each entry is a separate .md file in logs/ — no corruption from concurrent writes.

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { stringify } from "yaml";
import { safeProjectPath, splitRecord } from "../records.mjs";
const SESSION = process.env.BRIEF_SESSION || randomUUID();
import { table } from "../format.mjs";
import { readBody } from "../body.mjs";

const LOGS_DIR = "documentation/logs";

export async function logCommand(root, action, args, rawArgs) {
  if (action === "--help" || action === "-h" || args.includes("--help") || args.includes("-h")) {
    return logHelp();
  }
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

async function logAdd(root, args, rawArgs) {
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

  const logsDir = safeProjectPath(root, LOGS_DIR);
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  // Parse additional flags
  let action = "UPDATE";
  let nodes = "—";
  let pr = "—";
  for (const arg of rawArgs) {
    if (arg.startsWith("--action=")) action = arg.split("=")[1].toUpperCase();
    if (arg.startsWith("--nodes=")) nodes = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--pr=")) pr = arg.split("=")[1];
  }

  // Filename: timestamp-based for uniqueness (ISO without colons for filesystem safety)
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 23);
  const session = rawArgs.find(a => a.startsWith("--session="))?.slice(10) || SESSION;
  const agent = rawArgs.find(a => a.startsWith("--agent="))?.slice(8) || "brief-cli";
  const entryId = randomUUID();
  const sessionToken = session.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32) || "session";
  const fileName = `${ts}-${sessionToken}-${entryId}.md`;

  const body = await readBody(rawArgs);

  let content = `---\n${stringify({ _brief_log: 1, entry_id: entryId, session, agent, timestamp: now.toISOString(), date: now.toISOString().slice(0, 10), action, tag, nodes, story: story || "—", pr, note: message })}---\n`;

  if (body) {
    content += `\n${body}\n`;
  }

  const relPath = `${LOGS_DIR}/${fileName}`;
  writeFileSync(join(logsDir, fileName), content, { flag: "wx" });
  console.log(`✓ Logged: ${message}`);
  console.log(`  → ${relPath}`);
  console.log(`path: ${relPath}`);
}

function logList(root, args) {
  const logsDir = safeProjectPath(root, LOGS_DIR);
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
    const actionMatch = content.match(/^action:\s*(.+)/m);
    const nodesMatch = content.match(/^nodes:\s*(.+)/m);
    const storyMatch = content.match(/^story:\s*(.+)/m);
    const prMatch = content.match(/^pr:\s*(.+)/m);
    const noteMatch = content.match(/^note:\s*(.+)/m);
    // Legacy format fallback
    const tagMatch = content.match(/^tag:\s*(.+)/m);

    const date = dateMatch ? dateMatch[1].trim() : file.slice(0, 10);
    const action = actionMatch ? actionMatch[1].trim() : (tagMatch ? tagMatch[1].trim() : "UPDATE");
    const nodes = nodesMatch ? nodesMatch[1].trim() : "—";
    const entryStory = storyMatch ? storyMatch[1].trim() : "—";
    const prVal = prMatch ? prMatch[1].trim() : "—";
    const parsed = splitRecord(content, file).data;
    const note = parsed.note ?? (noteMatch ? noteMatch[1].trim() : "");

    if (tagFilter.length > 0 && !tagFilter.includes(action.toLowerCase())) continue;

    const noteShort = note.length > 50 ? note.slice(0, 47) + "..." : note;
    entries.push([date, action, nodes, entryStory, prVal, noteShort]);
  }

  const shown = entries.slice(0, limit);
  console.log(table(["Date", "Action", "Nodes", "Story", "PR", "Note"], shown));
  console.log(`\n${shown.length} of ${entries.length} log entries (use --last=N to adjust)`);
}

function logShow(root, fileName) {
  if (!fileName) {
    console.error("Usage: brief log show <filename>");
    process.exit(1);
  }

  if (fileName.includes("/") || fileName.includes("\\")) throw new Error("Expected a log filename");
  const filePath = safeProjectPath(root, `${LOGS_DIR}/${fileName.endsWith(".md") ? fileName : `${fileName}.md`}`);
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
  add <note>            Add a log entry
    [--action=UPDATE]   CREATE|UPDATE|SUPERSEDE|DELETE|VERIFY|LINT
    [--nodes=<ids>]     Comma-separated item IDs (e.g. TODO-001,DEC-003)
    [--story=S-NNN]     Associated story
    [--session=<id>]    Session identity (defaults to a process session UUID)
    [--agent=<name>]    Agent identity
    [--pr=#NNN]         Pull request number
  <note>                Shorthand for "add"
  list [--last=20]      List recent entries [--tag=<action-filter>]
  show <filename>       Show full entry
  help                  Show this help`);
}
