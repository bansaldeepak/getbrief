/**
 * knowledge-graph migrate — convert existing loose TODOs/decisions into canonical format.
 * Scans documentation/ and project root for known patterns, creates tracker entries.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readTracker, writeTracker, nextId } from "./tracker.mjs";

export function migrateProject(projectRoot, opts = {}) {
  const items = readTracker(projectRoot);
  const added = [];
  const today = new Date().toISOString().slice(0, 10);

  // --- Scan documentation/TODOS.md ---
  const todosFile = join(projectRoot, "documentation/TODOS.md");
  if (existsSync(todosFile)) {
    const content = readFileSync(todosFile, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^[-*]\s+\[[ x]\]\s+(.+)/);
      if (match) {
        const title = match[1].trim();
        const isDone = line.includes("[x]") || line.includes("[X]");
        if (items.some((i) => i.type === "todo" && i.title === title)) continue;

        const id = nextId(items, "todo");
        items.push({
          id,
          type: "todo",
          title,
          status: isDone ? "done" : "open",
          priority: "P2",
          story: null,
          link: null,
          pr: null,
        });
        added.push({ id, title, source: "documentation/TODOS.md" });
      }
    }
  }

  // --- Scan documentation/decisions/ ---
  const decisionsDir = join(projectRoot, "documentation/decisions");
  if (existsSync(decisionsDir)) {
    const files = readdirSync(decisionsDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = readFileSync(join(decisionsDir, file), "utf8");
      const titleMatch = content.match(/^#\s+(.+)/m) || content.match(/title:\s*(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(".md", "");

      if (items.some((i) => i.type === "decision" && i.title === title)) continue;

      const id = nextId(items, "decision");
      items.push({
        id,
        type: "decision",
        title,
        status: "active",
        created: today,
        superseded_by: null,
        story: null,
        link: null,
        pr: null,
      });
      added.push({ id, title, source: `documentation/decisions/${file}` });
    }
  }

  // --- Scan for TODO-NNN.md files in documentation/ ---
  const docsDir = join(projectRoot, "documentation");
  if (existsSync(docsDir)) {
    const todoFiles = readdirSync(docsDir).filter((f) =>
      /^TODO[-_]\d+\.md$/i.test(f),
    );
    for (const file of todoFiles) {
      const content = readFileSync(join(docsDir, file), "utf8");
      const titleMatch = content.match(/title:\s*(.+)/m) || content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(".md", "");
      const statusMatch = content.match(/status:\s*(.+)/m);
      const status = statusMatch ? statusMatch[1].trim() : "open";

      if (items.some((i) => i.type === "todo" && i.title === title)) continue;

      const id = nextId(items, "todo");
      items.push({
        id,
        type: "todo",
        title,
        status,
        priority: "P1",
        story: null,
        link: null,
        pr: null,
      });
      added.push({ id, title, source: `documentation/${file}` });
    }
  }

  if (added.length > 0) {
    writeTracker(projectRoot, items);
  }

  return { added, totalItems: items.length };
}
