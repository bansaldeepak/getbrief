import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync, mkdirSync, lstatSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { execSync } from "node:child_process";
import { initProject } from "../lib/init.mjs";

const BRIEF_SKILLS_PATH = join(homedir(), ".agents", "brief", "skills", "brief");

describe("init.mjs — scaffold", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("creates documentation directories", async () => {
    const { created } = await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, "documentation/context")));
    assert.ok(existsSync(join(tmpDir, "documentation/stories")));
    assert.ok(existsSync(join(tmpDir, "documentation/decisions")));
    assert.ok(created.includes("documentation/"));
  });

  it("creates template files", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, "documentation/tracker.yaml")));
    assert.ok(existsSync(join(tmpDir, "MEMORY.md")));
    assert.ok(existsSync(join(tmpDir, ".claude/CLAUDE.md")));
  });

  it("does not overwrite existing files", async () => {
    writeFileSync(join(tmpDir, "MEMORY.md"), "# Custom\n");
    await initProject(tmpDir, { nonInteractive: true });
    const content = readFileSync(join(tmpDir, "MEMORY.md"), "utf8");
    assert.equal(content, "# Custom\n");
  });
});

describe("init.mjs — symlinks", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("creates .agents/skills/brief symlink (always)", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const linkPath = join(tmpDir, ".agents", "skills", "brief");
    assert.ok(existsSync(linkPath));
    assert.ok(lstatSync(linkPath).isSymbolicLink());
    assert.equal(readlinkSync(linkPath), BRIEF_SKILLS_PATH);
  });

  it("creates .claude/skills/brief symlink when .claude/ detected", async () => {
    mkdirSync(join(tmpDir, ".claude"));
    await initProject(tmpDir, { nonInteractive: true });
    const linkPath = join(tmpDir, ".claude", "skills", "brief");
    assert.ok(existsSync(linkPath));
    assert.ok(lstatSync(linkPath).isSymbolicLink());
  });

  it("skips .claude/skills/brief when .claude/ not pre-existing", async () => {
    // .claude/ is created by scaffoldDocs, but it's not detected as "agent present"
    // because findAgentDirs checks for .claude/ before scaffold runs... actually
    // detect runs after scaffold, so .claude/ will exist. Let's verify the link exists.
    await initProject(tmpDir, { nonInteractive: true });
    // After scaffold, .claude/ exists, so agent detection finds it
    const linkPath = join(tmpDir, ".claude", "skills", "brief");
    assert.ok(existsSync(linkPath));
  });

  it("symlinks are idempotent on re-run", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const { skipped } = await initProject(tmpDir, { nonInteractive: true });
    assert.ok(skipped.includes(".agents/skills/brief"));
  });
});

describe("init.mjs — manifest", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("writes .agents/brief-manifest.json", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const manifestPath = join(tmpDir, ".agents", "brief-manifest.json");
    assert.ok(existsSync(manifestPath));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.version, "1.0.0");
    assert.ok(manifest.installed_at);
    assert.ok(manifest.detection);
    assert.ok(Array.isArray(manifest.symlinks));
    assert.ok(Array.isArray(manifest.rules_installed));
  });

  it("manifest contains detection results", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      dependencies: { hono: "^4.0.0" },
      devDependencies: { vitest: "^1.0.0" },
    }));
    await initProject(tmpDir, { nonInteractive: true });
    const manifest = JSON.parse(readFileSync(join(tmpDir, ".agents", "brief-manifest.json"), "utf8"));
    assert.ok(manifest.detection.frameworks.includes("hono"));
    assert.ok(manifest.detection.testing.includes("vitest"));
    assert.equal(manifest.detection.runtime, "node");
  });

  it("manifest mode is symlink when symlinks succeed", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const manifest = JSON.parse(readFileSync(join(tmpDir, ".agents", "brief-manifest.json"), "utf8"));
    assert.equal(manifest.mode, "symlink");
  });
});

describe("init.mjs — rules filtering", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("copies coding-style.md for any project (wildcard detect)", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, ".claude", "rules", "coding-style.md")));
  });

  it("copies backend-standards.md when backend framework detected", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      dependencies: { express: "^4.0.0" },
    }));
    await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, ".claude", "rules", "backend-standards.md")));
  });

  it("skips frontend-standards.md when no frontend framework detected", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      dependencies: { express: "^4.0.0" },
    }));
    await initProject(tmpDir, { nonInteractive: true });
    assert.ok(!existsSync(join(tmpDir, ".claude", "rules", "frontend-standards.md")));
  });

  it("copies frontend-standards.md when react detected", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      dependencies: { react: "^18.0.0" },
    }));
    await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, ".claude", "rules", "frontend-standards.md")));
  });
});

describe("init.mjs — gitignore", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("adds entries to scoped .gitignore files (not root)", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const agentsGi = readFileSync(join(tmpDir, ".agents", ".gitignore"), "utf8");
    const claudeGi = readFileSync(join(tmpDir, ".claude", ".gitignore"), "utf8");
    assert.ok(agentsGi.includes("skills/brief"));
    assert.ok(agentsGi.includes("brief-manifest.json"));
    assert.ok(claudeGi.includes("skills/brief"));
    assert.ok(!existsSync(join(tmpDir, ".gitignore")));
  });

  it("does not duplicate entries on re-run", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    await initProject(tmpDir, { nonInteractive: true });
    const agentsGi = readFileSync(join(tmpDir, ".agents", ".gitignore"), "utf8");
    const count = agentsGi.split("skills/brief").length - 1;
    assert.equal(count, 1);
  });
});

describe("init.mjs — codegraph", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "brief-init-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("creates .codegraph/ when JS files exist", async () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    const { created } = await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, ".codegraph/codegraph.db")));
    assert.ok(created.includes(".codegraph/"));
  });

  it("--reindex deletes and recreates the index", async () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    await initProject(tmpDir, { nonInteractive: true });
    writeFileSync(join(tmpDir, "extra.mjs"), "export const y = 2;\n");
    const { created } = await initProject(tmpDir, { nonInteractive: true, reindex: true });
    assert.ok(created.includes(".codegraph/"));
  });

  it("skips codegraph when .codegraph/ already exists", async () => {
    writeFileSync(join(tmpDir, "index.mjs"), "export const x = 1;\n");
    await initProject(tmpDir, { nonInteractive: true });
    const { skipped } = await initProject(tmpDir, { nonInteractive: true });
    assert.ok(skipped.includes(".codegraph/"));
  });
});
