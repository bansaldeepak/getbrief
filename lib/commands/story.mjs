// brief story <action> — story and task management

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readTracker, writeTracker, nextId, withLockIfGit, allocateTaskNum, gitCommonDir } from "../tracker.mjs";
import { scanFiles } from "../scan.mjs";
import { table, statusOrder } from "../format.mjs";
import { readBody } from "../body.mjs";

export async function storyCommand(root, action, args, rawArgs) {
  switch (action) {
    case "list": return storyList(root, args);
    case "show": return storyShow(root, args[0]);
    case "summary": return storySummary(root, args, rawArgs);
    case "tasks": return storyTasks(root, args[0]);
    case "task": return storyTask(root, args, rawArgs);
    case "create": return storyCreate(root, args, rawArgs);
    case "update": return storyUpdate(root, args, rawArgs);
    case "help": return storyHelp();
    default:
      console.error(`Unknown story action: ${action}. Run: brief story help`);
      process.exit(1);
  }
}

function getItems(root) {
  const items = readTracker(root);
  return items.length > 0 ? items : scanFiles(root);
}

function storyList(root, args) {
  const items = getItems(root).filter((i) => i.type === "story");
  const showAll = args.includes("--all");
  const filtered = showAll
    ? items
    : items.filter((i) => !["done", "completed", "dropped"].includes(i.status));

  filtered.sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  const rows = filtered.map((s) => [s.id, s.title, s.status, s.branch || "", s.current_task || ""]);
  console.log(table(["ID", "Title", "Status", "Branch", "Current Task"], rows));
  console.log(`\n${filtered.length} story(s)${showAll ? "" : " (active only, use --all for full history)"}`);
}

async function storySummary(root, args, rawArgs) {
  const action = args[0];

  if (action === "update") {
    const storyId = args[1];
    if (!storyId) {
      console.error("Usage: brief story summary update <S-NNN> --body=<content>");
      console.error('       echo "content" | brief story summary update <S-NNN>');
      process.exit(1);
    }
    const items = readTracker(root);
    const item = items.find((i) => i.id === storyId);
    if (!item?.story) {
      console.error(`Story not found or has no file: ${storyId}`);
      process.exit(1);
    }
    const summaryPath = item.story.replace("story.md", "summary.md");
    const fullPath = join(root, summaryPath);
    if (!existsSync(fullPath)) {
      console.error(`Summary not found: ${summaryPath}`);
      process.exit(1);
    }
    const body = await readBody(rawArgs);
    if (!body) {
      console.error("Error: --body flag or stdin pipe required for update.");
      process.exit(1);
    }
    let content = readFileSync(fullPath, "utf8");
    const firstNewline = content.indexOf("\n");
    const header = firstNewline !== -1 ? content.slice(0, firstNewline) : content;
    content = header + "\n\n" + body + "\n";
    writeFileSync(fullPath, content);
    console.log(`✓ Updated summary for ${storyId}`);
    console.log(`path: ${summaryPath}`);
    return;
  }

  // Default: read (brief story summary S-NNN)
  const storyId = action;
  if (!storyId) {
    console.error("Usage: brief story summary <S-NNN>");
    console.error("       brief story summary update <S-NNN> --body=<content>");
    process.exit(1);
  }
  const items = readTracker(root);
  const item = items.find((i) => i.id === storyId);
  if (!item?.story) {
    console.error(`Story not found or has no file: ${storyId}`);
    process.exit(1);
  }
  const summaryPath = item.story.replace("story.md", "summary.md");
  const fullPath = join(root, summaryPath);
  if (!existsSync(fullPath)) {
    console.error(`Summary not found: ${summaryPath}`);
    process.exit(1);
  }
  console.log(`→ ${summaryPath}`);
  console.log(readFileSync(fullPath, "utf8"));
}

function storyShow(root, storyId) {
  if (!storyId) {
    console.error("Usage: brief story show <S-NNN>");
    process.exit(1);
  }
  const storyPath = findStoryFile(root, storyId);
  if (!storyPath) {
    // Fallback to tracker entry
    const items = readTracker(root);
    const item = items.find((i) => i.id === storyId);
    if (item) {
      console.log(`${item.id}: ${item.title}`);
      console.log(`  Status: ${item.status}`);
      console.log(`  Branch: ${item.branch || "—"}`);
      console.log(`  Task:   ${item.current_task || "—"}`);
      console.log(`  PR:     ${item.pr || "—"}`);
      console.log(`  Link:   ${item.link || "—"}`);
      if (item.story) console.log(`  File:   ${item.story}`);
    } else {
      console.error(`Story not found: ${storyId}`);
      process.exit(1);
    }
    return;
  }
  console.log(`→ ${storyPath}`);
  console.log(readFileSync(join(root, storyPath), "utf8"));
}

