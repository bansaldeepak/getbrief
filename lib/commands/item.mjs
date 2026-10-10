// brief todo|decision|research|audit <action>
// Generic item commands for non-story types

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";

function yamlValue(value) { return stringify(value).trimEnd(); }
import { readTracker, writeTracker, nextId, withLockIfGit, TYPE_CONFIG } from "../tracker.mjs";
import { scanFiles, scanMemoryFiles } from "../scan.mjs";
import { table, statusOrder } from "../format.mjs";
import { readBody } from "../body.mjs";
import { recordMode, updateRecord, safeProjectPath } from "../records.mjs";

const DONE_STATUSES = ["done", "completed", "dropped", "superseded", "rejected", "clean", "retired"];

function slugFromTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function resolveMemoryItem(items, identifier) {
  return items.find((i) => i.id === identifier)
    || items.find((i) => i.type === "memory" && slugFromTitle(i.title) === identifier)
    || items.find((i) => i.type === "memory" && i.title === identifier);
}

function resolveMemoryFile(root, resolvedId) {
  const dir = join(root, FILE_DIRS.memory);
  const direct = join(dir, `${resolvedId}.md`);
  if (existsSync(direct)) return direct;
  if (!existsSync(dir)) return null;
  try {
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const content = readFileSync(join(dir, f), "utf8");
      const nameMatch = content.match(/^name:\s*(.+)/m);
      if (nameMatch && nameMatch[1].trim() === resolvedId) return join(dir, f);
    }
  } catch { /* empty */ }
  return null;
}

const TEMPLATES = {
  todo: (id, title, opts, today) => `---
id: ${id}
title: ${yamlValue(title)}
priority: ${yamlValue(opts.priority || "P1")}
status: open
created: ${today}
story: null
link: ${yamlValue(opts.link || null)}
---

## What

${title}

## Why

<!-- Why this matters. What breaks or degrades without it. -->

## Context

<!-- Where in the code this lives. Relevant files, functions, constraints. -->

## Resolution

_Filled when done:_
- Resolved by: <!-- S-NNN / inline fix -->
- PR: <!-- #NNN -->
- Date: <!-- YYYY-MM-DD -->
`,
  decision: (id, title, opts, today) => `---
id: ${id}
title: ${yamlValue(title)}
status: active
created: ${today}
story: ${yamlValue(opts.story || null)}
superseded_by: null
---

## Decision

${title}

## Context

<!-- What prompted this decision. The problem or fork in the road. -->

## Alternatives Considered

- **Option A**: <!-- description — why rejected -->
- **Option B**: <!-- description — why rejected -->

## Consequences

<!-- What this decision means for future work. Constraints it introduces. -->

## Implementation

- PR: <!-- #NNN -->
- Files affected: <!-- list key files -->
`,
  research: (id, title, opts, today) => `---
id: ${id}
title: ${yamlValue(title)}
status: open
priority: ${yamlValue(opts.priority || "P1")}
created: ${today}
story: null
link: ${yamlValue(opts.link || null)}
---

## Question

${title}

## Motivation

<!-- Why this matters now. What decision or work is blocked without the answer. -->

## Approach

<!-- How to investigate: POC, benchmark, read docs, prototype, etc. -->

## Findings

_Filled during research._

## Outcome

_Filled when resolved:_
- Status: <!-- accepted | rejected | deferred -->
- Spawned: <!-- S-NNN (if accepted) -->
- PR: <!-- #NNN -->
`,
  audit: (id, title, opts, today) => `---
id: ${id}
title: ${yamlValue(title)}
status: open
priority: ${yamlValue(opts.priority || "P1")}
created: ${today}
findings: null
link: ${yamlValue(opts.link || null)}
---

## Scope

${title}

## Criteria

<!-- What "good" looks like. Standards, benchmarks, or rules being measured against. -->

## Method

<!-- How the audit will be conducted. -->

## Findings

_Filled during audit._

## Summary

_Filled when complete:_
- Status: <!-- done | clean -->
- Items spawned: <!-- TODO-NNN, TODO-NNN -->
- PR: <!-- #NNN -->
`,
  bug: (id, title, opts, today) => `---
id: ${id}
title: ${yamlValue(title)}
priority: ${yamlValue(opts.priority || "P1")}
severity: ${yamlValue(opts.severity || "major")}
status: open
created: ${today}
story: null
escalated_to: null
---

## What's Broken

${title}

## Steps to Reproduce

<!-- 1. Do X  2. Observe Y  3. Expected Z -->

## Root Cause

<!-- Filled during investigation -->

## Fix

_Filled when done:_
- Fixed by: <!-- commit SHA or S-NNN -->
- PR: <!-- #NNN -->
`,
  memory: (id, title, opts, today) => `---
name: ${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}
description: ${yamlValue(title)}
metadata:
  type: ${yamlValue(opts.memtype || "project")}
created: ${today}
updated: ${today}
valid_until: ${yamlValue(opts.valid_until || "permanent")}
importance: ${opts.importance || "3"}
---

${title}
`,
};

