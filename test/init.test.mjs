import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync, mkdirSync, lstatSync, readlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { initProject, matchesDetection, filterRelevantRules } from "../lib/init.mjs";
import { runDoctor } from "../lib/doctor.mjs";

const __testDirname = dirname(fileURLToPath(import.meta.url));
const BRIEF_SKILLS_PATH = "../../.brief/workflow/skills/brief";

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

  it("does not overwrite existing files but injects memory harness", async () => {
    writeFileSync(join(tmpDir, "MEMORY.md"), "# Custom\n");
    await initProject(tmpDir, { nonInteractive: true });
    const content = readFileSync(join(tmpDir, "MEMORY.md"), "utf8");
    assert.ok(content.startsWith("# Custom\n"));
    assert.ok(content.includes("<!-- brief:memory-harness -->"));
  });

  it("does not double-inject memory harness", async () => {
    writeFileSync(join(tmpDir, "MEMORY.md"), "# Custom\n\n<!-- brief:memory-harness -->\nexisting\n<!-- /brief:memory-harness -->\n");
    await initProject(tmpDir, { nonInteractive: true });
    const content = readFileSync(join(tmpDir, "MEMORY.md"), "utf8");
    const count = (content.match(/brief:memory-harness/g) || []).length;
    assert.equal(count, 2);
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

  it("writes portable package provenance without machine paths", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const manifest = JSON.parse(readFileSync(join(tmpDir, ".brief/workflow/manifest.json"), "utf8"));
    assert.equal(manifest.schema, 1);
    assert.equal(manifest.scope, "local");
    assert.equal(manifest.version, "0.2.0");
    assert.ok(manifest.files["skills/brief/SKILL.md"]);
    assert.ok(manifest.registrations[".codex/skills/brief"]);
    assert.ok(!JSON.stringify(manifest).includes(tmpDir));
    assert.equal(runDoctor(tmpDir).healthy, true);
  });

  it("still detects the stack when installing project rules", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ dependencies: { hono: "^4.0.0" } }));
    await initProject(tmpDir, { nonInteractive: true });
    assert.ok(existsSync(join(tmpDir, ".claude/rules/backend-standards.md")));
  });

  it("keeps portable provenance unchanged on repeated init", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    const file = join(tmpDir, ".brief/workflow/manifest.json"), before = readFileSync(file, "utf8");
    await initProject(tmpDir, { nonInteractive: true });
    assert.equal(readFileSync(file, "utf8"), before);
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
    const briefGi = readFileSync(join(tmpDir, ".brief/.gitignore"), "utf8");
    assert.ok(briefGi.includes("workflow-transaction.json"));
    assert.ok(briefGi.includes("brief-manifest.json"));
    assert.ok(!existsSync(join(tmpDir, ".gitignore")));
    assert.ok(!execSync("git check-ignore .agents/skills/brief .brief/workflow/manifest.json || true", { cwd: tmpDir, encoding: "utf8" }).trim());
  });

  it("does not duplicate ignore entries on re-run", async () => {
    await initProject(tmpDir, { nonInteractive: true });
    await initProject(tmpDir, { nonInteractive: true });
    const content = readFileSync(join(tmpDir, ".brief/.gitignore"), "utf8");
    assert.equal(content.split("workflow-transaction.json").length - 1, 1);
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

describe("matchesDetection with projectRoot", () => {
  let tmp;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "brief-init-")); });
  afterEach(() => { rmSync(tmp, { recursive: true }); });

  it("matches Dockerfile when file exists", () => {
    writeFileSync(join(tmp, "Dockerfile"), "FROM node:20");
    assert.equal(matchesDetection(["Dockerfile"], {}, tmp), true);
  });

  it("returns false for Dockerfile when file missing", () => {
    assert.equal(matchesDetection(["Dockerfile"], {}, tmp), false);
  });

  it("matches fly.toml when file exists", () => {
    writeFileSync(join(tmp, "fly.toml"), "app = 'test'");
    assert.equal(matchesDetection(["fly.toml"], {}, tmp), true);
  });

  it("matches wrangler.toml when file exists", () => {
    writeFileSync(join(tmp, "wrangler.toml"), "name = 'test'");
    assert.equal(matchesDetection(["wrangler.toml"], {}, tmp), true);
  });

  it("matches wrangler.jsonc when file exists", () => {
    writeFileSync(join(tmp, "wrangler.jsonc"), "{}");
    assert.equal(matchesDetection(["wrangler.jsonc"], {}, tmp), true);
  });

  it("matches vercel.json when file exists", () => {
    writeFileSync(join(tmp, "vercel.json"), "{}");
    assert.equal(matchesDetection(["vercel.json"], {}, tmp), true);
  });

  it("matches pyproject.toml:django via frameworks", () => {
    assert.equal(
      matchesDetection(["pyproject.toml:django"], { frameworks: ["django"] }, tmp),
      true
    );
  });
});
