/**
 * tracker.yaml read/write operations.
 * Source of truth for all project items (stories, TODOs, decisions, research, audits).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseDocument, stringify } from "yaml";

const TRACKER_FILE = "documentation/tracker.yaml";

// --- Type config ---

const TYPE_CONFIG = {
  story: { prefix: "S", defaultStatus: "planned", hasPrority: false },
  todo: { prefix: "TODO", defaultStatus: "open", hasPriority: true },
  decision: { prefix: "DEC", defaultStatus: "active", hasPriority: false },
  research: { prefix: "RES", defaultStatus: "open", hasPriority: true },
  audit: { prefix: "AUD", defaultStatus: "open", hasPriority: true },
};

// --- Read/Write ---

export function trackerPath(projectRoot) {
  return join(projectRoot, TRACKER_FILE);
}

export function readTracker(projectRoot) {
  const path = trackerPath(projectRoot);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf8");
  const doc = parseDocument(content);
  const parsed = doc.toJSON();
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

export function writeTracker(projectRoot, items) {
  const path = trackerPath(projectRoot);
  const header = `# Project Tracker — Source of Truth
# CLI: brief create <type> <title>
#      brief update <id> <status>
#      brief generate  (regenerates PROJECT-TRACKER.md)
`;
  const body = stringify({ items }, { lineWidth: 0, nullStr: "null" });
  writeFileSync(path, header + "\n" + body);
}

// --- ID generation ---

export function nextId(items, type, projectRoot) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) throw new Error(`Unknown type: ${type}`);

  const prefix = cfg.prefix;
  const re = new RegExp(`^${prefix}-(\\d+)`, "i");

  // IDs from tracker
  const trackerNums = items
    .filter((i) => i.type === type)
    .map((i) => {
      const match = i.id.match(re);
      return match ? parseInt(match[1], 10) : 0;
    });

  // IDs from filesystem (safety net if tracker is stale/empty)
  const fsNums = [];
  if (projectRoot) {
    const dirs = {
      story: "documentation/stories",
      todo: "documentation/todo",
      decision: "documentation/decisions",
      research: "documentation/research",
      audit: "documentation/audit",
    };
    const scanDir = dirs[type];
    if (scanDir) {
      const fullDir = join(projectRoot, scanDir);
      if (existsSync(fullDir)) {
        const scan = (dir) => {
          try {
            for (const entry of readdirSync(dir)) {
              const match = entry.match(re);
              if (match) fsNums.push(parseInt(match[1], 10));
            }
          } catch {}
        };
        if (type === "story") {
          // Stories are nested: stories/<feature>/S-NNN/
          for (const feature of readdirSync(fullDir)) {
            const featurePath = join(fullDir, feature);
            try {
              if (statSync(featurePath).isDirectory()) scan(featurePath);
            } catch {}
          }
        } else {
          scan(fullDir);
        }
      }
    }
  }

  const allNums = [...trackerNums, ...fsNums];
  const max = allNums.length > 0 ? Math.max(...allNums) : 0;
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

// --- Create item ---

export function createItem(projectRoot, type, title, opts = {}) {
  const items = readTracker(projectRoot);
  const id = nextId(items, type, projectRoot);
  const cfg = TYPE_CONFIG[type];
  const today = new Date().toISOString().slice(0, 10);

  const item = { id, type, title, status: cfg.defaultStatus };

  if (cfg.hasPriority) {
    item.priority = opts.priority || "P1";
  }

  if (type === "story") {
    item.branch = opts.branch || null;
    item.current_task = null;
    item.story = opts.story || null;
  }

  if (type === "decision") {
    item.created = today;
    item.superseded_by = null;
    item.story = opts.story || null;
  }

  if (type === "research") {
    item.story = null;
  }

  if (type === "audit") {
    item.findings = null;
  }

  item.link = opts.link || null;
  item.pr = null;

  items.push(item);
  writeTracker(projectRoot, items);
  return item;
}

// --- Update item ---

export function updateItem(projectRoot, id, updates) {
  const items = readTracker(projectRoot);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`Item not found: ${id}`);

  Object.assign(items[idx], updates);
  writeTracker(projectRoot, items);
  return items[idx];
}

// --- Find item ---

export function findItem(projectRoot, id) {
  const items = readTracker(projectRoot);
  return items.find((i) => i.id === id) || null;
}

// --- Generate PROJECT-TRACKER.md ---

export function generateMarkdown(projectRoot) {
  const items = readTracker(projectRoot);
  const active = items.filter(
    (i) => !["done", "dropped", "completed", "clean", "rejected"].includes(i.status),
  );

  const stories = active.filter((i) => i.type === "story");
  const todos = active.filter((i) => i.type === "todo");
  const decisions = active.filter((i) => i.type === "decision");
  const research = active.filter((i) => i.type === "research");
  const audits = active.filter((i) => i.type === "audit");

  let md = `<!-- GENERATED — do not edit. Source: tracker.yaml -->\n`;
  md += `<!-- Regenerate: brief generate -->\n\n`;
  md += `# Project Tracker\n`;

  if (stories.length) {
    md += `\n## Stories\n\n`;
    md += `| ID | Title | Status | Branch | Current Task |\n`;
    md += `|----|-------|--------|--------|---------------|\n`;
    for (const s of stories) {
      md += `| ${s.id} | ${s.title} | ${s.status} | ${s.branch || "—"} | ${s.current_task || "—"} |\n`;
    }
  }

  if (todos.length) {
    md += `\n## TODOs\n\n`;
    md += `| ID | Title | Priority | Status | Story |\n`;
    md += `|----|-------|----------|--------|-------|\n`;
    for (const t of todos) {
      md += `| ${t.id} | ${t.title} | ${t.priority} | ${t.status} | ${t.story || "—"} |\n`;
    }
  }

  if (decisions.length) {
    md += `\n## Decisions\n\n`;
    md += `| ID | Title | Status | Created |\n`;
    md += `|----|-------|--------|----------|\n`;
    for (const d of decisions) {
      md += `| ${d.id} | ${d.title} | ${d.status} | ${d.created || "—"} |\n`;
    }
  }

  if (research.length) {
    md += `\n## Research\n\n`;
    md += `| ID | Title | Priority | Status |\n`;
    md += `|----|-------|----------|--------|\n`;
    for (const r of research) {
      md += `| ${r.id} | ${r.title} | ${r.priority} | ${r.status} |\n`;
    }
  }

  if (audits.length) {
    md += `\n## Audits\n\n`;
    md += `| ID | Title | Priority | Status | Findings |\n`;
    md += `|----|-------|----------|--------|----------|\n`;
    for (const a of audits) {
      md += `| ${a.id} | ${a.title} | ${a.priority} | ${a.status} | ${a.findings || "—"} |\n`;
    }
  }

  if (!active.length) {
    md += `\n_No active items._\n`;
  }

  const outPath = join(projectRoot, "documentation/PROJECT-TRACKER.md");
  writeFileSync(outPath, md);
  return { path: outPath, activeCount: active.length };
}

export { TYPE_CONFIG };
