import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getHandle,
  search,
  callers as getCallers,
  callees as getCallees,
  impact as getImpact,
  usages as getUsages,
  edges as getEdges,
  getNodeDetail,
} from "../code-index.mjs";
import { searchFiles } from "../search.mjs";

export async function queryCommand(root, args, rawArgs) {
  const query = args.filter((a) => !a.startsWith("--")).join(" ");
  if (!query) {
    console.error("Usage: brief query <query> [--full] [--impact] [--json]");
    process.exit(1);
  }

  const wantFull = rawArgs.includes("--full") || rawArgs.includes("-f");
  const wantImpact = rawArgs.includes("--impact");
  const wantJson = rawArgs.includes("--json");

  const handle = getHandle(root);
  let codeResults = [];
  if (handle) {
    const nodes = search(handle, query);
    codeResults = nodes.map((node) => {
      const result = {
        id: node.id,
        name: node.name,
        file: node.file,
        line: node.line,
        kind: node.kind,
        signature: node.signature,
      };

      result.callers = getCallers(handle, node.id);
      result.callees = getCallees(handle, node.id);

      if (wantImpact || wantFull) {
        result.impact = getImpact(handle, node.id);
      }

      if (wantFull) {
        result.usages = getUsages(handle, node.id);
        result.edges = getEdges(handle, node.id);
        const detail = getNodeDetail(handle, node.id);
        if (detail) {
          result.startLine = detail.startLine;
          result.endLine = detail.endLine;
          result.qualifiedName = detail.qualifiedName;
          result.isExported = detail.isExported;
          result.isAsync = detail.isAsync;
          result.source = readSource(root, detail.file, detail.startLine, detail.endLine);
        }
      }

      return result;
    });
  }

  const docResults = await searchFiles(root, query);

  if (wantJson) {
    console.log(JSON.stringify(buildJsonOutput(codeResults, docResults, wantFull), null, 2));
    return;
  }

  if (wantFull) {
    renderFull(codeResults, docResults);
  } else {
    renderBase(codeResults, docResults, handle);
  }
}

function readSource(root, filePath, startLine, endLine) {
  try {
    const fullPath = join(root, filePath);
    const lines = readFileSync(fullPath, "utf8").split("\n");
    const slice = lines.slice(startLine - 1, endLine);
    return slice.map((l, i) => `${startLine + i}\t${l}`).join("\n");
  } catch {
    return null;
  }
}

function renderBase(codeResults, docResults, handle) {
  if (codeResults.length > 0) {
    console.log("## Code\n");
    for (const r of codeResults) {
      const sig = r.signature ? ` ${r.signature}` : "";
      console.log(`  ${r.name}${sig} (${r.kind}) — ${r.file}:${r.line}`);

      if (r.callees.length > 0) {
        console.log("    calls:");
        for (const c of r.callees) {
          console.log(`      → ${c.name} (${c.file}:${c.line})`);
        }
      }

      if (r.callers.length > 0) {
        console.log("    callers:");
        for (const c of r.callers) {
          console.log(`      ← ${c.name} (${c.file}:${c.line})`);
        }
      } else {
        console.log("    callers: none");
      }

      if (r.impact) {
        console.log("    impact:");
        for (const i of r.impact) {
          console.log(`      ⚡ ${i.name} (${i.file}:${i.line})`);
        }
      }

      console.log("");
    }
  } else if (handle) {
    console.log("## Code\n\n  No matches.\n");
  }

  if (docResults.length > 0) {
    console.log("## Docs\n");
    for (const d of docResults) {
      console.log(`  ${d.file} — ${d.brief}`);
    }
  } else {
    console.log("\n## Docs\n\n  No matches.\n");
  }
}

