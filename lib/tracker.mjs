/**
 * tracker.yaml read/write operations.
 * Source of truth for all project items (stories, TODOs, decisions, research, audits).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, openSync, closeSync, unlinkSync, writeSync, renameSync, constants as fsConstants } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { parseDocument, stringify } from "yaml";
import { recordMode, readRecordItems, persistRecordItems, atomicText, rememberGeneratedView } from "./records.mjs";

const TRACKER_FILE = "documentation/tracker.yaml";

// --- Type config ---

const TYPE_CONFIG = {
  story: { prefix: "S", defaultStatus: "planned", hasPrority: false },
  todo: { prefix: "TODO", defaultStatus: "open", hasPriority: true },
  decision: { prefix: "DEC", defaultStatus: "active", hasPriority: false },
  research: { prefix: "RES", defaultStatus: "open", hasPriority: true },
  audit: { prefix: "AUD", defaultStatus: "open", hasPriority: true },
  bug: { prefix: "BUG", defaultStatus: "open", hasPriority: true },
  memory: { prefix: "MEM", defaultStatus: "active", hasPriority: false },
};

// --- Lock primitives ---

const LOCK_FILE = "brief-id.lock";
const STALE_THRESHOLD_MS = 10_000;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 200;

export function gitCommonDir(projectRoot) {
  try {
    const raw = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: projectRoot,
    }).toString().trim();
    if (!raw) return null;
    return resolve(projectRoot, raw);
  } catch {
    return null;
  }
}

export function acquireLock(gitDir) {
  const lockPath = join(gitDir, LOCK_FILE);
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const fd = openSync(lockPath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL);
      writeSync(fd, String(process.pid));
      closeSync(fd);
      return lockPath;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      const stat = statSync(lockPath, { throwIfNoEntry: false });
      if (stat && Date.now() - stat.mtimeMs > STALE_THRESHOLD_MS) {
        try { unlinkSync(lockPath); } catch {}
        continue;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, RETRY_DELAY_MS);
    }
  }
  throw new Error("brief: could not acquire lock — another brief process may be running");
}

export function releaseLock(lockPath) {
  try { unlinkSync(lockPath); } catch {}
}

export function withLock(gitDir, fn) {
  const lockPath = acquireLock(gitDir);
  try {
    return fn();
  } finally {
    releaseLock(lockPath);
  }
}

// --- Counter file ---

const COUNTER_FILE = "brief-counter";

function readCounter(gitDir) {
  const counterPath = join(gitDir, COUNTER_FILE);
  try {
    return JSON.parse(readFileSync(counterPath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    console.error("Warning: brief counter corrupted, re-seeding from tracker");
    return null;
  }
}

function writeCounter(gitDir, counter) {
  const counterPath = join(gitDir, COUNTER_FILE);
  const tmpPath = counterPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(counter, null, 2) + "\n");
  renameSync(tmpPath, counterPath);
}

export function seedCounter(projectRoot, gitDir) {
  const items = readTracker(projectRoot);
  const counter = {};

  for (const type of Object.keys(TYPE_CONFIG)) {
    const cfg = TYPE_CONFIG[type];
    const re = new RegExp(`^${cfg.prefix}-(\\d+)`, "i");

    const trackerNums = items
      .filter((i) => i.type === type)
      .map((i) => { const m = i.id.match(re); return m ? parseInt(m[1], 10) : 0; });

    const fsNums = [];
    const dirs = {
      story: "documentation/stories",
      todo: "documentation/todo",
      decision: "documentation/decisions",
      research: "documentation/research",
      audit: "documentation/audit",
    };
    const scanDir = dirs[type];
    if (scanDir && projectRoot) {
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

    const allNums = [...trackerNums, ...fsNums];
    counter[type] = allNums.length > 0 ? Math.max(...allNums) : 0;
  }

  writeCounter(gitDir, counter);
  return counter;
}

export function allocateId(projectRoot, gitDir, type) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) throw new Error(`Unknown type: ${type}`);

  let counter = readCounter(gitDir);
  if (!counter) {
    counter = seedCounter(projectRoot, gitDir);
  }

  const re = new RegExp(`^${cfg.prefix}-(\\d+)`, "i");
  const items = readTracker(projectRoot);
  const trackerMax = items
    .filter((i) => i.type === type)
    .map((i) => { const m = i.id.match(re); return m ? parseInt(m[1], 10) : 0; })
    .reduce((a, b) => Math.max(a, b), 0);

  const counterVal = counter[type] || 0;
  const next = Math.max(counterVal, trackerMax) + 1;
  counter[type] = next;
  writeCounter(gitDir, counter);

  return `${cfg.prefix}-${String(next).padStart(3, "0")}`;
}

export function withLockIfGit(projectRoot, fn) {
  const gitDir = gitCommonDir(projectRoot);
  if (gitDir) return withLock(gitDir, fn);
  return fn();
}

export function allocateTaskNum(projectRoot, gitDir, storyId) {
  let counter = readCounter(gitDir);
  if (!counter) counter = seedCounter(projectRoot, gitDir);

  const key = `task:${storyId}`;
  const current = counter[key] || 0;

  let fsMax = 0;
  const storiesDir = join(projectRoot, "documentation/stories");
  if (existsSync(storiesDir)) {
    for (const feature of readdirSync(storiesDir)) {
      const tasksDir = join(storiesDir, feature, storyId, "tasks");
      if (existsSync(tasksDir)) {
        for (const f of readdirSync(tasksDir)) {
          const m = f.match(/^T-(\d+)\.md$/i);
          if (m) fsMax = Math.max(fsMax, parseInt(m[1], 10));
        }
      }
    }
  }

  const next = Math.max(current, fsMax) + 1;
  counter[key] = next;
  writeCounter(gitDir, counter);
  return next;
}

function peekNextId(projectRoot, gitDir, type, items) {
  const cfg = TYPE_CONFIG[type];
  const counter = readCounter(gitDir);

  const re = new RegExp(`^${cfg.prefix}-(\\d+)`, "i");
  const trackerMax = items
    .filter((i) => i.type === type)
    .map((i) => { const m = i.id.match(re); return m ? parseInt(m[1], 10) : 0; })
    .reduce((a, b) => Math.max(a, b), 0);

  const counterVal = counter?.[type] || 0;
  const next = Math.max(counterVal, trackerMax) + 1;
  return `${cfg.prefix}-${String(next).padStart(3, "0")}`;
}

// --- Read/Write ---

export function trackerPath(projectRoot) {
  return join(projectRoot, TRACKER_FILE);
}

export function readTracker(projectRoot) {
  if (recordMode(projectRoot)) return readRecordItems(projectRoot);
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
  if (recordMode(projectRoot)) return persistRecordItems(projectRoot, items);
  return writeTrackerView(projectRoot, items);
}

export function writeTrackerView(projectRoot, items) {
  const path = trackerPath(projectRoot);
  const header = `# Project Tracker — ${recordMode(projectRoot) ? "Generated local view; canonical Markdown is authoritative" : "Source of Truth"}
# CLI: brief create <type> <title>
#      brief update <id> <status>
#      brief generate  (regenerates PROJECT-TRACKER.md)
`;
  const body = stringify({ items }, { lineWidth: 0, nullStr: "null" });
  const tmpPath = path + ".tmp";
  writeFileSync(tmpPath, header + "\n" + body);
  renameSync(tmpPath, path);
  if (recordMode(projectRoot)) rememberGeneratedView(projectRoot, TRACKER_FILE, header + "\n" + body);
}

// --- ID generation ---

export function nextId(items, type, projectRoot, { _skipLock = false, _peek = false } = {}) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) throw new Error(`Unknown type: ${type}`);

  if (projectRoot) {
    const gitDir = gitCommonDir(projectRoot);
    if (gitDir) {
      if (_peek) return peekNextId(projectRoot, gitDir, type, items);
      if (_skipLock) return allocateId(projectRoot, gitDir, type);
      return withLock(gitDir, () => allocateId(projectRoot, gitDir, type));
    }
  }

  // Non-git fallback: existing max+1 logic
  const prefix = cfg.prefix;
  const re = new RegExp(`^${prefix}-(\\d+)`, "i");

  const trackerNums = items
    .filter((i) => i.type === type)
    .map((i) => {
      const match = i.id.match(re);
      return match ? parseInt(match[1], 10) : 0;
    });

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
  return withLockIfGit(projectRoot, () => {
    const items = readTracker(projectRoot);
    const id = nextId(items, type, projectRoot, { _skipLock: true });
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
  });
}

// --- Update item ---

export function updateItem(projectRoot, id, updates) {
  return withLockIfGit(projectRoot, () => {
    const items = readTracker(projectRoot);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Item not found: ${id}`);

    Object.assign(items[idx], updates);
    writeTracker(projectRoot, items);
    return items[idx];
  });
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

  let md = `<!-- GENERATED — do not edit. Source: ${recordMode(projectRoot) ? "canonical Markdown records" : "tracker.yaml"} -->\n`;
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
  atomicText(outPath, md);
  if (recordMode(projectRoot)) rememberGeneratedView(projectRoot, "documentation/PROJECT-TRACKER.md", md);
  return { path: outPath, activeCount: active.length };
}

export { TYPE_CONFIG };
