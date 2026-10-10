// File-based search — greps source files directly.
// No database dependency. Works reliably with just committed files.
// Searches: tracker.yaml, memory/, decisions/, logs/, stories/, todo/, research/, audit/, retros

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readRecordItems, recordMode } from "./records.mjs";

export function searchFiles(projectRoot, query) {
  const results = [];
  // Support OR with pipe: "signin|auth" matches either term
  // Support AND with space: "signin auth" requires both
  const hasOr = query.includes("|");
  const terms = hasOr
    ? query.toLowerCase().split(/\|/).map((t) => t.trim()).filter(Boolean)
    : query.toLowerCase().split(/\s+/);

  const matchMode = hasOr ? "or" : "and";
  const managed = recordMode(projectRoot) ? readRecordItems(projectRoot) : [];
  for (const item of managed) {
    const content = readFileSync(join(projectRoot, item._file), "utf8");
    if (matchesTerms(content, terms, matchMode)) results.push({ type: item.type, file: item._file, id: item.id, brief: item.title, status: item.status });
  }
  if (!recordMode(projectRoot)) searchTracker(projectRoot, terms, matchMode, results);
  searchDir(projectRoot, "documentation/memory", "memory", terms, matchMode, results);
  searchDir(projectRoot, "memory", "memory", terms, matchMode, results);
  searchDir(projectRoot, "documentation/decisions", "decision", terms, matchMode, results);
  searchDir(projectRoot, "documentation/todo", "todo", terms, matchMode, results, /^TODO-\d+/i);
  searchDir(projectRoot, "documentation", "todo", terms, matchMode, results, /^TODO-\d+/i);
  searchDir(projectRoot, "documentation/logs", "log", terms, matchMode, results);
  searchDir(projectRoot, "documentation/research", "research", terms, matchMode, results, /^RES-\d+/i);
  searchDir(projectRoot, "documentation", "research", terms, matchMode, results, /^RES-\d+/i);
  searchDir(projectRoot, "documentation/audit", "audit", terms, matchMode, results, /^AUD-\d+/i);
  searchDir(projectRoot, "documentation", "audit", terms, matchMode, results, /^AUD-\d+/i);
  searchLegacyLog(projectRoot, terms, matchMode, results);
  searchStories(projectRoot, terms, matchMode, results);
  searchRetros(projectRoot, terms, matchMode, results);
  searchLegacyTodos(projectRoot, terms, matchMode, results);

  // Deduplicate: if same ID appears from tracker AND file, keep the file version (has more context)
  const seen = new Map();
  for (const r of results) {
    const item = managed.find(i => r.file === i._file || (i.type === "story" && r.file.startsWith(i.story.replace("story.md", ""))));
    if (item) {
      const task = r.file.match(/\/tasks\/T-(\d+)\.md$/);
      r.id = task ? `${item.id}-T${Number(task[1])}` : item.id;
    }
    const key = r.id || `${r.type}:${r.file}`;
    const existing = seen.get(key);
    if (!existing || (r.file !== "tracker.yaml" && existing.file === "tracker.yaml")) {
      seen.set(key, r);
    }
  }
  return [...seen.values()];
}

function matchesTerms(text, terms, mode = "and") {
  const lower = text.toLowerCase();
  return mode === "or"
    ? terms.some((t) => lower.includes(t))
    : terms.every((t) => lower.includes(t));
}

function extractBrief(content) {
  const lines = content.split("\n");
  let pastFrontmatter = !content.startsWith("---");
  let frontmatterCount = 0;

  for (const line of lines) {
    if (line.trim() === "---") {
      frontmatterCount++;
      if (frontmatterCount >= 2) pastFrontmatter = true;
      continue;
    }
    if (!pastFrontmatter) continue;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    return trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed;
  }
  return null;
}

