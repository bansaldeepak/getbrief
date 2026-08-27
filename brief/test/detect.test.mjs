import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findAgentDirs, detectStack } from "../lib/detect.mjs";

describe("findAgentDirs", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-detect-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("detects .claude/ directory", () => {
    mkdirSync(join(tmp, ".claude"));
    const result = findAgentDirs(tmp);
    assert.deepEqual(result, { claude: true, codex: false, gemini: false });
  });

  it("returns claude:false when .claude is a file not a directory", () => {
    writeFileSync(join(tmp, ".claude"), "not a dir");
    const result = findAgentDirs(tmp);
    assert.equal(result.claude, false);
  });

  it("detects .codex/ directory", () => {
    mkdirSync(join(tmp, ".codex"));
    const result = findAgentDirs(tmp);
    assert.equal(result.codex, true);
  });

  it("detects AGENTS.md as codex indicator", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents");
    const result = findAgentDirs(tmp);
    assert.equal(result.codex, true);
  });

  it("detects .gemini/ directory", () => {
    mkdirSync(join(tmp, ".gemini"));
    const result = findAgentDirs(tmp);
    assert.equal(result.gemini, true);
  });

  it("detects .agents/rules/ as gemini indicator", () => {
    mkdirSync(join(tmp, ".agents"), { recursive: true });
    mkdirSync(join(tmp, ".agents", "rules"));
    const result = findAgentDirs(tmp);
    assert.equal(result.gemini, true);
  });

  it("returns all false for empty directory", () => {
    const result = findAgentDirs(tmp);
    assert.deepEqual(result, { claude: false, codex: false, gemini: false });
  });

  it("detects multiple agents simultaneously", () => {
    mkdirSync(join(tmp, ".claude"));
    writeFileSync(join(tmp, "AGENTS.md"), "");
    mkdirSync(join(tmp, ".gemini"));
    const result = findAgentDirs(tmp);
    assert.deepEqual(result, { claude: true, codex: true, gemini: true });
  });
});

