import { withLock, gitCommonDir, allocateId } from "../../lib/tracker.mjs";

const root = process.argv[2];
const type = process.argv[3] || "story";

const gitDir = gitCommonDir(root);
const id = withLock(gitDir, () => allocateId(root, gitDir, type));
process.stdout.write(id);
