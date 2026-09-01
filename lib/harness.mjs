import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkers, mergeContent } from "./markers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS_TEMPLATE = join(__dirname, "../templates/HARNESS.md");
const AGENTS_TEMPLATE = join(__dirname, "../templates/project-structure/AGENTS.md");
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
    actions.push("Create CLAUDE.md with @../.brief/HARNESS.md import marker");
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
    actions.push("Add @../.brief/HARNESS.md import marker to CLAUDE.md");
  } else {
    matrixRow = 5;
    actions.push("Add @../.brief/HARNESS.md import marker to CLAUDE.md");
  }

  actions.unshift("Copy .brief/HARNESS.md");

  return { agentsExists, claudeExists, claudeImportsAgents, matrixRow, actions };
}

export function applyHarness(projectRoot, state) {
  const result = { copied: [], injected: [], skipped: [] };
  const harnessContent = readFileSync(HARNESS_TEMPLATE, "utf8");

  copyHarnessFile(projectRoot, harnessContent);
  result.copied.push(".brief/HARNESS.md");

  const agentsMdPath = join(projectRoot, "AGENTS.md");
  const claudeMdPath = join(projectRoot, ".claude", "CLAUDE.md");

  switch (state.matrixRow) {
    case 1:
      createAgentsWithHarness(agentsMdPath, harnessContent);
      createClaudeWithImport(claudeMdPath);
      result.injected.push("AGENTS.md (created + inline)");
      result.injected.push("CLAUDE.md (created, imports AGENTS.md)");
      break;
    case 2:
      injectInlineMarker(agentsMdPath, harnessContent);
      createClaudeWithImport(claudeMdPath);
      result.injected.push("AGENTS.md (inline marker)");
      result.injected.push("CLAUDE.md (created, imports AGENTS.md)");
      break;
    case 3:
      injectInlineMarker(agentsMdPath, harnessContent);
      result.injected.push("AGENTS.md (inline marker)");
      result.skipped.push("CLAUDE.md (inherits via AGENTS.md import)");
      break;
    case 4:
      injectInlineMarker(agentsMdPath, harnessContent);
      injectImportMarker(claudeMdPath);
      result.injected.push("AGENTS.md (inline marker)");
      result.injected.push("CLAUDE.md (import marker)");
      break;
    case 5:
      if (state.claudeExists) {
        injectImportMarker(claudeMdPath);
      } else {
        createClaudeWithHarnessImport(claudeMdPath);
      }
      result.injected.push("CLAUDE.md (import marker)");
      break;
  }

  return result;
}

function copyHarnessFile(projectRoot, content) {
  const briefDir = join(projectRoot, ".brief");
  mkdirSync(briefDir, { recursive: true });
  atomicWrite(join(briefDir, "HARNESS.md"), content);
}

function injectInlineMarker(filePath, harnessContent) {
  const existing = readFileSync(filePath, "utf8");
  const sections = parseMarkers(existing);
  const updated = mergeContent(sections, { harness: "## Brief Workflow\n\n" + harnessContent });
  atomicWrite(filePath, updated);
}

function injectImportMarker(filePath) {
  const existing = readFileSync(filePath, "utf8");
  const sections = parseMarkers(existing);
  const updated = mergeContent(sections, { harness: "@../.brief/HARNESS.md" });
  atomicWrite(filePath, updated);
}

function createAgentsWithHarness(filePath, harnessContent) {
  let skeleton = "";
  if (existsSync(AGENTS_TEMPLATE)) {
    skeleton = readFileSync(AGENTS_TEMPLATE, "utf8") + "\n\n";
  }
  const sections = parseMarkers(skeleton);
  const content = mergeContent(sections, { harness: "## Brief Workflow\n\n" + harnessContent });
  mkdirSync(dirname(filePath), { recursive: true });
  atomicWrite(filePath, content);
}

function createClaudeWithImport(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  atomicWrite(filePath, "@../AGENTS.md\n");
}

function createClaudeWithHarnessImport(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  const sections = parseMarkers("");
  const content = mergeContent(sections, { harness: "@../.brief/HARNESS.md" });
  atomicWrite(filePath, content);
}

function atomicWrite(filePath, content) {
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, filePath);
}
