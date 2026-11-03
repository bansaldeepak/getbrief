import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "cli.mjs");

describe("brief project — CLI end to end", () => {
  let tmp, home, repoA, repoB;

  const brief = (repo, ...args) =>
    spawnSync("node", [CLI, "--root", repo, ...args], { encoding: "utf8", env: { ...process.env, HOME: home } });

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-project-cli-"));
    home = join(tmp, "home");
    repoA = join(tmp, "api");
    repoB = join(tmp, "web");
    for (const dir of [home, repoA, repoB]) mkdirSync(dir);
  });

  afterEach(() => rmSync(tmp, { recursive: true }));

  it("smoke: join, status, leave", () => {
    assert.equal(brief(repoA, "project", "join", "test").status, 0);
    assert.match(brief(repoA, "project", "status", "test").stdout, /Repos \(1\)/);
    assert.equal(brief(repoA, "project", "leave", "test").status, 0);
    assert.match(brief(repoA, "project", "status", "test").stdout, /Repos \(0\)/);
  });

  it("full flow: share from repo A, read from repo B, sync into repo B", () => {
    brief(repoA, "project", "join", "my-app");
    brief(repoB, "project", "join", "my-app");
    const shared = brief(repoA, "project", "share", "decision", "Use JWT tokens", "--body=Validate with shared secret", "--status=resolved");
    assert.equal(shared.status, 0, shared.stderr);
    assert.match(brief(repoB, "project", "search", "jwt").stdout, /Use JWT tokens/);
    const sync = brief(repoB, "project", "sync");
    assert.equal(sync.status, 0, sync.stderr);
    const file = join(repoB, "documentation/memory/shared-my-app-use-jwt-tokens.md");
    assert.ok(existsSync(file));
    assert.match(readFileSync(file, "utf8"), /Validate with shared secret/);
    assert.ok(!existsSync(join(home, ".brief/projects/my-app/decisions/use-jwt-tokens.md")), "resolved item removed after sync");
  });

  it("active writes a summary file for this repo and story", () => {
    brief(repoA, "project", "join", "my-app");
    const result = brief(repoA, "project", "active", "OAuth2 flow", "--story=S-001", "--body=Adding endpoints");
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(home, ".brief/projects/my-app/active/api_s-001.md")));
  });

  it("asks for --project when the repo is in several projects", () => {
    brief(repoA, "project", "join", "one");
    brief(repoA, "project", "join", "two");
    const result = brief(repoA, "project", "share", "memory", "Note");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--project=/);
  });

  it("fails clearly when the repo has no project", () => {
    const result = brief(repoA, "project", "status");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /has not joined a project/);
  });

  it("rejects an unsafe project name", () => {
    const result = brief(repoA, "project", "join", "../evil");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid project name/);
  });
  it("sync writes valid managed records when the repo uses canonical records", () => {
    mkdirSync(join(repoB, ".brief"), { recursive: true });
    writeFileSync(join(repoB, ".brief/records.json"), JSON.stringify({ version: 1, authority: "markdown" }));
    brief(repoA, "project", "join", "my-app");
    brief(repoB, "project", "join", "my-app");
    brief(repoA, "project", "share", "decision", "Use JWT tokens", "--body=first");
    assert.equal(brief(repoB, "project", "sync").status, 0);
    brief(repoA, "project", "share", "decision", "Use JWT tokens", "--body=second");
    const again = brief(repoB, "project", "sync");
    assert.equal(again.status, 0, again.stderr);
    const verify = brief(repoB, "verify-records");
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    const file = join(repoB, "documentation/memory/shared-my-app-use-jwt-tokens.md");
    assert.match(readFileSync(file, "utf8"), /second/);
    assert.match(brief(repoB, "search", "jwt").stdout, /shared-my-app-use-jwt-tokens/);
  });
});