function storyTasks(root, storyId) {
  if (!storyId) {
    console.error("Usage: brief story tasks <S-NNN>");
    process.exit(1);
  }
  const tasksDir = findTasksDir(root, storyId);
  if (!tasksDir) {
    console.error(`No tasks directory found for ${storyId}`);
    process.exit(1);
  }

  const files = readdirSync(join(root, tasksDir))
    .filter((f) => /^T-\d+\.md$/i.test(f))
    .sort();

  const rows = [];
  for (const file of files) {
    const content = readFileSync(join(root, tasksDir, file), "utf8");
    const titleMatch = content.match(/^#\s+(.+)/m);
    const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/i) || content.match(/Status:\s*(\w+)/i);
    const priorityMatch = content.match(/\*\*Priority:\*\*\s*(\S+)/i) || content.match(/Priority:\s*(\S+)/i);
    const blockedMatch = content.match(/\*\*Blocked By:\*\*\s*(.+)/i);

    const num = parseInt(file.match(/T-(\d+)/i)[1], 10);
    const id = `${storyId}-T${num}`;
    const title = titleMatch ? titleMatch[1].replace(/^S-\d+-T\d+:\s*/, "") : file;
    const status = statusMatch ? statusMatch[1].trim() : "pending";
    const priority = priorityMatch ? priorityMatch[1].trim() : "—";
    const blocked = blockedMatch ? blockedMatch[1].trim() : "—";

    rows.push([id, title, status, priority, blocked]);
  }

  rows.sort((a, b) => statusOrder(a[2]) - statusOrder(b[2]));
  console.log(table(["ID", "Title", "Status", "Priority", "Blocked By"], rows));
  console.log(`  → ${tasksDir}`);
  console.log(`\n${rows.length} task(s)`);
}

async function storyTask(root, args, rawArgs) {
  // brief story task create S-001 "Task title" [--blocked-by=S-001-T1]
  // brief story task S-001-T2
  // brief story task update S-001-T2 status=completed
  if (args[0] === "create") {
    return storyTaskCreate(root, args.slice(1), rawArgs);
  }
  if (args[0] === "update") {
    return storyTaskUpdate(root, args.slice(1), rawArgs);
  }

  const taskId = args[0];
  if (!taskId) {
    console.error("Usage: brief story task <S-NNN-TN>");
    console.error("       brief story task create <S-NNN> <title>");
    console.error("       brief story task update <S-NNN-TN> status=<value>");
    process.exit(1);
  }

  const { storyId, taskFile } = parseTaskId(taskId);
  const tasksDir = findTasksDir(root, storyId);
  if (!tasksDir) {
    console.error(`No tasks directory found for ${storyId}`);
    process.exit(1);
  }

  const filePath = join(root, tasksDir, taskFile);
  if (!existsSync(filePath)) {
    console.error(`Task file not found: ${tasksDir}/${taskFile}`);
    process.exit(1);
  }

  const relPath = `${tasksDir}/${taskFile}`;
  console.log(`→ ${relPath}`);
  console.log(readFileSync(filePath, "utf8"));
}

