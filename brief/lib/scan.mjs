// File-based fallback: scans documentation directories when tracker.yaml is missing.
// Returns items in the same shape as readTracker() so commands work seamlessly.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KNOWN_STATUSES = ["planned", "in_progress", "blocked", "completed", "done", "open", "active", "draft", "obsolete", "moot", "superseded"];

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
      const statusMatch = content.match(/\*\*Status\*\*:?\s*(\w+)/i);
      const branchMatch = content.match(/\*\*Branch\*\*:?\s*(\S+)/i);
      const createdMatch = content.match(/\*\*Created\*\*:?\s*(\d{4}-\d{2}-\d{2})/i);
      const categoryMatch = content.match(/\*\*Category\*\*:?\s*(\w+)/i);

      // Count tasks
      let taskCount = 0;
      const tasksDir = join(featureDir, entry, "tasks");
      if (existsSync(tasksDir)) {
        try { taskCount = readdirSync(tasksDir).filter((f) => f.endsWith(".md")).length; } catch {}
      }

      items.push({
        id: entry.toUpperCase(),
        type: "story",
        title: titleMatch ? titleMatch[1].trim() : entry,
        status: statusMatch ? normalizeStatus(statusMatch[1]) : "planned",
        feature,
        branch: branchMatch ? branchMatch[1].trim() : null,
        category: categoryMatch ? categoryMatch[1].toLowerCase() : "feat",
        created: createdMatch ? createdMatch[1] : null,
        tasks: taskCount,
        current_task: null,
        story: `documentation/stories/${feature}/${entry}/story.md`,
        link: null,
        pr: null,
      });
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
    const statusMatch = content.match(/^status:\s*(.+)/m) || content.match(/\*\*Status\*\*:?\s*(.+)/m);
    const priorityMatch = content.match(/^priority:\s*(.+)/m) || content.match(/\*\*Priority\*\*:?\s*(.+)/m);
    const storyMatch = content.match(/^story:\s*(.+)/m);
    const createdMatch = content.match(/^created:\s*(.+)/m) || content.match(/\*\*Date\*\*:?\s*(.+)/m);

    const item = {
      id,
      type,
      title: titleMatch ? titleMatch[1].trim() : id,
      status: statusMatch ? normalizeStatus(statusMatch[1]) : "open",
    };

    if (priorityMatch && priorityMatch[1].trim() !== "null") {
      item.priority = priorityMatch[1].trim();
    }
    if (storyMatch && storyMatch[1].trim() !== "null") {
      item.story = storyMatch[1].trim();
    }
    if (createdMatch) item.created = createdMatch[1].trim();
    item.link = null;
    item.pr = null;

    items.push(item);
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

    const titleMatch = content.match(/^#\s+(.+)/m);
    items.push({
      id,
      type: "research",
      title: titleMatch ? titleMatch[1].trim() : file.replace(".md", ""),
      status: "active",
      link: null,
      pr: null,
    });
  }
}
