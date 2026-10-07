import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectHarnessState, applyHarness, VERSION } from "../lib/harness.mjs";

describe("detectHarnessState", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-harness-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("row 1 — neither file exists → creates AGENTS.md + CLAUDE.md", () => {
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 1);
    assert.equal(state.agentsExists, false);
    assert.ok(state.actions.some(a => a.includes("AGENTS.md")));
    assert.ok(state.actions.some(a => a.includes("CLAUDE.md")));
  });

  it("row 2 — AGENTS.md exists, no CLAUDE.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 2);
    assert.equal(state.agentsExists, true);
    assert.equal(state.claudeExists, false);
  });

  it("row 3 — both exist, CLAUDE.md imports AGENTS.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "@../AGENTS.md\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 3);
    assert.equal(state.claudeImportsAgents, true);
  });

  it("row 4 — both exist, CLAUDE.md does not import AGENTS.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "# My project\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 4);
    assert.equal(state.claudeImportsAgents, false);
  });

  it("row 5 — only CLAUDE.md exists, imports AGENTS.md", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "@../AGENTS.md\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 5);
    assert.equal(state.agentsExists, false);
    assert.equal(state.claudeExists, true);
    assert.equal(state.claudeImportsAgents, true);
    assert.ok(state.actions.some(a => a.includes("AGENTS.md")));
  });

  it("row 6 — only CLAUDE.md exists, does not import AGENTS.md", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "# My project\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 6);
    assert.equal(state.agentsExists, false);
    assert.equal(state.claudeExists, true);
    assert.equal(state.claudeImportsAgents, false);
    assert.ok(state.actions.some(a => a.includes("AGENTS.md")));
    assert.ok(state.actions.some(a => a.includes("import")));
  });

  it("detects @AGENTS.md (without ../) as import", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "@AGENTS.md\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 3);
    assert.equal(state.claudeImportsAgents, true);
  });

  it("does not detect unrelated @ imports as AGENTS.md import", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "@../HARNESS.md\n");
    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 4);
    assert.equal(state.claudeImportsAgents, false);
  });
});

