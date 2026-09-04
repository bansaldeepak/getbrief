import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CODEGRAPH_BIN = join(__dirname, "../node_modules/.bin/codegraph");

const FRAMEWORK_PATTERNS = {
  npm: ["hono", "express", "fastify", "koa", "react", "vue", "next", "nuxt", "svelte", "solid-js", "angular", "prisma", "drizzle-orm", "@remix-run/react"],
  cargo: ["actix-web", "axum", "tokio", "serde", "rocket"],
  gomod: ["gin", "echo", "fiber"],
  pyproject: ["django", "flask", "fastapi", "starlette"],
  gemfile: ["rails", "sinatra"],
};

const TESTING_PATTERNS = {
  npm: ["vitest", "jest", "mocha", "playwright", "@playwright/test", "cypress", "ava", "tap"],
  cargo: ["tokio-test"],
  pyproject: ["pytest", "unittest"],
  gemfile: ["rspec", "minitest"],
};

const EXT_TO_LANG = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
};

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "vendor", ".next", ".nuxt", "coverage"]);

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function findAgentDirs(projectRoot) {
  return {
    claude: existsSync(join(projectRoot, ".claude")) && isDir(join(projectRoot, ".claude")),
    codex: existsSync(join(projectRoot, ".codex")),
    gemini: existsSync(join(projectRoot, ".gemini")) || existsSync(join(projectRoot, ".agents", "rules")),
  };
}

export function detectStack(projectRoot) {
  const result = {
    languages: [],
    frameworks: [],
    testing: [],
    runtime: null,
    hasCI: false,
    agents: findAgentDirs(projectRoot),
  };

  result.languages = detectLanguages(projectRoot);

  const deps = readManifestDeps(projectRoot);
  result.frameworks = deps.frameworks;
  result.testing = deps.testing;
  result.runtime = inferRuntime(projectRoot);
  result.hasCI = existsSync(join(projectRoot, ".github", "workflows"))
    || existsSync(join(projectRoot, ".gitlab-ci.yml"));

  return result;
}

function detectLanguages(projectRoot) {
  try {
    const output = execFileSync(CODEGRAPH_BIN, ["status", "--json", projectRoot], {
      encoding: "utf8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed.languages) && parsed.languages.length > 0) {
      return parsed.languages.map(l => l.toLowerCase());
    }
  } catch {
    // codegraph unavailable or returned malformed JSON — fall through to extension scan
  }

  return scanExtensions(projectRoot);
}

function scanExtensions(projectRoot) {
  const langs = new Set();
  try {
    const entries = readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        const lang = EXT_TO_LANG[extname(entry.name)];
        if (lang) langs.add(lang);
      } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        const subEntries = safeReaddir(join(projectRoot, entry.name));
        for (const sub of subEntries) {
          if (sub.isFile()) {
            const lang = EXT_TO_LANG[extname(sub.name)];
            if (lang) langs.add(lang);
          }
        }
      }
    }
  } catch {
    // unreadable directory
  }
  return [...langs].sort();
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function readManifestDeps(projectRoot) {
  const frameworks = [];
  const testing = [];

  // package.json
  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      for (const name of FRAMEWORK_PATTERNS.npm) {
        if (allDeps[name]) frameworks.push(name);
      }
      for (const name of TESTING_PATTERNS.npm) {
        if (allDeps[name]) testing.push(name);
      }
    } catch {
      // malformed package.json
    }
  }

  // Cargo.toml
  const cargoPath = join(projectRoot, "Cargo.toml");
  if (existsSync(cargoPath)) {
    try {
      const content = readFileSync(cargoPath, "utf8");
      for (const name of FRAMEWORK_PATTERNS.cargo) {
        if (content.includes(name)) frameworks.push(name);
      }
      for (const name of TESTING_PATTERNS.cargo) {
        if (content.includes(name)) testing.push(name);
      }
    } catch {
      // unreadable
    }
  }

  // go.mod
  const goModPath = join(projectRoot, "go.mod");
  if (existsSync(goModPath)) {
    try {
      const content = readFileSync(goModPath, "utf8");
      for (const name of FRAMEWORK_PATTERNS.gomod) {
        if (content.includes(name)) frameworks.push(name);
      }
    } catch {
      // unreadable
    }
  }

  // pyproject.toml
  const pyPath = join(projectRoot, "pyproject.toml");
  if (existsSync(pyPath)) {
    try {
      const content = readFileSync(pyPath, "utf8");
      for (const name of FRAMEWORK_PATTERNS.pyproject) {
        if (content.includes(name)) frameworks.push(name);
      }
      for (const name of TESTING_PATTERNS.pyproject) {
        if (content.includes(name)) testing.push(name);
      }
    } catch {
      // unreadable
    }
  }

  // Gemfile
  const gemPath = join(projectRoot, "Gemfile");
  if (existsSync(gemPath)) {
    try {
      const content = readFileSync(gemPath, "utf8");
      for (const name of FRAMEWORK_PATTERNS.gemfile) {
        if (content.includes(name)) frameworks.push(name);
      }
      for (const name of TESTING_PATTERNS.gemfile) {
        if (content.includes(name)) testing.push(name);
      }
    } catch {
      // unreadable
    }
  }

  return { frameworks, testing };
}

function inferRuntime(projectRoot) {
  if (existsSync(join(projectRoot, "deno.json")) || existsSync(join(projectRoot, "deno.jsonc"))) {
    return "deno";
  }
  if (existsSync(join(projectRoot, "bun.lockb")) || existsSync(join(projectRoot, "bunfig.toml"))) {
    return "bun";
  }
  if (existsSync(join(projectRoot, "package.json"))) {
    return "node";
  }
  if (existsSync(join(projectRoot, "pyproject.toml")) || existsSync(join(projectRoot, "requirements.txt"))) {
    return "python";
  }
  if (existsSync(join(projectRoot, "go.mod"))) {
    return "go";
  }
  if (existsSync(join(projectRoot, "Cargo.toml"))) {
    return "rust";
  }
  return null;
}
