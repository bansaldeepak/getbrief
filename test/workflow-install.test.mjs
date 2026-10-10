import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, symlinkSync, readlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const installer = join(root, "scripts/install-workflow.py");
const checker = join(root, "scripts/check-references.py");
function run(script, args) {
  const result = spawnSync("python3", [script, ...args], { encoding: "utf8" });
  assert.ifError(result.error);
  return result;
}

describe("shared workflow installation", () => {
  let fixture;
  let home;
  beforeEach(() => {
    fixture = mkdtempSync(join(tmpdir(), "brief-workflow-"));
    home = join(fixture, "home");
    mkdirSync(home);
  });
  afterEach(() => rmSync(fixture, { recursive: true }));
  const install = (...args) => run(installer, ["--home-dir", home, ...args]);

  it("dry-run plans registrations without writing anything", () => {
    const result = install("--dry-run");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /UPDATE .codex\/skills\/brief/);
    assert.deepEqual(readdirSync(home), []);
  });

  it("preserves custom host content and unrelated files; install/check are idempotent", () => {
    mkdirSync(join(home, ".claude"));
    const custom = "# Custom policy\nUse my special wrapper.\nKeep `MEMORY.md` + `memory/` for this project.\nRun: `npm run typecheck && npm run lint && npm test`\nAnalyze diff against conventions, report issues\nUpdate project `MEMORY.md` after retro\n";
    writeFileSync(join(home, ".claude/CLAUDE.md"), custom);
    writeFileSync(join(home, ".claude/unrelated.json"), "preserve me");
    let result = install();
    assert.equal(result.status, 0, result.stderr);
    const config = readFileSync(join(home, ".claude/CLAUDE.md"), "utf8");
    assert.ok(config.startsWith(custom));
    assert.equal(readFileSync(join(home, ".claude/unrelated.json"), "utf8"), "preserve me");
    assert.equal(install("--check").status, 0);
    result = install();
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /UPDATE/);
    assert.equal(readFileSync(join(home, ".claude/CLAUDE.md"), "utf8"), config);
    assert.equal(readlinkSync(join(home, ".agents/skills/brief")), join(root, "skills/brief"));
    for (const host of [".agents", ".claude", ".codex"]) {
      assert.equal(readlinkSync(join(home, host, "rules/db-safety.md")), join(root, "rules/db-safety.md"));
      assert.equal(readFileSync(join(home, host, "rules/db-safety.md"), "utf8"), readFileSync(join(root, "rules/db-safety.md"), "utf8"));
    }
  });

  it("refuses foreign files before any partial installation", () => {
    mkdirSync(join(home, ".codex/skills"), { recursive: true });
    writeFileSync(join(home, ".codex/skills/brief"), "custom content");
    const result = install();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unowned or modified/);
    assert.equal(readFileSync(join(home, ".codex/skills/brief"), "utf8"), "custom content");
    assert.equal(existsSync(join(home, ".agents")), false);
  });

  it("rejects blocked ancestors in dry-run and installation before writes", () => {
    mkdirSync(join(home, ".codex"));
    writeFileSync(join(home, ".codex/agents"), "retain");
    for (const args of [["--dry-run"], ["--adopt-existing"]]) {
      const result = install(...args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /ancestor is not a directory/);
      assert.equal(existsSync(join(home, ".agents")), false);
      assert.equal(existsSync(join(home, ".claude")), false);
      assert.equal(readFileSync(join(home, ".codex/agents"), "utf8"), "retain");
    }
  });

  it("preserves foreign manifests without installing any registrations", () => {
    mkdirSync(join(home, ".agents"));
    const manifest = join(home, ".agents/brief-workflow.json");
    for (const value of [{ custom: true }, { version: 1, source: root, entries: { invalid: null } }]) {
      const content = JSON.stringify(value);
      writeFileSync(manifest, content);
      const result = install("--adopt-existing");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /unrecognized brief workflow manifest/);
      assert.equal(readFileSync(manifest, "utf8"), content);
      assert.deepEqual(readdirSync(join(home, ".agents")), ["brief-workflow.json"]);
      assert.equal(existsSync(join(home, ".claude")), false);
    }
  });

  it("surfaces generator diagnostics during planning", () => {
    const result = install("--dry-run");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /maxTurns|unsupported|per-tool/i);
  });

  it("refuses a conflicting directory even with explicit adoption", () => {
    mkdirSync(join(home, ".agents/skills/brief"), { recursive: true });
    writeFileSync(join(home, ".agents/skills/brief/custom.md"), "retain");
    const result = install("--adopt-existing");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refusing to replace a directory/);
    assert.equal(readFileSync(join(home, ".agents/skills/brief/custom.md"), "utf8"), "retain");
  });

  it("backs up an explicitly adopted dangling registration", () => {
    mkdirSync(join(home, ".codex/skills"), { recursive: true });
    const legacy = join(home, "missing-legacy-brief");
    symlinkSync(legacy, join(home, ".codex/skills/brief"));
    assert.equal(install().status, 1);
    const result = install("--adopt-existing");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(install("--check").status, 0);
    const backups = join(home, ".agents/brief-backups");
    const backup = join(backups, readdirSync(backups)[0], ".codex/skills/brief");
    assert.equal(readlinkSync(backup), legacy);
  });

  it("detects edited generated agents and preserves them until adoption", () => {
    assert.equal(install().status, 0);
    const path = join(home, ".codex/agents/reviewer.toml");
    writeFileSync(path, "custom = true\n");
    assert.equal(install("--check").status, 1);
    assert.equal(install().status, 1);
    assert.equal(readFileSync(path, "utf8"), "custom = true\n");
    assert.equal(install("--adopt-existing").status, 0);
    assert.equal(install("--check").status, 0);
  });

  it("rejects malformed managed blocks and escaping parent symlinks", () => {
    mkdirSync(join(home, ".claude"));
    writeFileSync(join(home, ".claude/CLAUDE.md"), "<!-- brief:workflow -->\nmissing close");
    assert.equal(install("--adopt-existing").status, 1);
    assert.equal(existsSync(join(home, ".agents")), false);
    rmSync(join(home, ".claude"), { recursive: true });
    const outside = join(fixture, "outside");
    mkdirSync(outside);
    symlinkSync(outside, join(home, ".agents"));
    const result = install();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /escapes installation root/);
    assert.deepEqual(readdirSync(outside), []);
  });
});