async function storyTaskCreate(root, args, rawArgs) {
  const storyId = args[0];
  const titleParts = args.slice(1).filter((a) => !a.startsWith("--"));
  const title = titleParts.join(" ");

  if (!storyId || !title) {
    console.error("Usage: brief story task create <S-NNN> <title> [--blocked-by=S-NNN-TN] [--priority=P1] [--body=<content>]");
    process.exit(1);
  }

  const tasksDir = findTasksDir(root, storyId);
  if (!tasksDir) {
    console.error(`No tasks directory found for ${storyId}. Create the story first: brief story create`);
    process.exit(1);
  }

  const body = await readBody(rawArgs);

  // Auto-number: use counter in git repos, fall back to directory scan
  let nextNum;
  const gitDir = gitCommonDir(root);
  if (gitDir) {
    nextNum = allocateTaskNum(root, gitDir, storyId);
  } else {
    const existing = readdirSync(join(root, tasksDir))
      .filter((f) => /^T-\d+\.md$/i.test(f))
      .map((f) => parseInt(f.match(/T-(\d+)/i)[1], 10));
    nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  }
  const taskNum = String(nextNum).padStart(3, "0");
  const taskId = `${storyId}-T${nextNum}`;
  const taskFile = `T-${taskNum}.md`;

  // Parse flags
  let blockedBy = null;
  let priority = "P1";
  let description = "";
  for (const arg of rawArgs) {
    if (arg.startsWith("--blocked-by=")) blockedBy = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--priority=")) priority = arg.split("=")[1];
    if (arg.startsWith("--description=")) description = arg.split("=").slice(1).join("=");
  }

  let content;
  if (body) {
    content = `# ${taskId}: ${title}

**Status:** pending
**Priority:** ${priority}
**Blocked By:** ${blockedBy || "—"}

${body}
`;
  } else {
    content = `# ${taskId}: ${title}

**Status:** pending
**Priority:** ${priority}
**Blocked By:** ${blockedBy || "—"}

## Description

${description || "<!-- What this task accomplishes -->"}

## Implementation Notes

<!-- Technical approach, key files, gotchas -->

## Verification

- [ ] ...
`;
  }

  writeFileSync(join(root, tasksDir, taskFile), content);

  // Update current_task in tracker if this is the first task
  if (existing.length === 0) {
    withLockIfGit(root, () => {
      const items = readTracker(root);
      const storyIdx = items.findIndex((i) => i.id === storyId);
      if (storyIdx !== -1) {
        items[storyIdx].current_task = taskId;
        writeTracker(root, items);
      }
    });
  }

  const relPath = `${tasksDir}/${taskFile}`;
  console.log(`✓ Created ${taskId}: ${title}`);
  console.log(`  → ${relPath}`);
  console.log(`path: ${relPath}`);
}

async function storyTaskUpdate(root, args, rawArgs) {
  const taskId = args[0];
  const fields = args.slice(1).filter((a) => !a.startsWith("--body"));
  if (!taskId || (fields.length === 0 && !rawArgs.some((a) => a.startsWith("--body")))) {
    console.error("Usage: brief story task update <S-NNN-TN> status=<value> [--body=<content>]");
    process.exit(1);
  }

  const { storyId, taskFile } = parseTaskId(taskId);
  const tasksDir = findTasksDir(root, storyId);
  if (!tasksDir) {
    console.error(`No tasks directory found for ${storyId}`);
    process.exit(1);
  }

  const filePath = join(root, tasksDir, taskFile);
  if (!existsSync(filePath)) {
    console.error(`Task file not found: ${tasksDir}/${taskFile}`);
    process.exit(1);
  }

  const body = await readBody(rawArgs);

  let content = readFileSync(filePath, "utf8");
  const updates = {};
  for (const f of fields) {
    const [key, ...rest] = f.split("=");
    updates[key] = rest.join("=");
  }

  if (updates.status) {
    content = content.replace(
      /(\*\*Status:\*\*\s*)\S+/i,
      `$1${updates.status}`,
    );
  }
  if (updates.priority) {
    content = content.replace(
      /(\*\*Priority:\*\*\s*)\S+/i,
      `$1${updates.priority}`,
    );
  }
  if (updates["blocked-by"]) {
    content = content.replace(
      /(\*\*Blocked By:\*\*\s*).+/i,
      `$1${updates["blocked-by"]}`,
    );
  }

  // Replace full body below metadata header if --body or stdin provided
  if (body) {
    const headerEnd = content.search(/\n\n(?![\s]*\*\*)/);
    if (headerEnd !== -1) {
      const header = content.slice(0, headerEnd);
      content = header + "\n\n" + body + "\n";
    } else {
      content += "\n" + body + "\n";
    }
  }

  writeFileSync(filePath, content);

  // Update current_task in tracker when task becomes in_progress
  if (updates.status === "in_progress" || updates.status === "in-progress") {
    withLockIfGit(root, () => {
      const items = readTracker(root);
      const storyIdx = items.findIndex((i) => i.id === storyId);
      if (storyIdx !== -1) {
        items[storyIdx].current_task = taskId;
        writeTracker(root, items);
      }
    });
  }

  // Clear current_task and set last_task on completion
  if (["completed", "done"].includes(updates.status)) {
    withLockIfGit(root, () => {
      const items = readTracker(root);
      const storyIdx = items.findIndex((i) => i.id === storyId);
      if (storyIdx !== -1) {
        items[storyIdx].current_task = null;
        items[storyIdx].last_task = taskId;
        writeTracker(root, items);
      }
    });
  }

  const changed = Object.keys(updates).length > 0 ? JSON.stringify(updates) : "";
  const bodyMsg = body ? " (body updated)" : "";
  console.log(`✓ Updated ${taskId}: ${changed}${bodyMsg}`);
  console.log(`  → ${tasksDir}/${taskFile}`);
}

