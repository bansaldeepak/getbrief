const ESCAPE_MAP = { n: "\n", t: "\t", r: "\r", "\\": "\\" };

function unescapeBody(str) {
  return str.replace(/\\([ntr\\])/g, (_, ch) => ESCAPE_MAP[ch] ?? `\\${ch}`);
}

export async function readBody(rawArgs) {
  for (const arg of rawArgs) {
    if (arg.startsWith("--body=")) {
      const v = arg.slice("--body=".length);
      if (v !== "-") return unescapeBody(v);
      return drainStdin();
    }
  }
  return null;
}

export function drainStdin(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const chunks = [];
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      process.stdin.removeListener("data", onData);
      process.stdin.removeListener("end", onEnd);
      process.stdin.removeListener("error", onErr);
      process.stdin.destroy();
      resolve(null);
    }, timeoutMs);

    function onData(chunk) { chunks.push(chunk); }
    function onEnd() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const body = Buffer.concat(chunks).toString("utf8").trim();
      resolve(body || null);
    }
    function onErr() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(null);
    }

    process.stdin.on("data", onData);
    process.stdin.on("end", onEnd);
    process.stdin.on("error", onErr);
    process.stdin.resume();
  });
}
