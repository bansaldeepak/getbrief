import { getHandle, search, callers as getCallers, impact as getImpact } from "../code-index.mjs";
import { searchFiles } from "../search.mjs";

const DISPLAY_CAP = 10;

export async function queryCommand(root, args, rawArgs) {
  const query = args.filter((a) => !a.startsWith("--")).join(" ");
  if (!query) {
    console.error("Usage: brief query <query> [--callers] [--impact] [--json]");
    process.exit(1);
  }

  const wantCallers = rawArgs.includes("--callers");
  const wantImpact = rawArgs.includes("--impact");
  const wantJson = rawArgs.includes("--json");

  const handle = getHandle(root);
  let codeResults = [];
  if (handle) {
    const nodes = search(handle, query);
    codeResults = nodes.map((node) => {
      const result = { name: node.name, file: node.file, line: node.line, kind: node.kind };
      if (wantCallers) result.callers = getCallers(handle, node.id);
      if (wantImpact) result.impact = getImpact(handle, node.id);
      return result;
    });
  }

  const docResults = await searchFiles(root, query);

  if (wantJson) {
    const output = {
      code: codeResults.map((r) => ({
        name: r.name,
        file: r.file,
        line: r.line,
        kind: r.kind,
        ...(r.callers && { callers: r.callers.map((c) => ({ name: c.name, file: c.file, line: c.line })) }),
        ...(r.impact && { impact: r.impact.map((i) => ({ name: i.name, file: i.file, line: i.line })) }),
      })),
      docs: docResults.map((d) => ({
        file: d.file,
        type: d.type || "unknown",
        id: d.id || undefined,
        brief: d.brief || "",
      })),
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (codeResults.length > 0) {
    console.log("## Code\n");
    for (const r of codeResults) {
      console.log(`  ${r.name} (${r.kind}) — ${r.file}:${r.line}`);
      if (r.callers) {
        const display = r.callers.slice(0, DISPLAY_CAP);
        for (const c of display) {
          console.log(`    ← ${c.name} (${c.file}:${c.line})`);
        }
        if (r.callers.length > DISPLAY_CAP) {
          console.log(`    … ${r.callers.length - DISPLAY_CAP} more omitted`);
        }
      }
      if (r.impact) {
        const display = r.impact.slice(0, DISPLAY_CAP);
        for (const i of display) {
          console.log(`    → ${i.name} (${i.file}:${i.line})`);
        }
        if (r.impact.length > DISPLAY_CAP) {
          console.log(`    … ${r.impact.length - DISPLAY_CAP} more omitted`);
        }
      }
    }
  } else if (handle) {
    console.log("## Code\n\n  No matches.\n");
  }

  if (docResults.length > 0) {
    console.log("\n## Docs\n");
    for (const d of docResults) {
      console.log(`  ${d.file} — ${d.brief}`);
    }
  } else {
    console.log("\n## Docs\n\n  No matches.\n");
  }
}