async function storyCreate(root, args, rawArgs) {
  const titleParts = args.filter((a) => !a.startsWith("--"));
  const title = titleParts.join(" ");
  if (!title) {
    console.error("Usage: brief story create <title> [--branch=<name>] [--description=<text>] [--feature=<folder>] [--body=<content>]");
    process.exit(1);
  }

  const opts = {};
  for (const arg of rawArgs) {
    if (arg.startsWith("--branch=")) opts.branch = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--link=")) opts.link = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--description=")) opts.description = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--feature=")) opts.feature = arg.split("=").slice(1).join("=");
  }

  const body = await readBody(rawArgs);

  const result = withLockIfGit(root, () => {
    const items = readTracker(root);
    const id = nextId(items, "story", root, { _skipLock: true });
    const today = new Date().toISOString().slice(0, 10);
    const slug = opts.feature || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const branch = opts.branch || `feature/${slug}`;

    // Determine feature folder and create story structure
    const storyDir = `documentation/stories/${slug}/${id}`;
    const fullStoryDir = join(root, storyDir);
    mkdirSync(join(fullStoryDir, "tasks"), { recursive: true });

    // Write story.md — body replaces entire content below metadata header
    let storyContent;
    if (body) {
      storyContent = `# ${id}: ${title}

**Status**: planned
**Branch**: ${branch}
**Created**: ${today}

${body}
`;
    } else {
      storyContent = `# ${id}: ${title}

**Status**: planned
**Branch**: ${branch}
**Created**: ${today}

## Context

${opts.description || "<!-- Why this work is needed -->"}

## Goal
<!-- One sentence outcome -->

## Acceptance Criteria
- [ ] ...

## Scope
**In scope:** ...
**Out of scope:** ...
`;
    }
    writeFileSync(join(fullStoryDir, "story.md"), storyContent);

    // Write summary.md
    const summaryContent = `# ${id}: ${title} — Summary

## What Changed
<!-- Updated after each task is completed -->

## Decisions Made
<!-- Non-obvious choices and why -->

## Testing
<TBD at implementation>

## Follow-up
<!-- Deferred items, future improvements -->
`;
    writeFileSync(join(fullStoryDir, "summary.md"), summaryContent);

    // Add to tracker
    const item = {
      id,
      type: "story",
      title,
      status: "planned",
      branch,
      current_task: null,
      story: `${storyDir}/story.md`,
      link: opts.link || null,
      pr: null,
    };
    items.push(item);
    writeTracker(root, items);

    return { id, branch, storyDir };
  });

  console.log(`✓ Created ${result.id}: ${title}`);
  console.log(`  Branch: ${result.branch}`);
  console.log(`  → ${result.storyDir}/story.md`);
  console.log(`  → ${result.storyDir}/summary.md`);
  console.log(`  → ${result.storyDir}/tasks/`);
  console.log(`path: ${result.storyDir}/story.md`);
}

