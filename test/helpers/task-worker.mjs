import { withLock, gitCommonDir, allocateTaskNum } from "../../lib/tracker.mjs";

const root = process.argv[2];
const storyId = process.argv[3];

const gitDir = gitCommonDir(root);
const num = withLock(gitDir, () => allocateTaskNum(root, gitDir, storyId));
process.stdout.write(String(num));
