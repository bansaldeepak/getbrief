import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateRuleSkeletons, MARKER_OPEN, MARKER_CLOSE } from "../lib/rules-gen.mjs";

const SAMPLE_RULES = [
  { id: "coding-style", name: "Coding Style", file: "coding-style.md", paths: [] },
  { id: "backend-standards", name: "Backend Standards", file: "backend-standards.md", paths: ["**/server/**", "**/api/**"] },
];

describe("generateRuleSkeletons — Claude", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-rulesgen-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("creates file with frontmatter + markers when new", () => {
    const detection = { agents: { claude: true, codex: false, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);
    assert.equal(results.claude.length, 2);
    assert.equal(results.claude[0].action, "created");

    const content = readFileSync(join(tmp, ".claude", "rules", "coding-style.md"), "utf8");
    assert.ok(content.startsWith("---\n"));
    assert.ok(content.includes("paths:"));
    assert.ok(content.includes("brief:auto"));
    assert.ok(content.includes(MARKER_CLOSE));
  });

  it("uses specific paths from rule when available", () => {
    const detection = { agents: { claude: true, codex: false, gemini: false } };
    generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    const content = readFileSync(join(tmp, ".claude", "rules", "backend-standards.md"), "utf8");
    assert.ok(content.includes('"**/server/**"'));
    assert.ok(content.includes('"**/api/**"'));
  });

  it("uses wildcard path when rule has no specific paths", () => {
    const detection = { agents: { claude: true, codex: false, gemini: false } };
    generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    const content = readFileSync(join(tmp, ".claude", "rules", "coding-style.md"), "utf8");
    assert.ok(content.includes('"**/*"'));
  });

  it("appends markers to existing file without them", () => {
    mkdirSync(join(tmp, ".claude", "rules"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "rules", "coding-style.md"), "# My custom rules\n\nBe nice.\n");

    const detection = { agents: { claude: true, codex: false, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    const appended = results.claude.find(r => r.file === "coding-style.md");
    assert.equal(appended.action, "appended-markers");

    const content = readFileSync(join(tmp, ".claude", "rules", "coding-style.md"), "utf8");
    assert.ok(content.startsWith("# My custom rules"));
    assert.ok(content.includes("brief:auto"));
  });

  it("skips when markers already present", () => {
    mkdirSync(join(tmp, ".claude", "rules"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "rules", "coding-style.md"), "<!-- brief:auto section=\"coding-style\" -->\nstuff\n<!-- /brief:auto -->\n");

    const detection = { agents: { claude: true, codex: false, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    const skipped = results.claude.find(r => r.file === "coding-style.md");
    assert.equal(skipped, undefined);
  });
});

describe("generateRuleSkeletons — Codex", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-rulesgen-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("appends section to existing AGENTS.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Project Agents\n\nExisting content.\n");
    const detection = { agents: { claude: false, codex: true, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    assert.equal(results.codex[0].action, "appended");
    const content = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(content.includes("# Project Agents"));
    assert.ok(content.includes("brief:auto"));
    assert.ok(content.includes("Coding Conventions (managed by brief)"));
  });

  it("creates AGENTS.md when it does not exist", () => {
    const detection = { agents: { claude: false, codex: true, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);
    assert.equal(results.codex[0].action, "appended");
    assert.ok(existsSync(join(tmp, "AGENTS.md")));
  });

  it("skips when AGENTS.md exceeds 30KB", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "x".repeat(31 * 1024));
    const detection = { agents: { claude: false, codex: true, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);
    assert.equal(results.codex[0].action, "skipped-size-cap");
  });

  it("skips when markers already exist", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n\n<!-- brief:auto section=\"conventions\" -->\nstuff\n<!-- /brief:auto -->\n");
    const detection = { agents: { claude: false, codex: true, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);
    assert.equal(results.codex[0].action, "already-has-markers");
  });
});

describe("generateRuleSkeletons — Gemini", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-rulesgen-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("creates plain markdown with markers (no frontmatter)", () => {
    const detection = { agents: { claude: false, codex: false, gemini: true } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    assert.equal(results.gemini.length, 2);
    assert.equal(results.gemini[0].action, "created");

    const content = readFileSync(join(tmp, ".agents", "rules", "coding-style.md"), "utf8");
    assert.ok(!content.startsWith("---"));
    assert.ok(content.includes("brief:auto"));
    assert.ok(content.includes("Generated: Coding Style"));
  });

  it("appends markers to existing Gemini rule file", () => {
    mkdirSync(join(tmp, ".agents", "rules"), { recursive: true });
    writeFileSync(join(tmp, ".agents", "rules", "coding-style.md"), "# Existing Gemini rule\n");

    const detection = { agents: { claude: false, codex: false, gemini: true } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);

    const appended = results.gemini.find(r => r.file === "coding-style.md");
    assert.equal(appended.action, "appended-markers");
  });
});

describe("generateRuleSkeletons — agent filtering", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-rulesgen-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("only generates for detected agents", () => {
    const detection = { agents: { claude: false, codex: false, gemini: false } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);
    assert.deepEqual(results.claude, []);
    assert.deepEqual(results.codex, []);
    assert.deepEqual(results.gemini, []);
    assert.ok(!existsSync(join(tmp, ".claude", "rules")));
    assert.ok(!existsSync(join(tmp, ".agents", "rules")));
  });

  it("generates for all agents when all detected", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    const detection = { agents: { claude: true, codex: true, gemini: true } };
    const results = generateRuleSkeletons(tmp, detection, SAMPLE_RULES);
    assert.ok(results.claude.length > 0);
    assert.ok(results.codex.length > 0);
    assert.ok(results.gemini.length > 0);
  });
});