async function storyUpdate(root, args, rawArgs) {
  const id = args[0];
  const fields = args.slice(1).filter((a) => !a.startsWith("--body"));
  if (!id || (fields.length === 0 && !rawArgs.some((a) => a.startsWith("--body")))) {
    console.error("Usage: brief story update <S-NNN> status=<value> [pr=<url>] [--body=<content>]");
    process.exit(1);
  }

  // Async work before lock
  const body = await readBody(rawArgs);

  const updates = {};
  for (const f of fields) {
    const [key, ...rest] = f.split("=");
    updates[key] = rest.join("=") === "null" ? null : rest.join("=");
  }

  // Read-only existence check (outside lock to avoid process.exit inside lock)
  if (!readTracker(root).some((i) => i.id === id)) {
    console.error(`Story not found: ${id}`);
    process.exit(1);
  }

  withLockIfGit(root, () => {
    const items = readTracker(root);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;

    if (Object.keys(updates).length > 0) {
      Object.assign(items[idx], updates);
      writeTracker(root, items);
    }

    // Also update story.md Status field if status changed
    if (updates.status && items[idx].story) {
      const storyPath = join(root, items[idx].story);
      if (existsSync(storyPath)) {
        let content = readFileSync(storyPath, "utf8");
        content = content.replace(/(\*\*Status\*\*:\s*)\w+/i, `$1${updates.status}`);
        writeFileSync(storyPath, content);
      }
    }

    // Replace full body below metadata header if --body or stdin provided
    if (body && items[idx].story) {
      const storyPath = join(root, items[idx].story);
      if (existsSync(storyPath)) {
        let content = readFileSync(storyPath, "utf8");
        const headerEnd = content.search(/\n\n(?![\s]*\*\*)/);
        if (headerEnd !== -1) {
          const header = content.slice(0, headerEnd);
          content = header + "\n\n" + body + "\n";
        } else {
          content += "\n" + body + "\n";
        }
        writeFileSync(storyPath, content);
      }
    }

    // Append note to summary.md if provided
    if (updates.note && items[idx].story) {
      const summaryPath = join(root, items[idx].story.replace("story.md", "summary.md"));
      if (existsSync(summaryPath)) {
        const today = new Date().toISOString().slice(0, 10);
        let content = readFileSync(summaryPath, "utf8");
        content = content.trimEnd() + `\n\n### Note (${today})\n\n${updates.note}\n`;
        writeFileSync(summaryPath, content);
      }
    }
  });

  const changed = Object.keys(updates).length > 0 ? JSON.stringify(updates) : "";
  const bodyMsg = body ? " (body updated)" : "";
  console.log(`✓ Updated ${id}: ${changed}${bodyMsg}`);
}

function storyHelp() {
  console.log(`brief story <action>

Actions:
  list [--all]                          List stories (default: active only)
  show <S-NNN>                          Show story detail (reads story.md)
  tasks <S-NNN>                         List all tasks for a story (table)
  task <S-NNN-TN>                       Show single task content
  task create <S-NNN> <title>           Create task (auto-numbers T-001, T-002...)
    [--priority=P1] [--blocked-by=...]
  task update <S-NNN-TN> <k=v...>       Update task fields (status, priority, blocked-by)
  create <title>                        Create story (tracker + all files)
    [--branch=...] [--description=...]
    [--feature=<folder>]
  update <S-NNN> <k=v...>              Update story in tracker
  help                                  Show this help`);
}

// --- Helpers ---

function findStoryFile(root, storyId) {
  const items = readTracker(root);
  const item = items.find((i) => i.id === storyId);
  if (item?.story && existsSync(join(root, item.story))) return item.story;

  // Scan documentation/stories for the story
  const storiesDir = join(root, "documentation/stories");
  if (!existsSync(storiesDir)) return null;

  for (const feature of readdirSync(storiesDir)) {
    const storyDir = join(storiesDir, feature, storyId);
    const storyFile = join(storyDir, "story.md");
    if (existsSync(storyFile)) {
      return `documentation/stories/${feature}/${storyId}/story.md`;
    }
  }
  return null;
}

function findTasksDir(root, storyId) {
  // Check tracker for story path
  const items = readTracker(root);
  const item = items.find((i) => i.id === storyId);
  if (item?.story) {
    const dir = item.story.replace("/story.md", "/tasks");
    if (existsSync(join(root, dir))) return dir;
  }

  // Scan documentation/stories
  const storiesDir = join(root, "documentation/stories");
  if (!existsSync(storiesDir)) return null;

  for (const feature of readdirSync(storiesDir)) {
    const tasksDir = join(storiesDir, feature, storyId, "tasks");
    if (existsSync(tasksDir)) {
      return `documentation/stories/${feature}/${storyId}/tasks`;
    }
  }
  return null;
}

function parseTaskId(taskId) {
  // S-001-T2 → { storyId: "S-001", taskFile: "T-002.md" }
  const match = taskId.match(/^(S-\d+)-T(\d+)$/i);
  if (!match) {
    console.error(`Invalid task ID format: ${taskId}. Expected: S-NNN-TN`);
    process.exit(1);
  }
  const storyId = match[1].toUpperCase();
  const taskNum = match[2].padStart(3, "0");
  return { storyId, taskFile: `T-${taskNum}.md` };
}