function renderFull(codeResults, docResults) {
  if (codeResults.length === 0) {
    console.log("## Code\n\n  No matches.\n");
  } else {
    console.log(`**Exploration: ${codeResults[0].name}**\n`);
    console.log(`Found ${codeResults.length} symbols.\n`);

    const withCallers = codeResults.filter((r) => r.callers.length > 0);
    if (withCallers.length > 0) {
      console.log("**Blast radius — what depends on these**\n");
      for (const r of withCallers) {
        console.log(`- \`${r.name}\` (${r.file}:${r.line}) — ${r.callers.length} callers`);
      }
      console.log("");
    }

    console.log("**Relationships**\n");
    const allCalls = [];
    const allRefs = [];
    const allOther = [];

    for (const r of codeResults) {
      if (r.edges) {
        for (const e of r.edges.outgoing) {
          const target = e.target.name || e.target.id;
          if (e.kind === "calls") allCalls.push(`${r.name} → ${target}`);
          else if (e.kind === "references") allRefs.push(`${r.name} → ${target}`);
          else if (e.kind !== "contains") allOther.push(`${r.name} -[${e.kind}]→ ${target}`);
        }
        for (const e of r.edges.incoming) {
          const source = e.source.name || e.source.id;
          if (e.kind === "calls") allCalls.push(`${source} → ${r.name}`);
          else if (e.kind === "references" || e.kind === "imports") allRefs.push(`${source} → ${r.name}`);
          else if (e.kind !== "contains") allOther.push(`${source} -[${e.kind}]→ ${r.name}`);
        }
      }
    }

    if (allCalls.length > 0) {
      console.log("**calls:**");
      for (const c of allCalls) console.log(`- ${c}`);
      console.log("");
    }
    if (allRefs.length > 0) {
      console.log("**references:**");
      for (const c of allRefs) console.log(`- ${c}`);
      console.log("");
    }
    if (allOther.length > 0) {
      console.log("**other:**");
      for (const c of allOther) console.log(`- ${c}`);
      console.log("");
    }

    for (const r of codeResults) {
      if (r.usages && r.usages.length > 0) {
        console.log(`**Usages of \`${r.name}\`:** ${r.usages.length}`);
        for (const u of r.usages) {
          console.log(`  ${u.edgeKind} in ${u.name} (${u.file})`);
        }
        console.log("");
      }
    }

    console.log("**Source Code**\n");
    for (const r of codeResults) {
      if (r.source) {
        const exported = r.isExported ? "exported " : "";
        const async = r.isAsync ? "async " : "";
        console.log(`\`${r.file}\` — ${exported}${async}${r.qualifiedName || r.name}(${r.kind})\n`);
        console.log("```");
        console.log(r.source);
        console.log("```\n");
      }
    }
  }

  if (docResults.length > 0) {
    console.log("## Docs\n");
    for (const d of docResults) {
      console.log(`  ${d.file} — ${d.brief}`);
    }
  }
}

function buildJsonOutput(codeResults, docResults, full) {
  return {
    code: codeResults.map((r) => ({
      name: r.name,
      qualifiedName: r.qualifiedName || undefined,
      file: r.file,
      line: r.line,
      kind: r.kind,
      signature: r.signature || undefined,
      isExported: r.isExported || undefined,
      isAsync: r.isAsync || undefined,
      callers: r.callers.map((c) => ({ name: c.name, file: c.file, line: c.line })),
      callees: r.callees.map((c) => ({ name: c.name, file: c.file, line: c.line })),
      ...(r.impact && { impact: r.impact.map((i) => ({ name: i.name, file: i.file, line: i.line })) }),
      ...(full && r.usages && { usages: r.usages.map((u) => ({ name: u.name, file: u.file, edgeKind: u.edgeKind })) }),
      ...(full && r.edges && {
        edges: {
          outgoing: r.edges.outgoing.map((e) => ({ kind: e.kind, target: e.target.name || e.target.id })),
          incoming: r.edges.incoming.map((e) => ({ kind: e.kind, source: e.source.name || e.source.id })),
        },
      }),
      ...(full && r.source && { source: r.source }),
    })),
    docs: docResults.map((d) => ({
      file: d.file,
      type: d.type || "unknown",
      id: d.id || undefined,
      brief: d.brief || "",
    })),
  };
}
