import { acquireLock, releaseLock, gitCommonDir } from "../../lib/tracker.mjs";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const logFile = process.argv[3];
const label = process.argv[4] || String(process.pid);

const gitDir = gitCommonDir(root);
const lockPath = acquireLock(gitDir);
appendFileSync(logFile, `start:${label}\n`);
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
appendFileSync(logFile, `end:${label}\n`);
releaseLock(lockPath);
