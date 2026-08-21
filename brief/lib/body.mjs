export async function readBody(rawArgs) {
  for (const arg of rawArgs) {
    if (arg.startsWith("--body=")) {
      return arg.slice("--body=".length);
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
