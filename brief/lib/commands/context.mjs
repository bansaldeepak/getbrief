import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { graduate, list, searchContext } from "../context.mjs";
import { readBody } from "../body.mjs";

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

  if (subcommand === "show") {
    const slug = args[1];
    if (!slug) {
      console.error("Usage: brief context show <slug>");
      process.exit(1);
    }
    const contextDir = join(root, "documentation/context");
    const filePath = join(contextDir, slug.endsWith(".md") ? slug : `${slug}.md`);
    if (!existsSync(filePath)) {
      console.error(`Context file not found: ${slug}`);
      process.exit(1);
    }
    const relPath = `documentation/context/${slug.endsWith(".md") ? slug : slug + ".md"}`;
    console.log(`→ ${relPath}`);
    console.log(readFileSync(filePath, "utf8"));
    return;
  }

  if (subcommand === "update") {
    const slug = args[1];
    if (!slug) {
      console.error("Usage: brief context update <slug> --body=<content>");
      console.error('       echo "new body" | brief context update <slug>');
      process.exit(1);
    }
    const body = await readBody(rawArgs);
    if (!body) {
      console.error("Error: --body flag or stdin pipe required for update.");
      process.exit(1);
    }
    const contextDir = join(root, "documentation/context");
    const fileName = slug.endsWith(".md") ? slug : `${slug}.md`;
    const filePath = join(contextDir, fileName);
    if (!existsSync(filePath)) {
      console.error(`Context file not found: ${slug}`);
      process.exit(1);
    }
    // Preserve frontmatter, replace body
    const content = readFileSync(filePath, "utf8");
    const fmEnd = content.indexOf("---", content.indexOf("---") + 3);
    if (fmEnd !== -1) {
      const header = content.slice(0, fmEnd + 3);
      writeFileSync(filePath, header + "\n\n" + body + "\n");
    } else {
      writeFileSync(filePath, body + "\n");
    }
    const relPath = `documentation/context/${fileName}`;
    console.log(`✓ Updated context: ${slug}`);
    console.log(`path: ${relPath}`);
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

  console.error("Usage: brief context <graduate|show|update|list|query>");
  console.error('  brief context graduate <title>  (body via stdin)');
  console.error("  brief context show <slug>       (read full file)");
  console.error("  brief context update <slug>     (replace body via --body or stdin)");
  console.error("  brief context list");
  console.error("  brief context <query>");
  process.exit(1);
}
