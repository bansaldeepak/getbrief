/**
 * brief init — scaffold canonical project structure.
 * Copies templates, creates directories, initializes tracker.yaml.
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, appendFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../../templates/project-structure");
const CODEGRAPH_BIN = join(__dirname, "../node_modules/.bin/codegraph");

const DIRS = [
  "documentation",
  "documentation/stories",
  "documentation/decisions",
  "documentation/todo",
  "documentation/logs",
  "documentation/memory",
  "documentation/context",
  ".project",
];

const FILES = [
  { src: "tracker.yaml", dest: "documentation/tracker.yaml" },
  { src: "MEMORY.md", dest: "MEMORY.md" },
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

  // Codegraph index
  const cgResult = initCodegraph(projectRoot, opts);
  if (cgResult === "created") created.push(".codegraph/");
  else if (cgResult === "exists") skipped.push(".codegraph/");

  // Ensure .codegraph/ in project .gitignore
  ensureGitignoreEntry(projectRoot, ".codegraph/");

  return { created, skipped };
}

function initCodegraph(projectRoot, opts = {}) {
  const codegraphDir = join(projectRoot, ".codegraph");

  if (opts.reindex) {
    if (existsSync(codegraphDir)) {
      rmSync(codegraphDir, { recursive: true });
    }
  }

  if (!existsSync(codegraphDir)) {
    try {
      execFileSync(CODEGRAPH_BIN, ["init", "-i", projectRoot], {
        stdio: "inherit",
        timeout: 120000,
      });
      return "created";
    } catch {
      console.warn("Warning: codegraph init failed (project may have no indexable files).");
      if (existsSync(codegraphDir)) {
        rmSync(codegraphDir, { recursive: true });
      }
      return "skipped";
    }
  }
  return "exists";
}

function ensureGitignoreEntry(projectRoot, entry) {
  const giPath = join(projectRoot, ".gitignore");
  if (existsSync(giPath)) {
    const content = readFileSync(giPath, "utf8");
    if (!content.includes(entry)) {
      appendFileSync(giPath, `\n${entry}\n`);
    }
  } else {
    writeFileSync(giPath, `${entry}\n`);
  }
}
