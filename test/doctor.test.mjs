import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { runDoctor } from "../lib/doctor.mjs";

const BRIEF_SKILLS_PATH = join(homedir(), ".agents", "brief", "skills", "brief");

function writeManifest(dir, manifest) {
  mkdirSync(join(dir, ".agents"), { recursive: true });
  writeFileSync(join(dir, ".agents", "brief-manifest.json"), JSON.stringify(manifest, null, 2));
}

function setupHealthyProject(dir) {
  const manifest = {
    version: "1.0.0",
    installed_at: "2026-08-25T10:00:00Z",
    mode: "symlink",
    detection: { languages: [], frameworks: [], testing: [], runtime: null, agents: { claude: true, codex: false, gemini: false } },
    symlinks: [
      { source: ".claude/skills/brief", target: BRIEF_SKILLS_PATH, status: "ok" },
      { source: ".agents/skills/brief", target: BRIEF_SKILLS_PATH, status: "ok" },
    ],
    rules_installed: ["coding-style.md"],
  };
  writeManifest(dir, manifest);

  // Create symlinks
  mkdirSync(join(dir, ".claude", "skills"), { recursive: true });
  symlinkSync(BRIEF_SKILLS_PATH, join(dir, ".claude", "skills", "brief"));
  mkdirSync(join(dir, ".agents", "skills"), { recursive: true });
  symlinkSync(BRIEF_SKILLS_PATH, join(dir, ".agents", "skills", "brief"));

  // Create rule file
  mkdirSync(join(dir, ".claude", "rules"), { recursive: true });
  writeFileSync(join(dir, ".claude", "rules", "coding-style.md"), "# Style\n");
}

describe("runDoctor — healthy project", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("returns healthy:true and exitCode:0", () => {
    setupHealthyProject(tmp);
    const result = runDoctor(tmp);
    assert.equal(result.healthy, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.fail, 0);
    assert.ok(result.summary.pass >= 3);
  });

  it("includes manifest, symlink, and rule checks", () => {
    setupHealthyProject(tmp);
    const result = runDoctor(tmp);
    const types = result.checks.map(c => c.type);
    assert.ok(types.includes("manifest"));
    assert.ok(types.includes("symlink"));
    assert.ok(types.includes("rule"));
  });
});

describe("runDoctor — missing manifest", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("returns healthy:false with exitCode:1", () => {
    const result = runDoctor(tmp);
    assert.equal(result.healthy, false);
    assert.equal(result.exitCode, 1);
  });

  it("returns error field in json mode", () => {
    const result = runDoctor(tmp, { json: true });
    assert.equal(result.healthy, false);
    assert.equal(result.error, "manifest-missing");
    assert.ok(result.message.includes("brief init"));
  });
});

describe("runDoctor — corrupt manifest", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("returns manifest-invalid error", () => {
    mkdirSync(join(tmp, ".agents"), { recursive: true });
    writeFileSync(join(tmp, ".agents", "brief-manifest.json"), "not { valid json !!!");
    const result = runDoctor(tmp, { json: true });
    assert.equal(result.healthy, false);
    assert.equal(result.error, "manifest-invalid");
  });
});

describe("runDoctor — broken symlink", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("reports broken symlink with reason", () => {
    const manifest = {
      version: "1.0.0",
      installed_at: "2026-08-25T10:00:00Z",
      mode: "symlink",
      detection: { agents: { claude: true, codex: false, gemini: false } },
      symlinks: [
        { source: ".claude/skills/brief", target: "/nonexistent/path", status: "ok" },
      ],
      rules_installed: [],
    };
    writeManifest(tmp, manifest);
    mkdirSync(join(tmp, ".claude", "skills"), { recursive: true });
    symlinkSync("/nonexistent/path", join(tmp, ".claude", "skills", "brief"));

    const result = runDoctor(tmp);
    assert.equal(result.healthy, false);
    assert.equal(result.exitCode, 1);
    const failedCheck = result.checks.find(c => c.status === "fail" && c.type === "symlink");
    assert.ok(failedCheck);
    assert.equal(failedCheck.reason, "broken");
  });
});

describe("runDoctor — missing rule", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("reports missing rule file", () => {
    const manifest = {
      version: "1.0.0",
      installed_at: "2026-08-25T10:00:00Z",
      mode: "symlink",
      detection: { agents: {} },
      symlinks: [],
      rules_installed: ["backend-standards.md"],
    };
    writeManifest(tmp, manifest);

    const result = runDoctor(tmp);
    assert.equal(result.healthy, false);
    const failedCheck = result.checks.find(c => c.status === "fail" && c.type === "rule");
    assert.ok(failedCheck);
    assert.equal(failedCheck.file, "backend-standards.md");
    assert.equal(failedCheck.reason, "missing");
  });
});

describe("runDoctor — stale copy", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("detects stale copy when source is newer", () => {
    const sourceDir = join(tmp, "source");
    mkdirSync(sourceDir);
    writeFileSync(join(sourceDir, "SKILL.md"), "# New content");

    const copyDir = join(tmp, "project", ".agents", "skills", "brief");
    mkdirSync(copyDir, { recursive: true });
    writeFileSync(join(copyDir, "SKILL.md"), "# Old content");

    // Backdate the copy's file so source is newer
    const pastTime = new Date("2020-01-01");
    utimesSync(join(copyDir, "SKILL.md"), pastTime, pastTime);

    const manifest = {
      version: "1.0.0",
      installed_at: "2026-08-25T10:00:00Z",
      mode: "copy",
      detection: { agents: {} },
      symlinks: [
        { source: ".agents/skills/brief", target: sourceDir, status: "ok" },
      ],
      rules_installed: [],
    };
    const projectDir = join(tmp, "project");
    writeManifest(projectDir, manifest);

    const result = runDoctor(projectDir);
    const staleCheck = result.checks.find(c => c.type === "stale-copy");
    assert.ok(staleCheck);
    assert.equal(staleCheck.reason, "source-newer");
  });
});

describe("runDoctor — json mode", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("result contains healthy, checks, and summary fields", () => {
    setupHealthyProject(tmp);
    const result = runDoctor(tmp, { json: true });
    assert.equal(typeof result.healthy, "boolean");
    assert.ok(Array.isArray(result.checks));
    assert.ok(result.summary);
    assert.equal(typeof result.summary.pass, "number");
    assert.equal(typeof result.summary.fail, "number");
  });
});
