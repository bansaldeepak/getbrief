import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { initProject } from "../lib/init.mjs";

describe("init.mjs", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("creates documentation/context/ directory", () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    initProject(tmpDir);
    assert.ok(existsSync(join(tmpDir, "documentation/context")));
  });

  it("creates .codegraph/ when JS files exist", () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    const { created } = initProject(tmpDir);
    assert.ok(existsSync(join(tmpDir, ".codegraph/codegraph.db")));
    assert.ok(created.includes(".codegraph/"));
  });

  it("adds .codegraph/ to .gitignore", () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    initProject(tmpDir);
    const gitignore = readFileSync(join(tmpDir, ".gitignore"), "utf8");
    assert.ok(gitignore.includes(".codegraph/"));
  });

  it("--reindex deletes and recreates the index", () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    initProject(tmpDir);
    assert.ok(existsSync(join(tmpDir, ".codegraph/codegraph.db")));

    writeFileSync(join(tmpDir, "extra.mjs"), "export const y = 2;\n");
    const { created } = initProject(tmpDir, { reindex: true });
    assert.ok(existsSync(join(tmpDir, ".codegraph/codegraph.db")));
    assert.ok(created.includes(".codegraph/"));
  });

  it("skips codegraph when .codegraph/ already exists (idempotent)", () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    initProject(tmpDir);
    const { skipped } = initProject(tmpDir);
    assert.ok(skipped.includes(".codegraph/"));
  });
});

describe("rule templates", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  const EXPECTED_FILES = [
    "backend-standards.md",
    "frontend-standards.md",
    "coding-style.md",
    "deployment.md",
    "observability-wiring.md",
    "git-workflow.md",
    "product-analytics.md",
  ];

  it("copies all 7 template files to .claude/rules/", () => {
    const { created } = initProject(tmpDir);
    for (const file of EXPECTED_FILES) {
      assert.ok(
        existsSync(join(tmpDir, ".claude/rules", file)),
        `Expected ${file} to be copied`
      );
    }
    const rulesCreated = created.filter(f => f.startsWith(".claude/rules/"));
    assert.equal(rulesCreated.length, 7);
  });

  it("does not overwrite existing rule files", () => {
    mkdirSync(join(tmpDir, ".claude/rules"), { recursive: true });
    writeFileSync(join(tmpDir, ".claude/rules/coding-style.md"), "# Custom\n");

    initProject(tmpDir);

    const content = readFileSync(join(tmpDir, ".claude/rules/coding-style.md"), "utf8");
    assert.equal(content, "# Custom\n");
    assert.ok(existsSync(join(tmpDir, ".claude/rules/backend-standards.md")));
  });

  it("reports skipped templates in result", () => {
    initProject(tmpDir);
    const { skipped } = initProject(tmpDir);
    const rulesSkipped = skipped.filter(f => f.startsWith(".claude/rules/"));
    assert.equal(rulesSkipped.length, 7);
  });

  it("template content has valid frontmatter", () => {
    initProject(tmpDir);
    const content = readFileSync(join(tmpDir, ".claude/rules/backend-standards.md"), "utf8");
    assert.ok(content.startsWith("---"));
    assert.match(content, /description:/);
  });
});
