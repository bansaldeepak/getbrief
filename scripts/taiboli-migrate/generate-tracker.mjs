#!/usr/bin/env node
/**
 * Generate tracker.yaml from existing project data.
 * Scans stories, decisions, TODOs, research, and memory.
 *
 * Usage: node generate-tracker.mjs <project-root> [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!projectRoot) {
  console.error("Usage: node generate-tracker.mjs <project-root> [--dry-run]");
  process.exit(1);
}

const KNOWN_STATUSES = ["planned", "in_progress", "blocked", "completed", "done", "open", "active", "draft", "obsolete", "moot", "superseded"];

function normalizeStatus(raw) {
  if (!raw) return "active";
  const lower = raw.toLowerCase().trim();
  // Take only the first word to avoid picking up markdown links and descriptions
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

function parseStatus(content) {
  const match = content.match(/\*\*Status\*\*:?\s*(.+)/m) ||
                content.match(/^status:\s*(.+)/m);
  if (!match) return "active";
  return normalizeStatus(match[1]);
}

// --- Stories ---
const storiesDir = join(projectRoot, "documentation/stories");
const stories = [];
if (existsSync(storiesDir)) {
  const features = readdirSync(storiesDir).filter(f => {
    const p = join(storiesDir, f);
    return statSync(p).isDirectory() && !f.startsWith(".");
  });

  for (const feature of features) {
    const featureDir = join(storiesDir, feature);
    const storyDirs = readdirSync(featureDir).filter(f =>
      /^S-\d+$/i.test(f) && statSync(join(featureDir, f)).isDirectory()
    );

    for (const storyDir of storyDirs) {
      const storyPath = join(featureDir, storyDir, "story.md");
      const storyId = storyDir.toUpperCase();

      let title = storyId;
      let status = "completed";
      let branch = null;
      let category = "feat";
      let created = null;

      if (existsSync(storyPath)) {
        const content = readFileSync(storyPath, "utf8");
        const titleMatch = content.match(/^#\s+(?:S-\d+[:\s—–-]+)?\s*(.+)/m);
        if (titleMatch) title = titleMatch[1].trim();
        status = parseStatus(content);
        const branchMatch = content.match(/\*\*Branch\*\*:?\s*(\S+)/i);
        if (branchMatch) branch = branchMatch[1].trim();
        const createdMatch = content.match(/\*\*Created\*\*:?\s*(\d{4}-\d{2}-\d{2})/i);
        if (createdMatch) created = createdMatch[1];
        const catMatch = content.match(/\*\*Category\*\*:?\s*(\w+)/i);
        if (catMatch) category = catMatch[1].toLowerCase();
      }

      let taskCount = 0;
      const tasksDir = join(featureDir, storyDir, "tasks");
      if (existsSync(tasksDir)) {
        taskCount = readdirSync(tasksDir).filter(f => f.endsWith(".md")).length;
      }

      stories.push({ id: storyId, type: "story", title: title.slice(0, 80), status, feature, branch, category, created, tasks: taskCount });
    }
  }
}
stories.sort((a, b) => parseInt(a.id.replace("S-", "")) - parseInt(b.id.replace("S-", "")));

// --- TODOs ---
const todoDir = join(projectRoot, "documentation/todo");
const todos = [];
if (existsSync(todoDir)) {
  const files = readdirSync(todoDir).filter(f => f.endsWith(".md"));
  for (const file of files) {
    const content = readFileSync(join(todoDir, file), "utf8");
    const idMatch = file.match(/^(TODO-\d+)/i);
    const id = idMatch ? idMatch[1].toUpperCase() : file.replace(".md", "");
    const titleMatch = content.match(/^title:\s*"?(.+?)"?\s*$/m) || content.match(/^#\s+(?:TODO-\d+:?\s*)(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : file;
    const statusMatch = content.match(/^status:\s*(\w+)/m);
    const status = statusMatch ? normalizeStatus(statusMatch[1]) : "open";
    const priorityMatch = content.match(/^priority:\s*(\S+)/m);
    const priority = priorityMatch ? priorityMatch[1] : "P2";
    todos.push({ id, type: "todo", title: title.slice(0, 80), status, priority });
  }
}
todos.sort((a, b) => parseInt(a.id.replace("TODO-", "")) - parseInt(b.id.replace("TODO-", "")));

// --- Decisions ---
const decisionsDir = join(projectRoot, "documentation/decisions");
const decisions = [];
if (existsSync(decisionsDir)) {
  const files = readdirSync(decisionsDir).filter(f => f.endsWith(".md"));
  for (const file of files) {
    const content = readFileSync(join(decisionsDir, file), "utf8");
    const idMatch = file.match(/^(DEC-\d+)/i);
    const id = idMatch ? idMatch[1].toUpperCase() : file.replace(".md", "");
    const titleMatch = content.match(/^#\s+(?:DEC-\d+:?\s*)(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : file.replace(".md", "");
    const status = parseStatus(content);
    decisions.push({ id, type: "decision", title: title.slice(0, 80), status });
  }
}
decisions.sort((a, b) => parseInt(a.id.replace("DEC-", "")) - parseInt(b.id.replace("DEC-", "")));

// --- Research ---
const researchDir = join(projectRoot, "documentation/research");
const research = [];
if (existsSync(researchDir)) {
  const files = readdirSync(researchDir).filter(f => f.endsWith(".md"));
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const content = readFileSync(join(researchDir, file), "utf8");
    const idMatch = file.match(/^(RES-\d+)/i);
    const id = idMatch ? idMatch[1].toUpperCase() : `RES-${String(i + 1).padStart(3, "0")}`;
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : file.replace(".md", "");
    research.push({ id, type: "research", title: title.slice(0, 80), status: "active", file });
  }
}

// Memory excluded from tracker — volatile by design (models create/update/delete continuously)

// --- Build YAML ---
let yaml = `# Generated by brief — project tracker\n# Last updated: ${new Date().toISOString().slice(0, 10)}\n\nitems:\n`;

for (const s of stories) {
  yaml += `  - id: ${s.id}\n    type: story\n    title: "${s.title.replace(/"/g, '\\"')}"\n    status: ${s.status}\n    feature: ${s.feature}\n`;
  if (s.branch) yaml += `    branch: ${s.branch}\n`;
  yaml += `    category: ${s.category}\n`;
  if (s.created) yaml += `    created: ${s.created}\n`;
  if (s.tasks) yaml += `    tasks: ${s.tasks}\n`;
  yaml += `\n`;
}

for (const t of todos) {
  yaml += `  - id: ${t.id}\n    type: todo\n    title: "${t.title.replace(/"/g, '\\"')}"\n    status: ${t.status}\n    priority: ${t.priority}\n\n`;
}

for (const d of decisions) {
  yaml += `  - id: ${d.id}\n    type: decision\n    title: "${d.title.replace(/"/g, '\\"')}"\n    status: ${d.status}\n\n`;
}

for (const r of research) {
  yaml += `  - id: ${r.id}\n    type: research\n    title: "${r.title.replace(/"/g, '\\"')}"\n    status: ${r.status}\n    file: ${r.file}\n\n`;
}


const trackerPath = join(projectRoot, "documentation/tracker.yaml");

if (dryRun) {
  console.log(`Stories: ${stories.length}, TODOs: ${todos.length}, Decisions: ${decisions.length}, Research: ${research.length}`);
  console.log("\n--- tracker.yaml preview (first 60 lines) ---");
  console.log(yaml.split("\n").slice(0, 60).join("\n"));
  console.log(`\n[DRY] Would write to documentation/tracker.yaml`);
} else {
  writeFileSync(trackerPath, yaml);
  console.log(`✓ Written: documentation/tracker.yaml`);
  console.log(`  Stories: ${stories.length}`);
  console.log(`  TODOs: ${todos.length}`);
  console.log(`  Decisions: ${decisions.length}`);
  console.log(`  Research: ${research.length}`);
}
