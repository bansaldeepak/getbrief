const ESCAPE_MAP = { n: "\n", t: "\t", r: "\r", "\\": "\\" };

function unescapeBody(str) {
  return str.replace(/\\([ntr\\])/g, (_, ch) => ESCAPE_MAP[ch] ?? `\\${ch}`);
}

export async function readBody(rawArgs) {
  for (const arg of rawArgs) {
    if (arg.startsWith("--body=")) {
      return unescapeBody(arg.slice("--body=".length));
    }
  }

  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString("utf8").trim();
    if (body) return body;
  }

  return null;
}
