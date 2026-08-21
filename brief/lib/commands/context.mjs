import { graduate, list, searchContext } from "../context.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function contextCommand(root, args, rawArgs) {
  const subcommand = args[0];

  if (subcommand === "graduate") {
    if (process.stdin.isTTY) {
      console.error("Error: body must be piped via stdin.");
      console.error('Usage: echo "body" | brief context graduate "title" [--source=origin]');
      process.exit(1);
    }

    const title = args[1];
    if (!title) {
      console.error('Usage: echo "body" | brief context graduate <title> [--source=origin]');
      process.exit(1);
    }

    const sourceFlag = rawArgs.find((a) => a.startsWith("--source="));
    const source = sourceFlag ? sourceFlag.split("=")[1] : "manual";

    const body = await readStdin();
    if (!body.trim()) {
      console.error("Error: stdin body is empty.");
      process.exit(1);
    }

    const path = graduate(root, title, body, { source });
    console.log(`Created: ${path}`);
    return;
  }

  if (subcommand === "list") {
    const items = list(root);
    if (items.length === 0) {
      console.log("No graduated context files.");
      return;
    }
    console.log("Title".padEnd(40) + "Created".padEnd(14) + "Path");
    console.log("-".repeat(80));
    for (const item of items) {
      console.log(item.title.slice(0, 38).padEnd(40) + item.created.padEnd(14) + item.file);
    }
    return;
  }

  if (subcommand) {
    const query = args.join(" ");
    const results = searchContext(root, query);
    if (results.length === 0) {
      console.log("No matching context files.");
      return;
    }
    for (const r of results) {
      console.log(`  ${r.file} — ${r.title}`);
      if (r.match) console.log(`    ${r.match}`);
    }
    return;
  }

  console.error("Usage: brief context <graduate|list|query>");
  console.error('  brief context graduate <title>  (body via stdin)');
  console.error("  brief context list");
  console.error("  brief context <query>");
  process.exit(1);
}
