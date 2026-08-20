/**
 * brief init — scaffold canonical project structure.
 * Copies templates, creates directories, initializes tracker.yaml.
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../../templates/project-structure");

const DIRS = [
  "documentation",
  "documentation/stories",
  "documentation/decisions",
  "documentation/todo",
  "documentation/logs",
  "documentation/memory",
  ".project",
];

const FILES = [
  { src: "tracker.yaml", dest: "documentation/tracker.yaml" },
  { src: "MEMORY.md", dest: "documentation/MEMORY.md" },
  { src: "AGENTS.md", dest: "AGENTS.md" },
  { src: "PROJECT-TRACKER.md", dest: "documentation/PROJECT-TRACKER.md" },
];

export function initProject(projectRoot, opts = {}) {
  const created = [];
  const skipped = [];

  for (const dir of DIRS) {
    const fullPath = join(projectRoot, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      created.push(dir + "/");
    } else {
      skipped.push(dir + "/");
    }
  }

  for (const { src, dest } of FILES) {
    const destPath = join(projectRoot, dest);
    if (!existsSync(destPath)) {
      const srcPath = join(TEMPLATES_DIR, src);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        created.push(dest);
      }
    } else {
      skipped.push(dest);
    }
  }

  // Create .gitignore for .project/ (knowledge.db is local-only)
  const gitignorePath = join(projectRoot, ".project/.gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, "knowledge.db\n");
    created.push(".project/.gitignore");
  }

  return { created, skipped };
}
