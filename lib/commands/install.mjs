import { installWorkflow } from "../workflow-package.mjs";

export function installCommand(args, options = {}) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("brief install [--dry-run] [--source=<local-path>]\n\nInstall the home workflow package. Existing packages stay pinned; update with brief update --global.");
    return;
  }
  for (const arg of args) if (arg !== "--dry-run" && !arg.startsWith("--source=")) throw new Error(`Unknown install option: ${arg}. Brief is CLI-only; use brief install --help.`);
  const source = args.find(arg => arg.startsWith("--source="))?.slice(9);
  if (source === "") throw new Error("--source requires a local directory path");
  const result = installWorkflow({ ...options, source, dryRun: args.includes("--dry-run") });
  console.log(JSON.stringify(result, null, 2));
  return result;
}