const FILE_DIRS = {
  todo: "documentation/todo",
  decision: "documentation/decisions",
  research: "documentation/research",
  audit: "documentation/audit",
  bug: "documentation/bugs",
  memory: "documentation/memory",
};

export async function itemCommand(root, type, action, args, rawArgs) {
  if (action === "--help" || action === "-h" || args.includes("--help") || args.includes("-h")) {
    return itemHelp(type);
  }
  switch (action) {
    case "list": return itemList(root, type, args);
    case "create": return itemCreate(root, type, args, rawArgs);
    case "update": return itemUpdate(root, type, args, rawArgs);
    case "retire": return type === "memory" ? itemRetire(root, args[0]) : (console.error(`retire is only available for memory. Use: brief ${type} update <ID> status=done`), process.exit(1));
    case "show": return itemShow(root, type, args[0]);
    case "help": return itemHelp(type);
    default:
      console.error(`Unknown ${type} action: ${action}. Run: brief ${type} help`);
      process.exit(1);
  }
}

function getItems(root) {
  const items = readTracker(root);
  return items.length > 0 ? items : scanFiles(root);
}

function itemList(root, type, args) {
  let items;
  if (type === "memory") {
    const trackerItems = getItems(root).filter((i) => i.type === "memory");
    const trackerTitles = new Set(trackerItems.map((i) => i.title));
    const trackerIds = new Set(trackerItems.map((i) => i.id));
    const claimedSlugs = new Set();
    for (const ti of trackerItems) {
      const resolved = resolveMemoryFile(root, ti.id);
      if (resolved) {
        const fname = resolved.split("/").pop().replace(/\.md$/, "");
        claimedSlugs.add(fname);
      }
    }
    const diskItems = scanMemoryFiles(root);
    const unregistered = diskItems.filter((d) =>
      !trackerTitles.has(d.title) && !trackerIds.has(d.id) && !claimedSlugs.has(d._slug)
    );
    items = [...trackerItems, ...unregistered];
  } else {
    items = getItems(root).filter((i) => i.type === type);
  }
  const showAll = args.includes("--all");
  const filtered = showAll ? items : items.filter((i) => !DONE_STATUSES.includes(i.status));

  filtered.sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  let headers, rows;
  switch (type) {
    case "todo":
      headers = ["ID", "Title", "Priority", "Status", "Story"];
      rows = filtered.map((i) => [i.id, i.title, i.priority, i.status, i.story || ""]);
      break;
    case "decision":
      headers = ["ID", "Title", "Status", "Created", "Superseded By"];
      rows = filtered.map((i) => [i.id, i.title, i.status, i.created || "", i.superseded_by || ""]);
      break;
    case "research":
      headers = ["ID", "Title", "Priority", "Status", "Story"];
      rows = filtered.map((i) => [i.id, i.title, i.priority, i.status, i.story || ""]);
      break;
    case "audit":
      headers = ["ID", "Title", "Priority", "Status", "Findings"];
      rows = filtered.map((i) => [i.id, i.title, i.priority, i.status, i.findings || ""]);
      break;
    case "bug":
      headers = ["ID", "Title", "Priority", "Severity", "Status"];
      rows = filtered.map((i) => [i.id, i.title, i.priority, i.severity || "", i.status]);
      break;
    case "memory":
      headers = ["ID", "Title", "Status"];
      rows = filtered.map((i) => [i.id, i.title, i.status]);
      break;
    default:
      headers = ["ID", "Title", "Status"];
      rows = filtered.map((i) => [i.id, i.title, i.status]);
  }

  console.log(table(headers, rows));
  console.log(`\n${filtered.length} ${type}(s)${showAll ? "" : " (active only, use --all for full history)"}`);
}

