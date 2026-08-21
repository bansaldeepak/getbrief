import { createRequire } from "node:module";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);

let cachedGraph = null;
let cachedRoot = null;
let cachedMtime = 0;

function warn(label, err) {
  process.stderr.write(`[code-index] ${label}: ${err.message}\n`);
}

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
  } catch (e) {
    warn("open", e);
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
  } catch (e) {
    warn("getHandle", e);
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
  } catch (e) {
    warn("search", e);
    return [];
  }
}

export function callers(handle, nodeId) {
  if (!handle) return [];
  try {
    const results = handle.getCallers(nodeId);
    return results.map((r) => ({
      id: r.node.id,
      name: r.node.name,
      kind: r.node.kind,
      file: r.node.filePath,
      line: r.node.startLine,
    }));
  } catch (e) {
    warn("callers", e);
    return [];
  }
}

export function nodesInPath(handle, pathPrefix) {
  if (!handle) return [];
  try {
    const files = handle.getFiles();
    const matching = files.filter((f) => f.path.startsWith(pathPrefix));
    const nodes = [];
    for (const file of matching) {
      const fileNodes = handle.getNodesInFile(file.path);
      for (const n of fileNodes) {
        nodes.push({ name: n.name, file: n.filePath });
      }
    }
    return nodes;
  } catch (e) {
    warn("nodesInPath", e);
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
  } catch (e) {
    warn("impact", e);
    return [];
  }
}

export function callees(handle, nodeId) {
  if (!handle) return [];
  try {
    const results = handle.getCallees(nodeId);
    return results.map((r) => ({
      id: r.node.id,
      name: r.node.name,
      kind: r.node.kind,
      file: r.node.filePath,
      line: r.node.startLine,
    }));
  } catch (e) {
    warn("callees", e);
    return [];
  }
}

export function usages(handle, nodeId) {
  if (!handle) return [];
  try {
    const results = handle.findUsages(nodeId);
    return results.map((r) => ({
      id: r.node.id,
      name: r.node.name,
      kind: r.node.kind,
      file: r.node.filePath,
      line: r.node.startLine,
      edgeKind: r.edge?.kind || "unknown",
    }));
  } catch (e) {
    warn("usages", e);
    return [];
  }
}

export function edges(handle, nodeId) {
  if (!handle) return { outgoing: [], incoming: [] };
  try {
    const outRaw = handle.getOutgoingEdges(nodeId);
    const inRaw = handle.getIncomingEdges(nodeId);

    const resolveNode = (id) => {
      try {
        const n = handle.getNode(id);
        return n ? { id: n.id, name: n.name, kind: n.kind, file: n.filePath, line: n.startLine } : { id };
      } catch {
        return { id };
      }
    };

    const outgoing = outRaw.map((e) => ({
      kind: e.kind,
      target: resolveNode(e.target),
      line: e.line || null,
    }));

    const incoming = inRaw.map((e) => ({
      kind: e.kind,
      source: resolveNode(e.source),
      line: e.line || null,
    }));

    return { outgoing, incoming };
  } catch (e) {
    warn("edges", e);
    return { outgoing: [], incoming: [] };
  }
}

export function getNodeDetail(handle, nodeId) {
  if (!handle) return null;
  try {
    const n = handle.getNode(nodeId);
    if (!n) return null;
    return {
      id: n.id,
      name: n.name,
      qualifiedName: n.qualifiedName,
      kind: n.kind,
      file: n.filePath,
      startLine: n.startLine,
      endLine: n.endLine,
      signature: n.signature || null,
      isExported: n.isExported || false,
      isAsync: n.isAsync || false,
      docstring: n.docstring || null,
    };
  } catch (e) {
    warn("getNodeDetail", e);
    return null;
  }
}
