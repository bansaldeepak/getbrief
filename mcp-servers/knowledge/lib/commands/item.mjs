// knowledge-graph todo|decision|research|audit <action>
// Generic item commands for non-story types

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readTracker, writeTracker, nextId, TYPE_CONFIG } from "../tracker.mjs";
import { scanFiles } from "../scan.mjs";
import { table, statusOrder } from "../format.mjs";

const DONE_STATUSES = ["done", "completed", "dropped", "superseded", "rejected", "clean"];

const TEMPLATES = {
  todo: (id, title, opts, today) => `---
id: ${id}
title: ${title}
priority: ${opts.priority || "P1"}
status: open
created: ${today}
story: null
link: ${opts.link || "null"}
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
title: ${title}
status: active
created: ${today}
story: ${opts.story || "null"}
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
title: ${title}
status: open
priority: ${opts.priority || "P2"}
created: ${today}
story: null
link: ${opts.link || "null"}
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
title: ${title}
status: open
priority: ${opts.priority || "P1"}
created: ${today}
findings: null
link: ${opts.link || "null"}
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
};

const FILE_DIRS = {
  todo: "documentation/todo",
  decision: "documentation/decisions",
  research: "documentation/research",
  audit: "documentation/audit",
};

export function itemCommand(root, type, action, args, rawArgs) {
  switch (action) {
    case "list": return itemList(root, type, args);
    case "create": return itemCreate(root, type, args, rawArgs);
    case "update": return itemUpdate(root, type, args);
    case "show": return itemShow(root, type, args[0]);
    case "help": return itemHelp(type);
    default:
      console.error(`Unknown ${type} action: ${action}. Run: knowledge-graph ${type} help`);
      process.exit(1);
  }
}

function getItems(root) {
  const items = readTracker(root);
  return items.length > 0 ? items : scanFiles(root);
}

function itemList(root, type, args) {
  const items = getItems(root).filter((i) => i.type === type);
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
  }

  console.log(table(headers, rows));
  console.log(`\n${filtered.length} ${type}(s)${showAll ? "" : " (active only, use --all for full history)"}`);
}

function itemCreate(root, type, args, rawArgs) {
  const titleParts = args.filter((a) => !a.startsWith("--"));
  const title = titleParts.join(" ");
  if (!title) {
    console.error(`Usage: knowledge-graph ${type} create <title> [--priority=P1] [--link=<url>]`);
    process.exit(1);
  }

  const opts = {};
  for (const arg of rawArgs) {
    if (arg.startsWith("--priority=")) opts.priority = arg.split("=")[1];
    if (arg.startsWith("--link=")) opts.link = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--story=")) opts.story = arg.split("=").slice(1).join("=");
  }

  const items = readTracker(root);
  const id = nextId(items, type);
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

  items.push(item);
  writeTracker(root, items);

  // Create .md file
  const dir = FILE_DIRS[type];
  const fullDir = join(root, dir);
  if (!existsSync(fullDir)) mkdirSync(fullDir, { recursive: true });

  const fileName = `${id}.md`;
  const filePath = join(fullDir, fileName);
  const template = TEMPLATES[type];
  if (template) {
    writeFileSync(filePath, template(id, title, opts, today));
  }

  const relPath = `${dir}/${fileName}`;
  console.log(`✓ Created ${id}: ${title}`);
  console.log(`  type: ${type}, status: ${item.status}${item.priority ? `, priority: ${item.priority}` : ""}`);
  console.log(`  → tracker.yaml`);
  console.log(`  → ${relPath}`);
}

function itemUpdate(root, type, args) {
  const id = args[0];
  const fields = args.slice(1);
  if (!id || fields.length === 0) {
    console.error(`Usage: knowledge-graph ${type} update <${id || "ID"}> <field=value...>`);
    console.error(`Example: knowledge-graph ${type} update ${id || "TODO-001"} status=done pr=#42`);
    process.exit(1);
  }

  const items = readTracker(root);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) {
    console.error(`${type} not found: ${id}`);
    process.exit(1);
  }

  const updates = {};
  for (const f of fields) {
    const [key, ...rest] = f.split("=");
    updates[key] = rest.join("=") === "null" ? null : rest.join("=");
  }

  Object.assign(items[idx], updates);
  writeTracker(root, items);

  // Also update .md file frontmatter if it exists
  const dir = FILE_DIRS[type];
  const mdPath = join(root, dir, `${id}.md`);
  if (existsSync(mdPath)) {
    let content = readFileSync(mdPath, "utf8");
    for (const [key, value] of Object.entries(updates)) {
      const re = new RegExp(`^(${key}:)\\s*.+$`, "m");
      if (re.test(content)) {
        content = content.replace(re, `$1 ${value || "null"}`);
      }
    }
    writeFileSync(mdPath, content);
  }

  console.log(`✓ Updated ${id}: ${JSON.stringify(updates)}`);
  console.log(`  → tracker.yaml`);
  if (existsSync(join(root, dir, `${id}.md`))) {
    console.log(`  → ${dir}/${id}.md`);
  }
}

function itemShow(root, type, id) {
  if (!id) {
    console.error(`Usage: knowledge-graph ${type} show <ID>`);
    process.exit(1);
  }

  const dir = FILE_DIRS[type];
  const mdPath = join(root, dir, `${id}.md`);

  if (existsSync(mdPath)) {
    console.log(`→ ${dir}/${id}.md`);
    console.log(readFileSync(mdPath, "utf8"));
  } else {
    // Fallback to tracker entry
    const items = readTracker(root);
    const item = items.find((i) => i.id === id);
    if (item) {
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
}

function itemHelp(type) {
  const prefix = TYPE_CONFIG[type]?.prefix || type.toUpperCase();
  console.log(`knowledge-graph ${type} <action>

Actions:
  list [--all]                    List ${type}s (default: active only)
  show <${prefix}-NNN>                   Show full detail (.md file)
  create <title> [--priority=P1]  Create ${type} (tracker + .md file)
  update <${prefix}-NNN> <k=v...>        Update fields (syncs tracker + file)
  help                            Show this help`);
}