function searchTracker(root, terms, mode, results) {
  const path = join(root, "tracker.yaml");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");

  let currentItem = null;
  for (const line of lines) {
    if (line.startsWith("- id:")) {
      if (currentItem && matchesTerms(currentItem.text, terms, mode)) {
        results.push({
          type: currentItem.type || "tracker",
          file: "tracker.yaml",
          id: currentItem.id,
          brief: currentItem.title,
          status: currentItem.status,
        });
      }
      currentItem = { text: "", id: "", title: "", type: "", status: "" };
    }
    if (currentItem) {
      currentItem.text += " " + line;
      const idMatch = line.match(/^\s*-?\s*id:\s*(.+)/);
      const titleMatch = line.match(/^\s+title:\s*(.+)/);
      const typeMatch = line.match(/^\s+type:\s*(.+)/);
      const statusMatch = line.match(/^\s+status:\s*(.+)/);
      if (idMatch) currentItem.id = idMatch[1].trim();
      if (titleMatch) currentItem.title = titleMatch[1].trim();
      if (typeMatch) currentItem.type = typeMatch[1].trim();
      if (statusMatch) currentItem.status = statusMatch[1].trim();
    }
  }
  if (currentItem && matchesTerms(currentItem.text, terms, mode)) {
    results.push({
      type: currentItem.type || "tracker",
      file: "tracker.yaml",
      id: currentItem.id,
      brief: currentItem.title,
      status: currentItem.status,
    });
  }
}

