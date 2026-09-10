import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMarkers, mergeContent } from "../lib/markers.mjs";

describe("parseMarkers", () => {
  it("parses file with one auto section", () => {
    const content = [
      "# Header",
      "",
      '<!-- brief:auto section="conventions" generated="2026-01-01T00:00:00Z" -->',
      "## Conventions",
      "",
      "Use ESM imports.",
      "",
      "<!-- /brief:auto -->",
      "",
      "# Footer",
    ].join("\n");

    const sections = parseMarkers(content);
    assert.equal(sections.length, 3);
    assert.equal(sections[0].type, "manual");
    assert.ok(sections[0].content.includes("# Header"));
    assert.equal(sections[1].type, "auto");
    assert.equal(sections[1].id, "conventions");
    assert.ok(sections[1].content.includes("Use ESM imports."));
    assert.equal(sections[2].type, "manual");
    assert.ok(sections[2].content.includes("# Footer"));
  });

  it("parses file with multiple auto sections", () => {
    const content = [
      "Manual top",
      '<!-- brief:auto section="naming" -->',
      "camelCase",
      "<!-- /brief:auto -->",
      "Manual middle",
      '<!-- brief:auto section="testing" -->',
      "vitest",
      "<!-- /brief:auto -->",
      "Manual bottom",
    ].join("\n");

    const sections = parseMarkers(content);
    assert.equal(sections.length, 5);
    assert.equal(sections[0].type, "manual");
    assert.equal(sections[1].type, "auto");
    assert.equal(sections[1].id, "naming");
    assert.equal(sections[2].type, "manual");
    assert.equal(sections[3].type, "auto");
    assert.equal(sections[3].id, "testing");
    assert.equal(sections[4].type, "manual");
  });

  it("parses file with no markers as single manual section", () => {
    const content = "# Just a normal file\n\nNo markers here.\n";
    const sections = parseMarkers(content);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].type, "manual");
    assert.equal(sections[0].content, content);
  });

  it("handles empty content between markers", () => {
    const content = [
      '<!-- brief:auto section="empty" -->',
      "<!-- /brief:auto -->",
    ].join("\n");

    const sections = parseMarkers(content);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].type, "auto");
    assert.equal(sections[0].id, "empty");
    assert.equal(sections[0].content, "");
  });

  it("ignores markers inside code blocks", () => {
    const content = [
      "# Doc",
      "```markdown",
      '<!-- brief:auto section="fake" -->',
      "This is just an example",
      "<!-- /brief:auto -->",
      "```",
      "End of doc",
    ].join("\n");

    const sections = parseMarkers(content);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].type, "manual");
    assert.ok(sections[0].content.includes("fake"));
  });

  it("throws on nested markers", () => {
    const content = [
      '<!-- brief:auto section="outer" -->',
      "content",
      '<!-- brief:auto section="inner" -->',
      "nested",
      "<!-- /brief:auto -->",
      "<!-- /brief:auto -->",
    ].join("\n");

    assert.throws(() => parseMarkers(content), /Nested marker at line 3/);
  });

  it("throws on unclosed marker", () => {
    const content = [
      '<!-- brief:auto section="open" -->',
      "content without close",
    ].join("\n");

    assert.throws(() => parseMarkers(content), /Unclosed marker for section "open" starting at line 1/);
  });

  it("parses markers with version attribute", () => {
    const content = [
      '<!-- brief:auto section="harness" version="0.2.0" generated="2026-01-01T00:00:00Z" -->',
      "## Brief Workflow",
      "<!-- /brief:auto -->",
    ].join("\n");

    const sections = parseMarkers(content);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].type, "auto");
    assert.equal(sections[0].id, "harness");
    assert.ok(sections[0].content.includes("## Brief Workflow"));
  });

  it("handles duplicate section IDs (both parsed)", () => {
    const content = [
      '<!-- brief:auto section="dup" -->',
      "first",
      "<!-- /brief:auto -->",
      '<!-- brief:auto section="dup" -->',
      "second",
      "<!-- /brief:auto -->",
    ].join("\n");

    const sections = parseMarkers(content);
    const autos = sections.filter(s => s.type === "auto");
    assert.equal(autos.length, 2);
    assert.equal(autos[0].content, "first");
    assert.equal(autos[1].content, "second");
  });
});

