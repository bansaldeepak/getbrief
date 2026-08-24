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
const RULES_TEMPLATES_DIR = join(__dirname, "../templates/rules");
const CODEGRAPH_BIN = join(__dirname, "../node_modules/.bin/codegraph");

const DIRS = [
  "documentation",
  "documentation/stories",
  "documentation/decisions",
  "documentation/todo",
  "documentation/logs",
  "documentation/memory",
  "documentation/context",
  ".claude",
];

const FILES = [
  { src: "tracker.yaml", dest: "documentation/tracker.yaml" },
  { src: "MEMORY.md", dest: "MEMORY.md" },
  { src: "AGENTS.md", dest: "AGENTS.md" },
  { src: "PROJECT-TRACKER.md", dest: "documentation/PROJECT-TRACKER.md" },
  { src: "CLAUDE.md", dest: ".claude/CLAUDE.md" },
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


  // Rule templates
  const rulesResult = copyRuleTemplates(projectRoot);
  created.push(...rulesResult.created);
  skipped.push(...rulesResult.skipped);

  // Codegraph index
  const cgResult = initCodegraph(projectRoot, opts);
  if (cgResult === "created") created.push(".codegraph/");
  else if (cgResult === "exists") skipped.push(".codegraph/");

  // Ensure .codegraph/ in project .gitignore
  ensureGitignoreEntry(projectRoot, ".codegraph/");

  return { created, skipped };
}

function copyRuleTemplates(projectRoot) {
  const created = [];
  const skipped = [];
  const manifestPath = join(RULES_TEMPLATES_DIR, "manifest.json");

  if (!existsSync(manifestPath)) {
    return { created, skipped };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const rulesDir = join(projectRoot, ".claude", "rules");
  mkdirSync(rulesDir, { recursive: true });

  for (const template of manifest.templates) {
    const src = join(RULES_TEMPLATES_DIR, template.file);
    const dest = join(rulesDir, template.file);

    if (existsSync(dest)) {
      skipped.push(`.claude/rules/${template.file}`);
      continue;
    }

    if (existsSync(src)) {
      copyFileSync(src, dest);
      created.push(`.claude/rules/${template.file}`);
    }
  }

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
