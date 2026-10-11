// File-based fallback: scans documentation directories when tracker.yaml is missing.
// Returns items in the same shape as readTracker() so commands work seamlessly.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { splitRecord, recordHeaderField } from "./records.mjs";

function metadata(content, file) {
  const parsed = splitRecord(content, file);
  return key => Object.hasOwn(parsed.data, key) ? parsed.data[key] : recordHeaderField(parsed, key)?.[2]?.trim();
}

function sourceFields(item, fields) {
  // Non-enumerable provenance lets regeneration distinguish missing fields from explicit values.
  Object.defineProperty(item, "_sourceFields", { value: new Set(fields) });
  return item;
}

const KNOWN_STATUSES = ["planned", "in_progress", "blocked", "completed", "done", "open", "active", "draft", "deferred", "obsolete", "moot", "superseded"];

function normalizeStatus(raw) {
  if (!raw) return "active";
  const lower = raw.toLowerCase().trim();
  const firstWord = lower.split(/[\s(,·—–-]/)[0];
  if (KNOWN_STATUSES.includes(firstWord)) return firstWord;
  if (firstWord === "accepted") return "active";
  if (firstWord === "decided") return "active";
  if (firstWord === "complete") return "completed";
  if (firstWord === "pending") return "planned";
  if (lower.includes("superseded")) return "superseded";
  if (lower.includes("obsolete")) return "obsolete";
  return "active";
}

export function scanFiles(root) {
  const items = [];
  scanStories(root, items);
  // New canonical locations first, then legacy flat location
  scanTypedFiles(root, "documentation/todo", "todo", /^TODO-\d+/i, items);
  scanTypedFiles(root, "documentation", "todo", /^TODO-\d+/i, items);
  scanTypedFiles(root, "documentation/decisions", "decision", /^DEC-\d+/i, items);
  scanResearch(root, items);
  scanTypedFiles(root, "documentation", "research", /^RES-\d+/i, items);
  scanTypedFiles(root, "documentation/audit", "audit", /^AUD-\d+/i, items);
  scanTypedFiles(root, "documentation", "audit", /^AUD-\d+/i, items);
  scanTypedFiles(root, "documentation/bugs", "bug", /^BUG-\d+/i, items);
  scanMemory(root, items);
  // Deduplicate by ID (first seen wins — canonical dir scanned first)
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function scanStories(root, items) {
  const storiesDir = join(root, "documentation/stories");
  if (!existsSync(storiesDir)) return;

  let features;
  try { features = readdirSync(storiesDir); } catch { return; }

  for (const feature of features) {
    const featureDir = join(storiesDir, feature);
    let entries;
    try { entries = readdirSync(featureDir); } catch { continue; }

    for (const entry of entries) {
      if (!/^S-\d+$/i.test(entry)) continue;
      const storyFile = join(featureDir, entry, "story.md");
      if (!existsSync(storyFile)) continue;

      const content = readFileSync(storyFile, "utf8");
      const titleMatch = content.match(/^#\s+(?:S-\d+:\s*)?(.+)/m);
      const field = metadata(content, storyFile);

      // Count tasks
      let taskCount = 0;
      const tasksDir = join(featureDir, entry, "tasks");
      if (existsSync(tasksDir)) {
        try { taskCount = readdirSync(tasksDir).filter((f) => f.endsWith(".md")).length; } catch {}
      }

      items.push(sourceFields({
        id: entry.toUpperCase(),
        type: "story",
        title: field("title") ?? (titleMatch ? titleMatch[1].trim() : entry),
        status: field("status") != null ? normalizeStatus(String(field("status"))) : "planned",
        feature,
        branch: field("branch") == null ? null : String(field("branch")).replace(/^`(.*)`$/, "$1"),
        category: field("category") == null ? "feat" : String(field("category")).toLowerCase(),
        created: field("created") ?? null,
        tasks: taskCount,
        current_task: null,
        story: `documentation/stories/${feature}/${entry}/story.md`,
        link: null,
        pr: null,
      }, ["status", "branch", "category", "created", "title"].filter(key => field(key) !== undefined || (key === "title" && titleMatch))));
    }
  }
}

function scanTypedFiles(root, dirPath, type, pattern, items) {
  const dir = join(root, dirPath);
  if (!existsSync(dir)) return;

  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith(".md") && pattern.test(f)); } catch { return; }

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    // Extract canonical ID (e.g. DEC-001 from DEC-001-some-slug.md)
    const idParts = file.match(/^([A-Z]+-\d+)/i);
    const id = idParts ? idParts[1].toUpperCase() : file.replace(".md", "");

    const titleMatch = content.match(/^title:\s*(.+)/m) || content.match(/^#\s+(?:\S+-\d+:?\s*)?(.+)/m);
    const field = metadata(content, `${dir}/${file}`);
    const created = field("created") !== undefined ? field("created") : field("date");

    const item = {
      id,
      type,
      title: field("title") !== undefined ? field("title") : (titleMatch ? titleMatch[1].trim() : id),
      status: field("status") != null ? normalizeStatus(String(field("status"))) : "open",
    };

    if (field("priority") !== undefined) {
      item.priority = field("priority") === null ? null : String(field("priority"));
    }
    if (field("story") !== undefined) item.story = field("story");
    if (created !== undefined) item.created = created;
    item.link = null;
    item.pr = null;

    items.push(sourceFields(item, ["status", "priority"].filter(key => field(key) !== undefined).concat(created !== undefined ? ["created"] : [], titleMatch ? ["title"] : [])));
  }
}

function scanResearch(root, items) {
  const dir = join(root, "documentation/research");
  if (!existsSync(dir)) return;

  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith(".md")); } catch { return; }

  let seq = 1;
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    const idParts = file.match(/^(RES-\d+)/i);
    const id = idParts ? idParts[1].toUpperCase() : `RES-${String(seq++).padStart(3, "0")}`;

    const { data } = splitRecord(content, `${dir}/${file}`);
    const titleMatch = content.match(/^#\s+(.+)/m);
    items.push({
      id,
      type: "research",
      title: typeof data.title === "string" ? data.title : (titleMatch ? titleMatch[1].trim() : file.replace(".md", "")),
      status: typeof data.status === "string" ? normalizeStatus(data.status) : "active",
      link: null,
      pr: null,
    });
  }
}

export function scanMemoryFiles(root) {
  const items = [];
  scanMemory(root, items);
  return items;
}

function scanMemory(root, items) {
  const dir = join(root, "documentation/memory");
  if (!existsSync(dir)) return;

  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith(".md")); } catch { return; }

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    const slug = file.replace(/\.md$/, "");

    const descMatch = content.match(/^description:\s*(.+)/m);
    const nameMatch = content.match(/^name:\s*(.+)/m);
    const title = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, "") : (nameMatch ? nameMatch[1].trim() : slug);
    const statusMatch = content.match(/^status:\s*(.+)/m);
    const status = statusMatch ? normalizeStatus(statusMatch[1]) : "active";

    items.push({
      _slug: slug,
      id: slug,
      type: "memory",
      title,
      status,
      link: null,
      pr: null,
    });
  }
}