describe("applyHarness", () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "brief-harness-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it("row 1 — neither file exists, creates AGENTS.md + CLAUDE.md", () => {
    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    assert.ok(existsSync(join(tmp, "AGENTS.md")));
    assert.ok(existsSync(join(tmp, ".claude", "CLAUDE.md")));

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("<!-- brief:auto section=\"harness\""));
    assert.ok(agents.includes("# Brief Workflow"));

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.equal(claude, "@../AGENTS.md\n");

    assert.ok(result.injected.length >= 2);
  });

  it("row 2 — adds marker to existing AGENTS.md, creates CLAUDE.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# My Agents\n\nSome content.\n");
    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("# My Agents"));
    assert.ok(agents.includes("<!-- brief:auto section=\"harness\""));

    assert.ok(existsSync(join(tmp, ".claude", "CLAUDE.md")));
    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.equal(claude, "@../AGENTS.md\n");
    assert.ok(result.injected.some(s => s.includes("AGENTS.md")));
  });

  it("row 3 — only injects into AGENTS.md, skips clean CLAUDE.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "@../AGENTS.md\n");

    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("<!-- brief:auto section=\"harness\""));

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.equal(claude, "@../AGENTS.md\n");

    assert.ok(result.skipped.some(s => s.includes("CLAUDE.md")));
  });

  it("row 3 — strips stale harness from CLAUDE.md that already imports", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"),
      "@../AGENTS.md\n\n" +
      `<!-- brief:auto section="harness" version="0.1.0" generated="2026-01-01T00:00:00.000Z" -->\n` +
      "stale harness\n" +
      "<!-- /brief:auto -->\n"
    );

    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 3);
    const result = applyHarness(tmp, state);

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(!claude.includes("stale harness"));
    assert.ok(!claude.includes("brief:auto section=\"harness\""));
    assert.ok(claude.includes("@../AGENTS.md"));

    assert.ok(result.injected.some(s => s.includes("CLAUDE.md") && s.includes("stripped")));
  });

  it("row 4 — injects into AGENTS.md, migrates CLAUDE.md to import", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "# My project\n");

    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("<!-- brief:auto section=\"harness\""));
    assert.ok(agents.includes("# Brief Workflow"));

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(claude.startsWith("@../AGENTS.md\n"));
    assert.ok(claude.includes("# My project"));
    assert.ok(!claude.includes("# Brief Workflow"));

    assert.equal(result.injected.length, 2);
  });

  it("row 4 — strips stale harness from CLAUDE.md during migration", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"),
      "# My project\n\n" +
      `<!-- brief:auto section="harness" version="0.1.0" generated="2026-01-01T00:00:00.000Z" -->\n` +
      "old harness content\n" +
      "<!-- /brief:auto -->\n"
    );

    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(claude.startsWith("@../AGENTS.md\n"));
    assert.ok(claude.includes("# My project"));
    assert.ok(!claude.includes("old harness content"));
    assert.ok(!claude.includes("brief:auto section=\"harness\""));

    assert.equal(result.injected.length, 2);
  });

  it("row 5 — CLAUDE.md imports AGENTS.md, creates AGENTS.md", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "@../AGENTS.md\n");

    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    assert.ok(existsSync(join(tmp, "AGENTS.md")));
    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("<!-- brief:auto section=\"harness\""));
    assert.ok(agents.includes("# Brief Workflow"));

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.equal(claude, "@../AGENTS.md\n");

    assert.ok(result.skipped.some(s => s.includes("CLAUDE.md")));
  });

  it("row 5 — strips stale harness from CLAUDE.md that already imports", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"),
      "@../AGENTS.md\n\n" +
      `<!-- brief:auto section="harness" version="0.1.0" generated="2026-01-01T00:00:00.000Z" -->\n` +
      "stale harness\n" +
      "<!-- /brief:auto -->\n"
    );

    const state = detectHarnessState(tmp);
    assert.equal(state.matrixRow, 5);
    const result = applyHarness(tmp, state);

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(!claude.includes("stale harness"));
    assert.ok(!claude.includes("brief:auto section=\"harness\""));
    assert.ok(claude.includes("@../AGENTS.md"));

    assert.ok(result.injected.some(s => s.includes("CLAUDE.md") && s.includes("stripped")));
  });

  it("row 6 — CLAUDE.md exists without import, creates AGENTS.md + adds import", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "# My project\n");

    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    assert.ok(existsSync(join(tmp, "AGENTS.md")));
    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("<!-- brief:auto section=\"harness\""));
    assert.ok(agents.includes("# Brief Workflow"));

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(claude.startsWith("@../AGENTS.md\n"));
    assert.ok(claude.includes("# My project"));
    assert.ok(!claude.includes("# Brief Workflow"));

    assert.equal(result.injected.length, 2);
  });

  it("row 6 — strips stale harness from CLAUDE.md during migration", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"),
      `<!-- brief:auto section="harness" version="0.1.0" generated="2026-01-01T00:00:00.000Z" -->\n` +
      "old harness\n" +
      "<!-- /brief:auto -->\n"
    );

    const state = detectHarnessState(tmp);
    const result = applyHarness(tmp, state);

    const claude = readFileSync(join(tmp, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(claude.startsWith("@../AGENTS.md\n"));
    assert.ok(!claude.includes("old harness"));
    assert.ok(!claude.includes("brief:auto section=\"harness\""));
  });

  it("markers include version attribute", () => {
    const state = detectHarnessState(tmp);
    applyHarness(tmp, state);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes(`version="${VERSION}"`));
  });

  it("idempotent — running twice produces no duplication", () => {
    const state1 = detectHarnessState(tmp);
    applyHarness(tmp, state1);

    const state2 = detectHarnessState(tmp);
    applyHarness(tmp, state2);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    const markerCount = (agents.match(/<!-- brief:auto section="harness"/g) || []).length;
    assert.equal(markerCount, 1);
  });

  it("idempotent — row 6 then row 3 produces no duplication", () => {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(join(tmp, ".claude", "CLAUDE.md"), "# My project\n");

    const state1 = detectHarnessState(tmp);
    applyHarness(tmp, state1);

    const state2 = detectHarnessState(tmp);
    applyHarness(tmp, state2);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    const markerCount = (agents.match(/<!-- brief:auto section="harness"/g) || []).length;
    assert.equal(markerCount, 1);
  });

  it("AGENTS.md skeleton includes project structure when template exists", () => {
    const state = detectHarnessState(tmp);
    applyHarness(tmp, state);

    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf8");
    assert.ok(agents.includes("# Project Instructions"));
  });
});
