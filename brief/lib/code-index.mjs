import { createRequire } from "node:module";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);

let cachedGraph = null;
let cachedRoot = null;
let cachedMtime = 0;

function loadCodegraph() {
  return require("@colbymchenry/codegraph");
}

export function open(root) {
  const cg = loadCodegraph();
  if (!cg.isInitialized(root)) return null;

  try {
    const dbPath = cg.getDatabasePath(root);
    const mtime = statSync(dbPath).mtimeMs;
    cachedGraph = cg.CodeGraph.openSync(root);
    cachedRoot = root;
    cachedMtime = mtime;
    return cachedGraph;
  } catch {
    return null;
  }
}

export function getHandle(root) {
  const cg = loadCodegraph();
  if (!cg.isInitialized(root)) return null;

  try {
    const dbPath = cg.getDatabasePath(root);
    const currentMtime = statSync(dbPath).mtimeMs;
    if (cachedGraph && cachedRoot === root && cachedMtime === currentMtime) {
      return cachedGraph;
    }
    return open(root);
  } catch {
    return null;
  }
}

export function search(handle, query) {
  if (!handle) return [];
  try {
    const results = handle.searchNodes(query);
    return results.map((r) => ({
      id: r.node.id,
      name: r.node.name,
      kind: r.node.kind,
      file: r.node.filePath,
      line: r.node.startLine,
      signature: r.node.signature || null,
      score: r.score,
    }));
  } catch {
    return [];
  }
}

export function callers(handle, nodeId) {
  if (!handle) return [];
  try {
    const results = handle.getCallers(nodeId);
    return results.map((n) => ({
      id: n.id,
      name: n.name,
      kind: n.kind,
      file: n.filePath,
      line: n.startLine,
    }));
  } catch {
    return [];
  }
}

export function impact(handle, nodeId) {
  if (!handle) return [];
  try {
    const result = handle.getImpactRadius(nodeId);
    if (!result || !result.nodes) return [];
    const nodes = [];
    for (const [, n] of result.nodes) {
      nodes.push({
        id: n.id,
        name: n.name,
        kind: n.kind,
        file: n.filePath,
        line: n.startLine,
      });
    }
    return nodes;
  } catch {
    return [];
  }
}
