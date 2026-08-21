import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync, mkdirSync } from "node:fs";
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
