import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync, existsSync, lstatSync, readlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { initProject } from "../lib/init.mjs";

const __testDirname = dirname(fileURLToPath(import.meta.url));
const BRIEF_SKILLS_PATH = "../../.brief/workflow/skills/brief";
const OLD_CUSTOM_SKILLS = join(homedir(), ".agents", "custom-skills", "brief");

describe("migration — old custom-skills/ symlinks", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-migrate-"));
    execSync("git init", { cwd: tmp, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("removes old brief symlink pointing to custom-skills/", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    symlinkSync(OLD_CUSTOM_SKILLS, join(tmp, ".claude", "skills", "brief"));

    await initProject(tmp, { nonInteractive: true });

    // Old link should be replaced with new one
    const linkPath = join(tmp, ".claude", "skills", "brief");
    assert.ok(lstatSync(linkPath).isSymbolicLink());
    assert.equal(readlinkSync(linkPath), BRIEF_SKILLS_PATH);
  });

  it("removes old sdlc symlink permanently (not recreated)", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    symlinkSync(join(homedir(), ".agents", "custom-skills", "sdlc"), join(tmp, ".claude", "skills", "sdlc"));

    await initProject(tmp, { nonInteractive: true });

    assert.ok(!existsSync(join(tmp, ".claude", "skills", "sdlc")));
  });

  it("removes old project-memory symlink permanently", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    symlinkSync(join(homedir(), ".agents", "custom-skills", "project-memory"), join(tmp, ".claude", "skills", "project-memory"));

    await initProject(tmp, { nonInteractive: true });

    assert.ok(!existsSync(join(tmp, ".claude", "skills", "project-memory")));
  });

  it("leaves non-custom-skills symlinks untouched", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    const otherTarget = join(tmp, "some-other-dir");
    mkdirSync(otherTarget);
    symlinkSync(otherTarget, join(tmp, ".claude", "skills", "other-skill"));

    await initProject(tmp, { nonInteractive: true });

    const linkPath = join(tmp, ".claude", "skills", "other-skill");
    assert.ok(lstatSync(linkPath).isSymbolicLink());
    assert.equal(readlinkSync(linkPath), otherTarget);
  });

  it("handles broken old symlink (target already deleted)", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    // Points to custom-skills path that doesn't exist on disk
    symlinkSync("/nonexistent/.agents/custom-skills/brief", join(tmp, ".claude", "skills", "brief"));

    await initProject(tmp, { nonInteractive: true });

    // Should be replaced with new valid link
    const linkPath = join(tmp, ".claude", "skills", "brief");
    assert.ok(lstatSync(linkPath).isSymbolicLink());
    assert.equal(readlinkSync(linkPath), BRIEF_SKILLS_PATH);
  });

  it("migrates both .claude/skills and .agents/skills old links", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    mkdirSync(join(tmp, ".agents", "skills"), { recursive: true });
    symlinkSync(OLD_CUSTOM_SKILLS, join(tmp, ".claude", "skills", "brief"));
    symlinkSync(OLD_CUSTOM_SKILLS, join(tmp, ".agents", "skills", "brief"));

    await initProject(tmp, { nonInteractive: true });

    assert.equal(readlinkSync(join(tmp, ".claude", "skills", "brief")), BRIEF_SKILLS_PATH);
    assert.equal(readlinkSync(join(tmp, ".agents", "skills", "brief")), BRIEF_SKILLS_PATH);
  });

  it("does nothing when no symlinks exist (fresh project)", async () => {
    const { created } = await initProject(tmp, { nonInteractive: true });
    // Should just create new links normally
    assert.ok(created.includes(".agents/skills/brief"));
  });

  it("is idempotent — second run after migration changes nothing", async () => {
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    symlinkSync(OLD_CUSTOM_SKILLS, join(tmp, ".claude", "skills", "brief"));

    await initProject(tmp, { nonInteractive: true });
    const { skipped } = await initProject(tmp, { nonInteractive: true });

    assert.ok(skipped.includes(".claude/skills/brief"));
    assert.equal(readlinkSync(join(tmp, ".claude", "skills", "brief")), BRIEF_SKILLS_PATH);
  });
});