describe("active source references", () => {
  let fixture;
  beforeEach(() => {
    fixture = mkdtempSync(join(tmpdir(), "brief-refs-"));
    mkdirSync(join(fixture, "skills/brief"), { recursive: true });
    writeFileSync(join(fixture, "skills/brief/SKILL.md"), "# Brief\n[Guide](guide.md)\n");
    writeFileSync(join(fixture, "skills/brief/guide.md"), "# Guide\n");
  });
  afterEach(() => rmSync(fixture, { recursive: true }));

  it("fails on a broken live skill reference and passes after repair", () => {
    assert.equal(run(checker, ["--root", fixture]).status, 0);
    rmSync(join(fixture, "skills/brief/guide.md"));
    const result = run(checker, ["--root", fixture]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /skills\/brief\/SKILL.md:2: broken link guide.md/);
    writeFileSync(join(fixture, "skills/brief/guide.md"), "restored");
    assert.equal(run(checker, ["--root", fixture]).status, 0);
  });

  it("validates templates and agents without treating historical story prose as policy", () => {
    mkdirSync(join(fixture, "templates"));
    writeFileSync(join(fixture, "templates/guide.md"), "[Missing](missing.md)\n");
    assert.equal(run(checker, ["--root", fixture]).status, 1);
    writeFileSync(join(fixture, "templates/missing.md"), "present");
    mkdirSync(join(fixture, "documentation/stories/history"), { recursive: true });
    writeFileSync(join(fixture, "documentation/stories/history/old.md"), "[Retired](deleted.md)");
    assert.equal(run(checker, ["--root", fixture]).status, 0);
    mkdirSync(join(fixture, "agents"));
    writeFileSync(join(fixture, "agents/reviewer.md"), "Use the `missing-skill` skill.\n");
    assert.equal(run(checker, ["--root", fixture]).status, 1);
  });
});
