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

export function detectHarnessState(projectRoot, { codexDetected = false } = {}) {
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

  if (!agentsExists && !claudeExists && codexDetected) {
    matrixRow = 1;
    actions.push("Create AGENTS.md with skeleton + inline HARNESS");
    actions.push("Create CLAUDE.md importing AGENTS.md");
  } else if (!agentsExists && !claudeExists && !codexDetected) {
    matrixRow = 5;
    actions.push("Create CLAUDE.md with inline HARNESS");
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
    actions.push("Add inline HARNESS marker to CLAUDE.md");
  } else {
    matrixRow = 5;
    actions.push("Add inline HARNESS marker to CLAUDE.md");
  }

  return { agentsExists, claudeExists, claudeImportsAgents, matrixRow, actions };
}

export function applyHarness(projectRoot, state) {
  const result = { copied: [], injected: [], skipped: [] };
  const harnessContent = readFileSync(HARNESS_TEMPLATE, "utf8");
  const inlineContent = harnessContent;

  const agentsMdPath = join(projectRoot, "AGENTS.md");
  const claudeMdPath = join(projectRoot, ".claude", "CLAUDE.md");

  switch (state.matrixRow) {
    case 1:
      createAgentsWithHarness(agentsMdPath, inlineContent);
      createClaudeWithImport(claudeMdPath);
      result.injected.push("AGENTS.md (created + inline harness)");
      result.injected.push("CLAUDE.md (created, imports AGENTS.md)");
      break;
    case 2:
      injectInlineMarker(agentsMdPath, inlineContent);
      createClaudeWithImport(claudeMdPath);
      result.injected.push("AGENTS.md (inline harness)");
      result.injected.push("CLAUDE.md (created, imports AGENTS.md)");
      break;
    case 3:
      injectInlineMarker(agentsMdPath, inlineContent);
      result.injected.push("AGENTS.md (inline harness)");
      result.skipped.push("CLAUDE.md (inherits via AGENTS.md import)");
      break;
    case 4:
      injectInlineMarker(agentsMdPath, inlineContent);
      injectInlineMarker(claudeMdPath, inlineContent);
      result.injected.push("AGENTS.md (inline harness)");
      result.injected.push("CLAUDE.md (inline harness)");
      break;
    case 5:
      if (state.claudeExists) {
        injectInlineMarker(claudeMdPath, inlineContent);
      } else {
        createClaudeWithInlineHarness(claudeMdPath, inlineContent);
      }
      result.injected.push("CLAUDE.md (inline harness)");
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

function createClaudeWithInlineHarness(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  const sections = parseMarkers("");
  const result = mergeContent(sections, { harness: content }, { version: VERSION });
  atomicWrite(filePath, result);
}

function atomicWrite(filePath, content) {
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, filePath);
}