async function itemCreate(root, type, args, rawArgs) {
  const titleParts = args.filter((a) => !a.startsWith("--"));
  const title = titleParts.join(" ");
  if (!title) {
    console.error(`Usage: brief ${type} create <title> [--priority=P1] [--link=<url>] [--body=<content>]`);
    process.exit(1);
  }

  const opts = {};
  for (const arg of rawArgs) {
    if (arg.startsWith("--priority=")) opts.priority = arg.split("=")[1];
    if (arg.startsWith("--severity=")) opts.severity = arg.split("=")[1];
    if (arg.startsWith("--memtype=")) opts.memtype = arg.split("=")[1];
    if (arg.startsWith("--valid-until=")) opts.valid_until = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--importance=")) opts.importance = arg.split("=")[1];
    if (arg.startsWith("--link=")) opts.link = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--story=")) opts.story = arg.split("=").slice(1).join("=");
  }

  const body = await readBody(rawArgs);

  const result = withLockIfGit(root, () => {
    const items = readTracker(root);
    const id = type === "memory" ? slugFromTitle(title) : nextId(items, type, root, { _skipLock: true });
    const today = new Date().toISOString().slice(0, 10);
    const cfg = TYPE_CONFIG[type];

    // Create tracker entry
    const item = { id, type, title, status: cfg.defaultStatus };
    if (cfg.hasPriority) item.priority = opts.priority || "P1";
    if (type === "decision") {
      item.created = today;
      item.superseded_by = null;
      item.story = opts.story || null;
    }
    if (type === "research") item.story = null;
    if (type === "audit") item.findings = null;
    item.link = opts.link || null;
    item.pr = null;

    if (recordMode(root) && items.some(i => i.id === id)) throw new Error(`Record already exists: ${id}`);

    // Create .md file
    const dir = FILE_DIRS[type];
    const fullDir = safeProjectPath(root, dir);
    if (!existsSync(fullDir)) mkdirSync(fullDir, { recursive: true });

    const fileName = type === "memory" ? `${slugFromTitle(title)}.md` : `${id}.md`;
    const filePath = join(fullDir, fileName);
    const template = TEMPLATES[type];
    if (template) {
      let content = template(id, title, opts, today);
      if (body) {
        if (type === "memory") {
          const fmEnd = content.indexOf("---", content.indexOf("---") + 3);
          if (fmEnd !== -1) {
            content = content.slice(0, fmEnd + 3) + "\n\n" + body + "\n";
          }
        } else {
          content = content.replace(/<!--[^>]*-->/, body);
        }
      }
      writeFileSync(filePath, content, recordMode(root) ? { flag: "wx" } : undefined);
    }

    items.push(item);
    writeTracker(root, items);

    return { id, item, dir, fileName };
  });

  const relPath = `${result.dir}/${result.fileName}`;
  console.log(`✓ Created ${result.id}: ${title}`);
  console.log(`  type: ${type}, status: ${result.item.status}${result.item.priority ? `, priority: ${result.item.priority}` : ""}`);
  console.log(`  → tracker.yaml`);
  console.log(`  → ${relPath}`);
  console.log(`path: ${relPath}`);
}

async function itemUpdate(root, type, args, rawArgs) {
  const id = args[0];
  const fields = args.slice(1).filter((a) => !a.startsWith("--body"));
  if (!id || (fields.length === 0 && !rawArgs.some((a) => a.startsWith("--body")))) {
    console.error(`Usage: brief ${type} update <${id || "ID"}> <field=value...> [--body=<content>]`);
    console.error(`Example: brief ${type} update ${id || "TODO-001"} status=done pr=#42`);
    process.exit(1);
  }

  const body = await readBody(rawArgs);

  const updates = {};
  for (const f of fields) {
    const [key, ...rest] = f.split("=");
    if (key.startsWith("-")) {
      console.error(`Unknown flag: ${key}. Run: brief ${type} help`);
      process.exit(1);
    }
    updates[key] = rest.join("=") === "null" ? null : rest.join("=");
  }

  // Resolve by ID, slug, or title for memory; by ID for everything else
  const allItems = readTracker(root);
  const preItem = type === "memory" ? resolveMemoryItem(allItems, id) : allItems.find((i) => i.id === id);
  if (!preItem) {
    console.error(`${type} not found: ${id}`);
    process.exit(1);
  }
  const resolvedId = preItem.id;

  const dir = FILE_DIRS[type];

  if (recordMode(root)) {
    const file = withLockIfGit(root, () => {
      const item = readTracker(root).find(i => i.id === resolvedId && i.type === type);
      if (!item) throw new Error(`${type} not found: ${id}`);
      return updateRecord(root, item, updates, { body, note: updates.note });
    });
    console.log(`✓ Updated ${resolvedId}\npath: ${file}`);
    return;
  }

  withLockIfGit(root, () => {
    const items = readTracker(root);
    const idx = items.findIndex((i) => i.id === resolvedId);
    if (idx === -1) return;

    if (Object.keys(updates).length > 0) {
      Object.assign(items[idx], updates);
      writeTracker(root, items);
    }
  });

  const mdPath = type === "memory"
    ? resolveMemoryFile(root, resolvedId)
    : join(root, dir, `${resolvedId}.md`);
  if (mdPath && existsSync(mdPath)) {
    let content = readFileSync(mdPath, "utf8");
    for (const [key, value] of Object.entries(updates)) {
      if (key === "note") continue;
      const re = new RegExp(`^(${key}:)\\s*.+$`, "m");
      if (re.test(content)) {
        content = content.replace(re, `$1 ${value || "null"}`);
      }
    }
    if (updates.note) {
      const today = new Date().toISOString().slice(0, 10);
      content = content.trimEnd() + `\n\n### Note (${today})\n\n${updates.note}\n`;
    }
    if (body) {
      const fmEnd = content.indexOf("---", content.indexOf("---") + 3);
      if (fmEnd !== -1) {
        const header = content.slice(0, fmEnd + 3);
        content = header + "\n\n" + body + "\n";
      }
    }
    writeFileSync(mdPath, content);
  }

  const changed = Object.keys(updates).length > 0 ? JSON.stringify(updates) : "";
  const bodyMsg = body ? " (body updated)" : "";
  console.log(`✓ Updated ${resolvedId}: ${changed}${bodyMsg}`);
  console.log(`  → tracker.yaml`);
  if (mdPath && existsSync(mdPath)) {
    const relPath = mdPath.startsWith(root) ? mdPath.slice(root.length + 1) : mdPath;
    console.log(`  → ${relPath}`);
  }
}