describe("mergeContent", () => {
  it("replaces auto content and preserves manual", () => {
    const sections = [
      { type: "manual", content: "# Header" },
      { type: "auto", id: "conventions", content: "old stuff" },
      { type: "manual", content: "# Footer" },
    ];

    const result = mergeContent(sections, { conventions: "new stuff" });
    assert.ok(result.includes("# Header"));
    assert.ok(result.includes("new stuff"));
    assert.ok(!result.includes("old stuff"));
    assert.ok(result.includes("# Footer"));
    assert.ok(result.includes('section="conventions"'));
  });

  it("keeps existing auto content when no new content provided", () => {
    const sections = [
      { type: "auto", id: "keep-me", content: "existing content" },
    ];

    const result = mergeContent(sections, {});
    assert.ok(result.includes("existing content"));
  });

  it("appends new sections not in existing", () => {
    const sections = [
      { type: "manual", content: "# Doc" },
    ];

    const result = mergeContent(sections, { "new-section": "brand new" });
    assert.ok(result.includes("# Doc"));
    assert.ok(result.includes("brand new"));
    assert.ok(result.includes('section="new-section"'));
  });

  it("updates timestamp in generated attribute", () => {
    const sections = [
      { type: "auto", id: "test", content: "content" },
    ];

    const result = mergeContent(sections, { test: "updated" });
    assert.ok(result.includes("generated="));
    assert.match(result, /generated="\d{4}-\d{2}-\d{2}T/);
  });

  it("includes version attribute when provided", () => {
    const sections = [
      { type: "auto", id: "test", content: "content" },
    ];

    const result = mergeContent(sections, { test: "updated" }, { version: "1.2.3" });
    assert.ok(result.includes('version="1.2.3"'));
  });

  it("omits version attribute when not provided", () => {
    const sections = [
      { type: "auto", id: "test", content: "content" },
    ];

    const result = mergeContent(sections, { test: "updated" });
    assert.ok(!result.includes("version="));
  });

  it("preserves original timestamp when content unchanged", () => {
    const originalTag = '<!-- brief:auto section="test" version="0.2.0" generated="2026-01-01T00:00:00.000Z" -->';
    const sections = [
      { type: "auto", id: "test", content: "same content", openTag: originalTag },
    ];

    const result = mergeContent(sections, { test: "same content" }, { version: "0.2.0" });
    assert.ok(result.includes('generated="2026-01-01T00:00:00.000Z"'));
  });

  it("updates timestamp when content changes", () => {
    const originalTag = '<!-- brief:auto section="test" version="0.2.0" generated="2026-01-01T00:00:00.000Z" -->';
    const sections = [
      { type: "auto", id: "test", content: "old content", openTag: originalTag },
    ];

    const result = mergeContent(sections, { test: "new content" }, { version: "0.2.0" });
    assert.ok(!result.includes('generated="2026-01-01T00:00:00.000Z"'));
    assert.match(result, /generated="\d{4}-\d{2}-\d{2}T/);
  });

  it("handles mix of replace, keep, and append", () => {
    const sections = [
      { type: "manual", content: "# Top" },
      { type: "auto", id: "replace-me", content: "old" },
      { type: "manual", content: "# Middle" },
      { type: "auto", id: "keep-me", content: "stays" },
      { type: "manual", content: "# Bottom" },
    ];

    const result = mergeContent(sections, {
      "replace-me": "new content",
      "appended": "extra section",
    });

    assert.ok(result.includes("# Top"));
    assert.ok(result.includes("new content"));
    assert.ok(!result.includes('"old"'));
    assert.ok(result.includes("# Middle"));
    assert.ok(result.includes("stays"));
    assert.ok(result.includes("# Bottom"));
    assert.ok(result.includes("extra section"));
  });
});
