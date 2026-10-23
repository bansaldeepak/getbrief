import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync, lstatSync, existsSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLink, verifyLink, fallbackCopy, removeStale } from "../lib/symlink.mjs";

describe("createLink", () => {
  let tmp;
  let targetDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-symlink-"));
    targetDir = join(tmp, "target");
    mkdirSync(targetDir);
    writeFileSync(join(targetDir, "SKILL.md"), "# Test");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("creates symlink to target directory", () => {
    const linkPath = join(tmp, "link");
    const result = createLink(targetDir, linkPath);
    assert.equal(result.status, "created");
    assert.equal(result.mode, "symlink");
    assert.ok(lstatSync(linkPath).isSymbolicLink());
    assert.equal(readlinkSync(linkPath), targetDir);
  });

  it("returns exists when symlink already points to correct target", () => {
    const linkPath = join(tmp, "link");
    symlinkSync(targetDir, linkPath);
    const result = createLink(targetDir, linkPath);
    assert.equal(result.status, "exists");
    assert.equal(result.mode, "symlink");
  });

  it("preserves an unowned symlink with a different target", () => {
    const linkPath = join(tmp, "link");
    const wrongTarget = join(tmp, "wrong");
    mkdirSync(wrongTarget);
    symlinkSync(wrongTarget, linkPath);

    assert.throws(() => createLink(targetDir, linkPath), /unowned/);
    assert.equal(readlinkSync(linkPath), wrongTarget);
  });

  it("creates parent directories if they do not exist", () => {
    const linkPath = join(tmp, "deep", "nested", "link");
    const result = createLink(targetDir, linkPath);
    assert.equal(result.status, "created");
    assert.ok(existsSync(linkPath));
  });

  it("preserves a regular directory at a requested link destination", () => {
    const linkPath = join(tmp, "link");
    mkdirSync(linkPath);
    writeFileSync(join(linkPath, "old.txt"), "stale");

    assert.throws(() => createLink(targetDir, linkPath), /unowned/);
    assert.ok(lstatSync(linkPath).isDirectory());
    assert.ok(existsSync(join(linkPath, "old.txt")));
  });

  it("is idempotent — second call returns exists", () => {
    const linkPath = join(tmp, "link");
    createLink(targetDir, linkPath);
    const result = createLink(targetDir, linkPath);
    assert.equal(result.status, "exists");
  });
});

describe("verifyLink", () => {
  let tmp;
  let targetDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-symlink-"));
    targetDir = join(tmp, "target");
    mkdirSync(targetDir);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("returns valid:true for correct symlink", () => {
    const linkPath = join(tmp, "link");
    symlinkSync(targetDir, linkPath);
    const result = verifyLink(linkPath, targetDir);
    assert.deepEqual(result, { valid: true });
  });

  it("returns missing for non-existent path", () => {
    const result = verifyLink(join(tmp, "nope"), targetDir);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "missing");
  });

  it("returns not-symlink for regular file", () => {
    const linkPath = join(tmp, "file");
    writeFileSync(linkPath, "hi");
    const result = verifyLink(linkPath, targetDir);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "not-symlink");
  });

  it("returns wrong-target when symlink points elsewhere", () => {
    const linkPath = join(tmp, "link");
    const wrongTarget = join(tmp, "other");
    mkdirSync(wrongTarget);
    symlinkSync(wrongTarget, linkPath);

    const result = verifyLink(linkPath, targetDir);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "wrong-target");
    assert.equal(result.actual, wrongTarget);
    assert.equal(result.expected, targetDir);
  });

  it("returns broken for symlink to non-existent target", () => {
    const linkPath = join(tmp, "link");
    const deadTarget = join(tmp, "dead");
    symlinkSync(deadTarget, linkPath);

    const result = verifyLink(linkPath, deadTarget);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "broken");
    assert.equal(result.target, deadTarget);
  });
});

describe("removeStale", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-symlink-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("removes broken symlink and returns true", () => {
    const linkPath = join(tmp, "broken");
    symlinkSync(join(tmp, "nonexistent"), linkPath);
    const result = removeStale(linkPath);
    assert.equal(result, true);
    assert.ok(!existsSync(linkPath));
  });

  it("leaves valid symlink and returns false", () => {
    const targetDir = join(tmp, "target");
    mkdirSync(targetDir);
    const linkPath = join(tmp, "valid");
    symlinkSync(targetDir, linkPath);

    const result = removeStale(linkPath);
    assert.equal(result, false);
    assert.ok(lstatSync(linkPath).isSymbolicLink());
  });

  it("returns false for non-existent path", () => {
    const result = removeStale(join(tmp, "nope"));
    assert.equal(result, false);
  });
});

describe("fallbackCopy", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-symlink-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("copies directory recursively", () => {
    const source = join(tmp, "source");
    mkdirSync(source);
    writeFileSync(join(source, "a.md"), "content-a");
    mkdirSync(join(source, "sub"));
    writeFileSync(join(source, "sub", "b.md"), "content-b");

    const dest = join(tmp, "dest");
    const result = fallbackCopy(source, dest);
    assert.equal(result.status, "created");
    assert.equal(result.mode, "copy");
    assert.ok(result.warning.includes("copy mode"));
    assert.ok(existsSync(join(dest, "a.md")));
    assert.ok(existsSync(join(dest, "sub", "b.md")));
  });

  it("creates parent directories for dest", () => {
    const source = join(tmp, "source");
    mkdirSync(source);
    writeFileSync(join(source, "file.md"), "x");

    const dest = join(tmp, "deep", "nested", "dest");
    const result = fallbackCopy(source, dest);
    assert.equal(result.status, "created");
    assert.ok(existsSync(join(dest, "file.md")));
  });
});