describe("detectStack", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-detect-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("returns complete DetectionResult structure", () => {
    const result = detectStack(tmp);
    assert.ok(Array.isArray(result.languages));
    assert.ok(Array.isArray(result.frameworks));
    assert.ok(Array.isArray(result.testing));
    assert.equal(typeof result.hasCI, "boolean");
    assert.ok(result.agents && typeof result.agents === "object");
  });

  it("detects frameworks from package.json", () => {
    writeFileSync(join(tmp, "package.json"), JSON.stringify({
      dependencies: { hono: "^4.0.0", prisma: "^5.0.0" },
      devDependencies: { vitest: "^1.0.0" },
    }));
    const result = detectStack(tmp);
    assert.ok(result.frameworks.includes("hono"));
    assert.ok(result.frameworks.includes("prisma"));
    assert.ok(result.testing.includes("vitest"));
  });

  it("handles malformed package.json gracefully", () => {
    writeFileSync(join(tmp, "package.json"), "{ not valid json !!!");
    const result = detectStack(tmp);
    assert.deepEqual(result.frameworks, []);
    assert.deepEqual(result.testing, []);
  });

  it("detects runtime as node when package.json exists", () => {
    writeFileSync(join(tmp, "package.json"), JSON.stringify({ name: "test" }));
    const result = detectStack(tmp);
    assert.equal(result.runtime, "node");
  });

  it("detects runtime as deno when deno.json exists", () => {
    writeFileSync(join(tmp, "deno.json"), "{}");
    const result = detectStack(tmp);
    assert.equal(result.runtime, "deno");
  });

  it("detects runtime as bun when bun.lockb exists", () => {
    writeFileSync(join(tmp, "bun.lockb"), "");
    const result = detectStack(tmp);
    assert.equal(result.runtime, "bun");
  });

  it("detects runtime as python when pyproject.toml exists", () => {
    writeFileSync(join(tmp, "pyproject.toml"), "[project]\nname = 'app'");
    const result = detectStack(tmp);
    assert.equal(result.runtime, "python");
  });

  it("detects runtime as go when go.mod exists", () => {
    writeFileSync(join(tmp, "go.mod"), "module example.com/app\n\ngo 1.21");
    const result = detectStack(tmp);
    assert.equal(result.runtime, "go");
  });

  it("detects runtime as rust when Cargo.toml exists", () => {
    writeFileSync(join(tmp, "Cargo.toml"), "[package]\nname = \"app\"");
    const result = detectStack(tmp);
    assert.equal(result.runtime, "rust");
  });

  it("returns runtime null with no manifest files", () => {
    const result = detectStack(tmp);
    assert.equal(result.runtime, null);
  });

  it("detects CI from .github/workflows/", () => {
    mkdirSync(join(tmp, ".github", "workflows"), { recursive: true });
    const result = detectStack(tmp);
    assert.equal(result.hasCI, true);
  });

  it("detects CI from .gitlab-ci.yml", () => {
    writeFileSync(join(tmp, ".gitlab-ci.yml"), "stages:\n  - test");
    const result = detectStack(tmp);
    assert.equal(result.hasCI, true);
  });

  it("returns hasCI false with no CI config", () => {
    const result = detectStack(tmp);
    assert.equal(result.hasCI, false);
  });

  it("detects languages from file extensions when codegraph unavailable", () => {
    writeFileSync(join(tmp, "index.ts"), "export const x = 1;");
    writeFileSync(join(tmp, "utils.py"), "x = 1");
    const result = detectStack(tmp);
    assert.ok(result.languages.includes("typescript"));
    assert.ok(result.languages.includes("python"));
  });

  it("scans one level of subdirectories for extensions", () => {
    mkdirSync(join(tmp, "src"));
    writeFileSync(join(tmp, "src", "main.rs"), "fn main() {}");
    const result = detectStack(tmp);
    assert.ok(result.languages.includes("rust"));
  });

  it("skips hidden directories in extension scan", () => {
    mkdirSync(join(tmp, ".hidden"));
    writeFileSync(join(tmp, ".hidden", "secret.py"), "");
    const result = detectStack(tmp);
    assert.ok(!result.languages.includes("python"));
  });

  it("detects Cargo.toml frameworks", () => {
    writeFileSync(join(tmp, "Cargo.toml"), '[dependencies]\nactix-web = "4"\ntokio = { version = "1", features = ["full"] }');
    const result = detectStack(tmp);
    assert.ok(result.frameworks.includes("actix-web"));
    assert.ok(result.frameworks.includes("tokio"));
  });

  it("detects go.mod frameworks", () => {
    writeFileSync(join(tmp, "go.mod"), "module app\n\nrequire github.com/gin-gonic/gin v1.9.0");
    const result = detectStack(tmp);
    assert.ok(result.frameworks.includes("gin"));
  });

  it("detects pyproject.toml frameworks and testing", () => {
    writeFileSync(join(tmp, "pyproject.toml"), '[project]\ndependencies = ["fastapi", "pytest"]');
    const result = detectStack(tmp);
    assert.ok(result.frameworks.includes("fastapi"));
    assert.ok(result.testing.includes("pytest"));
  });

  it("detects Gemfile frameworks", () => {
    writeFileSync(join(tmp, "Gemfile"), "source 'https://rubygems.org'\ngem 'rails'");
    const result = detectStack(tmp);
    assert.ok(result.frameworks.includes("rails"));
  });

  it("includes agents in detectStack result", () => {
    mkdirSync(join(tmp, ".claude"));
    const result = detectStack(tmp);
    assert.equal(result.agents.claude, true);
    assert.equal(result.agents.codex, false);
  });

  it("deno takes priority over node for runtime", () => {
    writeFileSync(join(tmp, "deno.json"), "{}");
    writeFileSync(join(tmp, "package.json"), "{}");
    const result = detectStack(tmp);
    assert.equal(result.runtime, "deno");
  });
});
