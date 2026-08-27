/**
 * Documentation drift check.
 *
 * Run: `npx tsx scripts/ci/docs-drift.ts`  (wire as `npm run docs:drift`)
 *
 * Fails the build when documentation has silently stopped being true. Five checks:
 *
 *   1. every `path` in map.yaml exists
 *   2. every `npm run <x>` / bare command in AGENTS.md is a real script in package.json
 *   3. every relative markdown link in a mapped doc resolves to a real file
 *   4. code matching a node's `covers_code` has commits newer than that node's `verified_at`
 *   5. a doc marked `generated:` has no hand commits since its last generation
 *
 * Deliberately dependency-free beyond `yaml`, which is already a project dependency.
 * Deliberately excludes documentation/stories/** — that is a frozen log, not documentation.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, dirname, resolve, relative } from "node:path";
import { parse } from "yaml";

const REPO = resolve(import.meta.dirname, "../..");
const MAP_PATH = join(REPO, "documentation/map.yaml");
const TIER1 = join(REPO, "AGENTS.md");

interface Node {
  id: string;
  path: string;
  tier: number;
  triggers: string[];
  covers_code?: string[];
  links?: string[];
  owner?: string;
  verified_at: string;
  generated?: string;
  freshness?: number;
}

const failures: string[] = [];
const warnings: string[] = [];

const fail = (check: string, msg: string) => failures.push(`[${check}] ${msg}`);
const warn = (check: string, msg: string) => warnings.push(`[${check}] ${msg}`);

const git = (...args: string[]): string => {
  try {
    return execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

/** Files touching `glob` that have commits strictly after `since` (ISO date). */
const commitsSince = (glob: string, since: string): string[] => {
  const out = git("log", `--since=${since}`, "--name-only", "--pretty=format:", "--", glob);
  return [...new Set(out.split("\n").filter(Boolean))];
};

// ---------------------------------------------------------------- load map

if (!existsSync(MAP_PATH)) {
  console.error("documentation/map.yaml not found — nothing to check.");
  process.exit(1);
}

const map = parse(readFileSync(MAP_PATH, "utf8")) as {
  defaults?: { freshness?: number; owner?: string };
  nodes: Node[];
};
const nodes = map.nodes ?? [];
const nodeIds = new Set(nodes.map((n) => n.id));

// ------------------------------------------------- 1. mapped paths exist

