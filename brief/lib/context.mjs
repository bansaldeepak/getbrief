import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { stringify } from "yaml";

const CONTEXT_DIR = "documentation/context";

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveFilename(dir, slug) {
  const base = `${slug}.md`;
  if (!existsSync(join(dir, base))) return base;
  let i = 2;
  while (existsSync(join(dir, `${slug}-${i}.md`))) i++;
  return `${slug}-${i}.md`;
}

export function graduate(root, title, body, opts = {}) {
  const dir = join(root, CONTEXT_DIR);
  mkdirSync(dir, { recursive: true });

  const slug = slugify(title);
  if (!slug) throw new Error("Title produces empty slug");

  const filename = resolveFilename(dir, slug);
  const source = opts.source || "manual";
  const created = new Date().toISOString().split("T")[0];

  const frontmatter = stringify({ title, created, source }).trim();
  const content = `---\n${frontmatter}\n---\n\n${body.trim()}\n`;

  const filePath = join(dir, filename);
  writeFileSync(filePath, content);
  return join(CONTEXT_DIR, filename);
}

export function list(root) {
  const dir = join(root, CONTEXT_DIR);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const content = readFileSync(join(dir, f), "utf8");
      const titleMatch = content.match(/^title:\s*(.+)$/m);
      const createdMatch = content.match(/^created:\s*(.+)$/m);
      return {
        file: join(CONTEXT_DIR, f),
        title: titleMatch ? titleMatch[1] : basename(f, ".md"),
        created: createdMatch ? createdMatch[1] : "unknown",
      };
    })
    .sort((a, b) => a.created.localeCompare(b.created));
}

export function searchContext(root, query) {
  const dir = join(root, CONTEXT_DIR);
  if (!existsSync(dir)) return [];

  const q = query.toLowerCase();
  const results = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const content = readFileSync(join(dir, f), "utf8");
    if (!content.toLowerCase().includes(q)) continue;
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const lines = content.split("\n");
    const matchLine = lines.find((l) => l.toLowerCase().includes(q) && !l.startsWith("---"));
    results.push({
      file: join(CONTEXT_DIR, f),
      title: titleMatch ? titleMatch[1] : basename(f, ".md"),
      match: matchLine ? matchLine.trim() : "",
    });
  }
  return results;
}