function searchDir(root, dirPath, sourceLabel, terms, mode, results, fileFilter) {
  const dir = join(root, dirPath);
  if (!existsSync(dir)) return;

  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    if (fileFilter) files = files.filter((f) => fileFilter.test(f));
  } catch {
    return;
  }

  for (const file of files) {
    const filePath = `${dirPath}/${file}`;
    const content = readFileSync(join(dir, file), "utf8");
    if (!matchesTerms(content, terms, mode)) continue;

    const descMatch = content.match(/description:\s*["']?(.+?)["']?\s*$/m);
    const noteMatch = content.match(/^note:\s*(.+)/m);
    const idMatch = content.match(/^id:\s*(.+)/m);
    const titleMatch = content.match(/^title:\s*(.+)/m) || content.match(/^#\s+(.+)/m);
    const statusMatch = content.match(/^status:\s*(.+)/m);

    let brief = descMatch ? descMatch[1].trim() : (noteMatch ? noteMatch[1].trim() : extractBrief(content));
    const id = idMatch ? idMatch[1].trim() : (titleMatch ? titleMatch[1].trim() : file.replace(".md", ""));
    const title = titleMatch ? titleMatch[1].trim() : null;
    if (title && title !== id) brief = brief || title;

    results.push({
      type: sourceLabel,
      file: filePath,
      id,
      brief: brief || null,
      status: statusMatch ? statusMatch[1].trim() : null,
    });
  }
}

function searchStories(root, terms, mode, results) {
  const storiesDir = join(root, "documentation/stories");
  if (!existsSync(storiesDir)) return;

  let features;
  try { features = readdirSync(storiesDir); } catch { return; }

  for (const feature of features) {
    const featureDir = join(storiesDir, feature);
    let entries;
    try { entries = readdirSync(featureDir); } catch { continue; }

    // Feature-level docs (PRD.md, TRD.md, discovery.md)
    for (const file of entries.filter(f => f.endsWith(".md"))) {
      const filePath = join(featureDir, file);
      const relPath = `documentation/stories/${feature}/${file}`;
      const content = readFileSync(filePath, "utf8");
      if (!matchesTerms(content, terms, mode)) continue;

      const titleMatch = content.match(/^#\s+(.+)/m);
      results.push({
        type: "story",
        file: relPath,
        id: feature,
        brief: titleMatch ? titleMatch[1].trim() : file.replace(".md", ""),
        status: null,
      });
    }

    // Story-level dirs (S-001, S-002, etc.)
    for (const story of entries.filter(f => /^S-\d+$/i.test(f))) {
      const storyDir = join(featureDir, story);
      let storyFiles;
      try { storyFiles = readdirSync(storyDir); } catch { continue; }

      for (const file of storyFiles.filter(f => f.endsWith(".md") && f !== "retro.md")) {
        const filePath = join(storyDir, file);
        const relPath = `documentation/stories/${feature}/${story}/${file}`;
        const content = readFileSync(filePath, "utf8");
        if (!matchesTerms(content, terms, mode)) continue;

        const titleMatch = content.match(/^#\s+(.+)/m) || content.match(/^title:\s*(.+)/m);
        results.push({
          type: "story",
          file: relPath,
          id: story,
          brief: titleMatch ? titleMatch[1].trim() : file.replace(".md", ""),
          status: null,
        });
      }

      // Tasks inside story
      const tasksDir = join(storyDir, "tasks");
      if (!existsSync(tasksDir)) continue;
      let taskFiles;
      try { taskFiles = readdirSync(tasksDir).filter(f => f.endsWith(".md")); } catch { continue; }

      for (const file of taskFiles) {
        const filePath = join(tasksDir, file);
        const relPath = `documentation/stories/${feature}/${story}/tasks/${file}`;
        const content = readFileSync(filePath, "utf8");
        if (!matchesTerms(content, terms, mode)) continue;

        const titleMatch = content.match(/^#\s+(.+)/m);
        const statusMatch = content.match(/Status:\s*(\w+)/i);
        results.push({
          type: "task",
          file: relPath,
          id: `${story}-${file.replace(".md", "")}`,
          brief: titleMatch ? titleMatch[1].trim() : file.replace(".md", ""),
          status: statusMatch ? statusMatch[1].trim() : null,
        });
      }
    }
  }
}

function searchRetros(root, terms, mode, results) {
  const storiesDir = join(root, "documentation/stories");
  if (!existsSync(storiesDir)) return;

  let features;
  try {
    features = readdirSync(storiesDir);
  } catch {
    return;
  }

  for (const feature of features) {
    const featureDir = join(storiesDir, feature);
    let stories;
    try {
      stories = readdirSync(featureDir);
    } catch {
      continue;
    }

    for (const story of stories) {
      const retroPath = join(featureDir, story, "retro.md");
      const retroRelPath = `documentation/stories/${feature}/${story}/retro.md`;
      if (!existsSync(retroPath)) continue;

      const content = readFileSync(retroPath, "utf8");
      if (!matchesTerms(content, terms, mode)) continue;

      // Extract matching findings from key sections
      const lines = content.split("\n");
      let inSection = false;
      let foundSpecific = false;
      for (const line of lines) {
        if (/^##\s+(What Didn't|Learnings|What We Learned)/i.test(line)) {
          inSection = true;
          continue;
        }
        if (/^##/.test(line)) {
          inSection = false;
          continue;
        }
        if (inSection && line.startsWith("- ") && matchesTerms(line, terms, mode)) {
          results.push({
            type: "retro",
            file: retroRelPath,
            id: story,
            brief: line.slice(2).trim(),
            status: null,
          });
          foundSpecific = true;
        }
      }

      if (!foundSpecific) {
        const titleMatch = content.match(/^#\s+(.+)/m);
        results.push({
          type: "retro",
          file: retroRelPath,
          id: story,
          brief: titleMatch ? titleMatch[1].trim() : null,
          status: null,
        });
      }
    }
  }
}

function searchLegacyLog(root, terms, mode, results) {
  for (const file of ["documentation/log.md", "documentation/logs.md", "log.md", "logs.md"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;

  const content = readFileSync(path, "utf8");
  const entries = content.split(/^(?=##\s)/m);

  for (const entry of entries) {
    if (!entry.trim() || !matchesTerms(entry, terms, mode)) continue;
    const titleMatch = entry.match(/^##\s+(.+)/m);
    const dateMatch = entry.match(/\d{4}-\d{2}-\d{2}/);
    results.push({
      type: "log",
      file,
      id: dateMatch ? dateMatch[0] : null,
      brief: titleMatch ? titleMatch[1].trim() : entry.trim().slice(0, 80),
      status: null,
    });
  }
  }
}

function searchLegacyTodos(root, terms, mode, results) {
  const path = join(root, "documentation/TODOS.md");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.match(/^[-*]\s+\[[ x]\]/)) continue;
    if (!matchesTerms(line, terms, mode)) continue;

    const isDone = /\[x\]/i.test(line);
    const text = line.replace(/^[-*]\s+\[[ x]\]\s+/, "").trim();
    results.push({
      type: "todo",
      file: "documentation/TODOS.md",
      id: null,
      brief: text,
      status: isDone ? "done" : "open",
    });
  }
}
