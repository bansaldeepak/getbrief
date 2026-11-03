// brief project <action> — shared agent workspace at ~/.brief/projects/

import { basename } from "node:path";
import { homedir } from "node:os";
import { readBody } from "../body.mjs";
import {
  ITEM_TYPES, joinProject, leaveProject, getRepoProjects, shareItem, updateActiveWork,
  listProjects, projectStatus, searchSharedSpace, syncSharedToRepo, cleanupResolved,
} from "../project.mjs";

const HELP = `brief project <action>

Actions:
  join <name>                       Join this repo to a project (creates it if new)
  leave <name>                      Remove this repo from a project
  list                              List projects on this machine
  status [name]                     Repos, shared items and warnings
  share <type> "title" [--body=...] Share a requirement | decision | memory
    [--status=active|resolved]
  active "title" [--story=S-NNN] [--body=...] [--status=in_progress|done]
                                    Write the in-flight summary for this repo
  sync [name]                       Copy shared knowledge to this repo's
                                    documentation/memory/, then remove resolved items
  search "<query>" [--project=name] Search the shared space
  help                              Show this help

When this repo is in more than one project, add --project=<name>.`;

const flag = (rawArgs, name) => rawArgs.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function pickProject(root, rawArgs, positional) {
  const explicit = flag(rawArgs, "project") ?? positional;
  if (explicit) return explicit;
  const joined = getRepoProjects(root);
  if (joined.length === 1) return joined[0];
  if (joined.length === 0) fail("This repo has not joined a project. Run: brief project join <name>");
  return fail(`This repo is in several projects (${joined.join(", ")}). Add --project=<name>`);
}

export async function projectCommand(root, action, args, rawArgs, { home = homedir() } = {}) {
  const positional = args.filter((a) => !a.startsWith("--"));
  const opts = { home };
  try {
    switch (action) {
      case "join": {
        if (!positional[0]) fail("Usage: brief project join <name>");
        const { created, repoName } = joinProject(root, positional[0], opts);
        console.log(`${created ? "Created and joined" : "Joined"} project ${positional[0]} as ${repoName}`);
        return;
      }
      case "leave": {
        if (!positional[0]) fail("Usage: brief project leave <name>");
        leaveProject(root, positional[0], opts);
        console.log(`Left project ${positional[0]}`);
        return;
      }
      case "list": {
        const projects = listProjects(opts);
        if (!projects.length) return console.log("No projects.");
        for (const p of projects) console.log(`${p.name}  (${p.repos} repo${p.repos === 1 ? "" : "s"})`);
        return;
      }
      case "status": return printStatus(pickProject(root, rawArgs, positional[0]), opts);
      case "share": {
        const [type, ...titleParts] = positional;
        const title = titleParts.join(" ");
        if (!type || !title) fail(`Usage: brief project share <${Object.keys(ITEM_TYPES).join("|")}> "title" [--body=...]`);
        const name = pickProject(root, rawArgs);
        const body = (await readBody(rawArgs)) ?? "";
        const path = shareItem(name, type, title, body, basename(root), { ...opts, status: flag(rawArgs, "status") });
        console.log(`Shared ${type}: ${path}`);
        return;
      }
      case "active": {
        const title = positional.join(" ");
        if (!title) fail('Usage: brief project active "title" [--story=S-NNN] [--body=...]');
        const name = pickProject(root, rawArgs);
        const body = (await readBody(rawArgs)) ?? "";
        const path = updateActiveWork(name, basename(root), flag(rawArgs, "story"), title, body, { ...opts, status: flag(rawArgs, "status") });
        console.log(`Updated active work: ${path}`);
        return;
      }
      case "sync": {
        const name = pickProject(root, rawArgs, positional[0]);
        const synced = syncSharedToRepo(name, root, opts);
        const removed = cleanupResolved(name, opts);
        console.log(`Synced ${synced.length} item(s) to documentation/memory/; removed ${removed.length} resolved item(s).`);
        for (const file of synced) console.log(`  + ${file}`);
        return;
      }
      case "search": {
        const query = positional.join(" ");
        if (!query) fail('Usage: brief project search "<query>" [--project=name]');
        const results = searchSharedSpace(pickProject(root, rawArgs), query, opts);
        if (!results.length) return console.log("No results.");
        for (const r of results) console.log(`[shared] ${r.brief}${r.status ? ` (${r.status})` : ""}\n  → ${r.file}`);
        console.log(`\n${results.length} result(s)`);
        return;
      }
      case undefined:
      case "help":
      case "--help":
      case "-h":
        return console.log(HELP);
      default:
        fail(`Unknown project action: ${action}. Run: brief project help`);
    }
  } catch (error) {
    fail(error.message);
  }
}

function printStatus(name, opts) {
  const status = projectStatus(name, opts);
  console.log(`Project ${status.name}`);
  console.log(`Repos (${status.repos.length}):`);
  for (const r of status.repos) console.log(`  ${r.name}  ${r.path}${r.reachable ? "" : "  [missing]"}`);
  console.log(`Items (${status.items.length}):`);
  for (const i of status.items) console.log(`  ${i.dir}/${i.file}  ${i.status ?? ""}  ${i.updated ?? ""}${i.stale ? "  [stale]" : ""}`);
  for (const w of status.warnings) console.log(`Warning: ${w}`);
}
