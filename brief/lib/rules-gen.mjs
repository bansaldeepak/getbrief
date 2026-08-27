import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const MARKER_OPEN = (section, ts) =>
  `<!-- brief:auto section="${section}" generated="${ts}" -->`;
export const MARKER_CLOSE = `<!-- /brief:auto -->`;

export function generateRuleSkeletons(projectRoot, detection, selectedRules) {
  const results = { claude: [], codex: [], gemini: [] };
  const ts = new Date().toISOString();

  if (detection.agents.claude) {
    results.claude = generateRuleFiles(join(projectRoot, ".claude", "rules"), selectedRules, ts, true);
  }
  if (detection.agents.codex) {
    results.codex = generateCodexSection(projectRoot, selectedRules, ts);
  }
  if (detection.agents.gemini) {
    results.gemini = generateRuleFiles(join(projectRoot, ".agents", "rules"), selectedRules, ts, false);
  }

  return results;
}

function generateRuleFiles(rulesDir, rules, ts, includeFrontmatter) {
  mkdirSync(rulesDir, { recursive: true });
  const created = [];

  for (const rule of rules) {
    const filePath = join(rulesDir, rule.file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      if (content.includes("brief:auto")) continue;
      const appended = content + "\n\n" + MARKER_OPEN(rule.id, ts) + "\n" +
        `## Generated: ${rule.name}\n\n(filled by /brief init)\n\n` + MARKER_CLOSE + "\n";
      writeFileSync(filePath, appended);
      created.push({ file: rule.file, action: "appended-markers" });
    } else {
      let fileContent = "";
      if (includeFrontmatter) {
        const paths = rule.paths?.length
          ? rule.paths.map(p => `  - "${p}"`).join("\n")
          : '  - "**/*"';
        fileContent = `---\npaths:\n${paths}\n---\n\n`;
      }
      fileContent += MARKER_OPEN(rule.id, ts) + "\n" +
        `## Generated: ${rule.name}\n\n(filled by /brief init)\n\n` + MARKER_CLOSE + "\n";
      writeFileSync(filePath, fileContent);
      created.push({ file: rule.file, action: "created" });
    }
  }
  return created;
}

function generateCodexSection(projectRoot, rules, ts) {
  const agentsPath = join(projectRoot, "AGENTS.md");
  const maxSize = 30 * 1024;

  let content = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";

  if (content.length > maxSize) {
    return [{ file: "AGENTS.md", action: "skipped-size-cap" }];
  }

  if (content.includes("brief:auto")) {
    return [{ file: "AGENTS.md", action: "already-has-markers" }];
  }

  const section = "\n\n" + MARKER_OPEN("conventions", ts) + "\n" +
    "## Coding Conventions (managed by brief)\n\n" +
    "(filled by /brief init)\n\n" + MARKER_CLOSE + "\n";
  writeFileSync(agentsPath, content + section);
  return [{ file: "AGENTS.md", action: "appended" }];
}