function itemRetire(root, id) {
  if (!id) {
    console.error("Usage: brief memory retire <ID|slug|title>");
    process.exit(1);
  }

  const allItems = readTracker(root);
  const item = resolveMemoryItem(allItems, id);
  if (!item) {
    console.error(`memory not found: ${id}`);
    process.exit(1);
  }
  const resolvedId = item.id;

  const today = new Date().toISOString().slice(0, 10);
  if (recordMode(root)) {
    withLockIfGit(root, () => updateRecord(root, readTracker(root).find(i => i.id === resolvedId), { status: "retired" }, { frontmatter: { updated: today, valid_until: today } }));
    console.log(`✓ Retired ${resolvedId}`);
    return;
  }

  withLockIfGit(root, () => {
    const items = readTracker(root);
    const idx = items.findIndex((i) => i.id === resolvedId);
    if (idx === -1) return;
    items[idx].status = "retired";
    writeTracker(root, items);
  });

  const mdPath = resolveMemoryFile(root, resolvedId);
  if (mdPath && existsSync(mdPath)) {
    let content = readFileSync(mdPath, "utf8");
    content = content.replace(/^(updated:)\s*.+$/m, `$1 ${today}`);
    const validRe = /^(valid_until:)\s*.+$/m;
    if (validRe.test(content)) {
      content = content.replace(validRe, `$1 ${today}`);
    }
    writeFileSync(mdPath, content);
  }

  console.log(`✓ Retired ${resolvedId}: ${item.title}`);
  console.log(`  status: retired, valid_until: ${today}`);
  console.log(`  → tracker.yaml`);
  if (mdPath && existsSync(mdPath)) {
    const relPath = mdPath.startsWith(root) ? mdPath.slice(root.length + 1) : mdPath;
    console.log(`  → ${relPath}`);
  }
}

function itemShow(root, type, id) {
  if (!id) {
    console.error(`Usage: brief ${type} show <ID>`);
    process.exit(1);
  }

  const dir = FILE_DIRS[type];

  // Resolve memory by ID, slug, or title
  const items = readTracker(root);
  const item = type === "memory" ? resolveMemoryItem(items, id) : items.find((i) => i.id === id);
  const mdPath = (type === "memory" && item)
    ? resolveMemoryFile(root, item.id)
    : join(root, dir, `${id}.md`);

  if (mdPath && existsSync(mdPath)) {
    const relPath = mdPath.startsWith(root) ? mdPath.slice(root.length + 1) : mdPath;
    console.log(`→ ${relPath}`);
    console.log(readFileSync(mdPath, "utf8"));
  } else if (item) {
    console.log(`${item.id}: ${item.title}`);
    for (const [k, v] of Object.entries(item)) {
      if (k !== "id" && k !== "title" && k !== "type") {
        console.log(`  ${k}: ${v || "—"}`);
      }
    }
  } else {
    console.error(`Not found: ${id}`);
    process.exit(1);
  }
}

function itemHelp(type) {
  const prefix = TYPE_CONFIG[type]?.prefix || type.toUpperCase();
  const actions = [
    `  list [--all]                    List ${type === "memory" ? "memories" : type + "s"} (default: active only)`,
    `  show <${prefix}-NNN>                   Show full detail (.md file)`,
    `  create <title> [--priority=P1]  Create ${type} (tracker + .md file)`,
    `  update <${prefix}-NNN> <k=v...>        Update fields (syncs tracker + file)`,
  ];
  if (type === "memory") {
    actions.push(`  retire <ID|slug|title>          Retire memory (keeps file, sets status=retired)`);
  }
  actions.push(`  help                            Show this help`);
  console.log(`brief ${type} <action>\n\nActions:\n${actions.join("\n")}`);
  if (type === "memory") {
    console.log(`\nMemory commands accept ID (MEM-NNN), slug, or title.`);
  }
}
