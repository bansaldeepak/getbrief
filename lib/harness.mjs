import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkers, mergeContent } from "./markers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS_TEMPLATE = join(__dirname, "../templates/HARNESS.md");
const AGENTS_TEMPLATE = join(__dirname, "../templates/project-structure/AGENTS.md");
const PKG = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));
const VERSION = PKG.version;
const IMPORT_RE = /@\.\.\/AGENTS\.md|@AGENTS\.md/;

export function detectHarnessState(projectRoot) {
  if (!existsSync(HARNESS_TEMPLATE)) {
    throw new Error(`HARNESS template not found at ${HARNESS_TEMPLATE}`);
  }

  const agentsMdPath = join(projectRoot, "AGENTS.md");
  const claudeMdPath = join(projectRoot, ".claude", "CLAUDE.md");

  const agentsExists = existsSync(agentsMdPath);
  const claudeExists = existsSync(claudeMdPath);

  let claudeImportsAgents = false;
  if (claudeExists) {
    const content = readFileSync(claudeMdPath, "utf8");
    claudeImportsAgents = IMPORT_RE.test(content);
  }

  let matrixRow;
  const actions = [];

  if (!agentsExists && !claudeExists) {
    matrixRow = 1;
    actions.push("Create AGENTS.md with skeleton + inline HARNESS");
    actions.push("Create CLAUDE.md importing AGENTS.md");
  } else if (agentsExists && !claudeExists) {
    matrixRow = 2;
    actions.push("Add inline HARNESS marker to AGENTS.md");
    actions.push("Create CLAUDE.md importing AGENTS.md");
  } else if (agentsExists && claudeExists && claudeImportsAgents) {
    matrixRow = 3;
    actions.push("Add inline HARNESS marker to AGENTS.md");
  } else if (agentsExists && claudeExists && !claudeImportsAgents) {
    matrixRow = 4;
    actions.push("Add inline HARNESS marker to AGENTS.md");
    actions.push("Migrate CLAUDE.md to import AGENTS.md");
  } else if (!agentsExists && claudeExists && claudeImportsAgents) {
    matrixRow = 5;
    actions.push("Create AGENTS.md with skeleton + inline HARNESS");
  } else {
    // !agentsExists && claudeExists && !claudeImportsAgents
    matrixRow = 6;
    actions.push("Create AGENTS.md with skeleton + inline HARNESS");
    actions.push("Add @../AGENTS.md import to CLAUDE.md");
  }

  return { agentsExists, claudeExists, claudeImportsAgents, matrixRow, actions };
}

export function applyHarness(projectRoot, state) {
  const result = { injected: [], skipped: [] };
  const content = readFileSync(HARNESS_TEMPLATE, "utf8");

  const agentsMdPath = join(projectRoot, "AGENTS.md");
  const claudeMdPath = join(projectRoot, ".claude", "CLAUDE.md");

  switch (state.matrixRow) {
    case 1:
      createAgentsWithHarness(agentsMdPath, content);
      createClaudeWithImport(claudeMdPath);
      result.injected.push("AGENTS.md (created + inline harness)");
      result.injected.push("CLAUDE.md (created, imports AGENTS.md)");
      break;
    case 2:
      injectInlineMarker(agentsMdPath, content);
      createClaudeWithImport(claudeMdPath);
      result.injected.push("AGENTS.md (inline harness)");
      result.injected.push("CLAUDE.md (created, imports AGENTS.md)");
      break;
    case 3:
      injectInlineMarker(agentsMdPath, content);
      result.injected.push("AGENTS.md (inline harness)");
      if (stripHarnessMarker(claudeMdPath)) {
        result.injected.push("CLAUDE.md (stripped stale harness)");
      } else {
        result.skipped.push("CLAUDE.md (inherits via AGENTS.md import)");
      }
      break;
    case 4:
      injectInlineMarker(agentsMdPath, content);
      migrateClaudeToImport(claudeMdPath);
      result.injected.push("AGENTS.md (inline harness)");
      result.injected.push("CLAUDE.md (migrated to import AGENTS.md)");
      break;
    case 5:
      createAgentsWithHarness(agentsMdPath, content);
      result.injected.push("AGENTS.md (created + inline harness)");
      if (stripHarnessMarker(claudeMdPath)) {
        result.injected.push("CLAUDE.md (stripped stale harness)");
      } else {
        result.skipped.push("CLAUDE.md (already imports AGENTS.md)");
      }
      break;
    case 6:
      createAgentsWithHarness(agentsMdPath, content);
      migrateClaudeToImport(claudeMdPath);
      result.injected.push("AGENTS.md (created + inline harness)");
      result.injected.push("CLAUDE.md (migrated to import AGENTS.md)");
      break;
  }

  return result;
}

export { VERSION };

function injectInlineMarker(filePath, content) {
  const existing = readFileSync(filePath, "utf8");
  const sections = parseMarkers(existing);
  const updated = mergeContent(sections, { harness: content }, { version: VERSION });
  atomicWrite(filePath, updated);
}

function createAgentsWithHarness(filePath, content) {
  let skeleton = "";
  if (existsSync(AGENTS_TEMPLATE)) {
    skeleton = readFileSync(AGENTS_TEMPLATE, "utf8") + "\n\n";
  }
  const sections = parseMarkers(skeleton);
  const result = mergeContent(sections, { harness: content }, { version: VERSION });
  mkdirSync(dirname(filePath), { recursive: true });
  atomicWrite(filePath, result);
}

function createClaudeWithImport(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  atomicWrite(filePath, "@../AGENTS.md\n");
}

function rebuildWithoutHarness(filePath) {
  const existing = readFileSync(filePath, "utf8");
  const sections = parseMarkers(existing);
  const hasHarness = sections.some(s => s.type === "auto" && s.id === "harness");
  const kept = sections.filter(s => !(s.type === "auto" && s.id === "harness"));
  const parts = kept.map(s => {
    if (s.type === "manual") return s.content;
    return s.openTag + "\n" + s.content + "\n<!-- /brief:auto -->";
  });
  const rebuilt = parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return { rebuilt, stripped: hasHarness };
}

function stripHarnessMarker(filePath) {
  const { rebuilt, stripped } = rebuildWithoutHarness(filePath);
  if (stripped) {
    atomicWrite(filePath, rebuilt + "\n");
  }
  return stripped;
}

function migrateClaudeToImport(filePath) {
  const { rebuilt } = rebuildWithoutHarness(filePath);
  const suffix = rebuilt ? "\n\n" + rebuilt : "";
  atomicWrite(filePath, "@../AGENTS.md" + suffix + "\n");
}

function atomicWrite(filePath, content) {
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, filePath);
}
