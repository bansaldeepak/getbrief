// File-based search — greps source files directly.
// No database dependency. Works reliably with just committed files.
// Searches: tracker.yaml, PROJECT-TRACKER.md, memory/, decisions/, retros

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function searchFiles(projectRoot, query) {
  const results = [];
  const terms = query.toLowerCase().split(/\s+/);

  searchTracker(projectRoot, terms, results);
  searchDir(projectRoot, "memory", "memory", terms, results);
  searchDir(projectRoot, "documentation/decisions", "decision", terms, results);
  searchRetros(projectRoot, terms, results);
  searchLegacyTodos(projectRoot, terms, results);

  return results;
}

function matchesTerms(text, terms) {
  const lower = text.toLowerCase();
  return terms.every((t) => lower.includes(t));
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

function searchTracker(root, terms, results) {
  const path = join(root, "tracker.yaml");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");

  let currentItem = null;
  for (const line of lines) {
    if (line.startsWith("- id:")) {
      if (currentItem && matchesTerms(currentItem.text, terms)) {
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
  if (currentItem && matchesTerms(currentItem.text, terms)) {
    results.push({
      type: currentItem.type || "tracker",
      file: "tracker.yaml",
      id: currentItem.id,
      brief: currentItem.title,
      status: currentItem.status,
    });
  }
}

function searchDir(root, dirPath, sourceLabel, terms, results) {
  const dir = join(root, dirPath);
  if (!existsSync(dir)) return;

  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return;
  }

  for (const file of files) {
    const filePath = `${dirPath}/${file}`;
    const content = readFileSync(join(dir, file), "utf8");
    if (!matchesTerms(content, terms)) continue;

    const descMatch = content.match(/description:\s*["']?(.+?)["']?\s*$/m);
    const titleMatch = content.match(/^#\s+(.+)/m) || content.match(/title:\s*(.+)/m);
    const statusMatch = content.match(/status:\s*(.+)/m);

    let brief = descMatch ? descMatch[1].trim() : extractBrief(content);
    const id = titleMatch ? titleMatch[1].trim() : file.replace(".md", "");

    results.push({
      type: sourceLabel,
      file: filePath,
      id,
      brief: brief || null,
      status: statusMatch ? statusMatch[1].trim() : null,
    });
  }
}

function searchRetros(root, terms, results) {
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
      if (!matchesTerms(content, terms)) continue;

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
        if (inSection && line.startsWith("- ") && matchesTerms(line, terms)) {
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

function searchLegacyTodos(root, terms, results) {
  const path = join(root, "documentation/TODOS.md");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.match(/^[-*]\s+\[[ x]\]/)) continue;
    if (!matchesTerms(line, terms)) continue;

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