for (const n of nodes) {
  if (!existsSync(join(REPO, n.path))) {
    fail("path", `node "${n.id}" points at ${n.path}, which does not exist`);
  }
  for (const link of n.links ?? []) {
    if (!nodeIds.has(link)) {
      fail("links", `node "${n.id}" links to unknown node id "${link}"`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.verified_at ?? "")) {
    fail("verified_at", `node "${n.id}" has a missing or malformed verified_at`);
  }
}

// -------------------------------- 2. Tier 1 commands are real npm scripts

const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
const scripts = new Set(Object.keys(pkg.scripts ?? {}));
const tier1 = readFileSync(TIER1, "utf8");

// Only inside backticks, and skip lines explicitly marking a command as retired.
for (const line of tier1.split("\n")) {
  if (/retired|never run|do not run/i.test(line)) continue;
  for (const [, script] of line.matchAll(/`npm run ([a-z0-9:_-]+)`/g)) {
    if (!scripts.has(script)) {
      fail("command", `AGENTS.md references \`npm run ${script}\`, which is not in package.json`);
    }
  }
}

// The inverse of D2 in PROPOSAL.md: a retired script must not be silently resurrected.
for (const retired of ["deploy", "dev:server"]) {
  if (scripts.has(retired) && !/retired|never run/i.test(tier1)) {
    warn("command", `package.json still defines "${retired}" (Cloudflare-era) and AGENTS.md no longer warns about it`);
  }
}

// ------------------------------- 3. relative links in mapped docs resolve

const mdFilesUnder = async (p: string): Promise<string[]> => {
  const abs = join(REPO, p);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return abs.endsWith(".md") ? [abs] : [];
  const entries = await readdir(abs, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(e.parentPath ?? abs, e.name));
};

for (const n of nodes) {
  for (const file of await mdFilesUnder(n.path)) {
    const body = readFileSync(file, "utf8");
    for (const [, target] of body.matchAll(/]\(([^)#:]+\.(?:md|ts|tsx|json|yaml|yml|prisma))[^)]*\)/g)) {
      const resolved = target.startsWith("/")
        ? join(REPO, target)
        : resolve(dirname(file), target);
      if (!existsSync(resolved)) {
        fail("link", `${relative(REPO, file)} links to ${target}, which does not exist`);
      }
    }
  }
}

// --------------------------- 4. code newer than the doc's verified_at date

for (const n of nodes) {
  for (const glob of n.covers_code ?? []) {
    const touched = commitsSince(glob, n.verified_at);
    if (touched.length > 0) {
      const sample = touched.slice(0, 3).join(", ");
      const more = touched.length > 3 ? ` (+${touched.length - 3} more)` : "";
      fail(
        "stale",
        `node "${n.id}" (${n.path}) was verified ${n.verified_at}, but code it covers changed since: ${sample}${more}. ` +
          `Update the doc and bump verified_at, or narrow covers_code.`,
      );
    }
  }
}

// ------------------------------- 5. generated docs must not be hand-edited

for (const n of nodes.filter((x) => x.generated)) {
  const lastCommit = git("log", "-1", "--pretty=%s", "--", n.path);
  if (lastCommit && !/^(docs|chore)\(gen\)/.test(lastCommit)) {
    warn(
      "generated",
      `node "${n.id}" is generated by \`${n.generated}\` but its last commit is "${lastCommit}". ` +
        `Regenerate rather than hand-editing.`,
    );
  }
}

// ------------- 6. generated projections still match this map (the traversal contract)
//
// The agent never reads map.yaml. It reads the AGENTS.md table and each doc's Related
// footer, both generated from here. If a projection drifts from its source, the agent
// is navigating by a map nobody is validating — the exact failure this system prevents.

const between = (body: string, marker: string): string | null => {
  const m = body.match(new RegExp(`<!-- ${marker}:START[^>]*-->([\\s\\S]*?)<!-- ${marker}:END -->`));
  return m ? m[1].trim() : null;
};

const tableBlock = between(tier1, "MAP");
if (tableBlock === null) {
  fail("projection", "AGENTS.md has no <!-- MAP:START --> block — the doc table is hand-maintained and can drift");
} else {
  for (const n of nodes.filter((x) => x.tier <= 2)) {
    if (!tableBlock.includes(n.path)) {
      fail("projection", `node "${n.id}" (${n.path}) is tier ${n.tier} but missing from the AGENTS.md map table`);
    }
  }
}

for (const n of nodes) {
  const files = await mdFilesUnder(n.path);
  const entry = files.find((f) => /index\.md$|README\.md$/.test(f)) ?? files[0];
  if (!entry || !(n.links ?? []).length) continue;
  const footer = between(readFileSync(entry, "utf8"), "LINKS");
  if (footer === null) {
    warn("projection", `${relative(REPO, entry)} has no Related footer; agents cannot traverse from node "${n.id}"`);
    continue;
  }
  for (const target of n.links ?? []) {
    const targetPath = nodes.find((x) => x.id === target)?.path;
    if (targetPath && !footer.includes(targetPath.split("/").pop()!.replace(/\/$/, ""))) {
      fail("projection", `${relative(REPO, entry)} Related footer is missing declared link "${target}" — run \`npm run docs:map\``);
    }
  }
}

// ----------------------------------- 7. CLAUDE.md has not regrown into a rulebook

const claude = join(REPO, "CLAUDE.md");
if (existsSync(claude)) {
  const lines = readFileSync(claude, "utf8").split("\n").filter((l) => l.trim()).length;
  if (lines > 10) {
    fail("pointer", `CLAUDE.md has ${lines} non-blank lines. It must stay a pointer to AGENTS.md (<= 10).`);
  }
}

// ---------------------------------------------------------------- report

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const f of failures) console.error(`FAIL  ${f}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} documentation drift failure(s). See documentation/map.yaml.`);
  process.exit(1);
}
console.log(`Documentation drift check passed (${nodes.length} nodes, ${warnings.length} warning(s)).`);
