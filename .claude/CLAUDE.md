@../AGENTS.md

<!--
Everything lives in AGENTS.md — commands, hard rules, and the documentation map.
The commit/push/PR approval gates are global now (WORKFLOW.md, and the
`/sdlc implement` skill), so they are in context without an import; AGENTS.md
keeps only what those gates mean in this repo.
Do not add rules here; add them to AGENTS.md.

Claude-specific instructions (things no other agent should read) go below.
-->

### Codex CLI login note

If `codex login status` (or any codex command) reports "not logged in", that's a false alarm on this
machine — auth here is Azure OpenAI via the Keychain, not ChatGPT/OpenAI login, so that check doesn't
apply. Don't try to fix it or avoid using Codex as a second opinion because of it; the codex skills
already know how to run it. If asked for a second opinion with DeepSeek specifically:

```bash
codex exec --skip-git-repo-check "<prompt>" </dev/null              # gpt-5.6-sol (default)
codex exec --skip-git-repo-check -p deepseek "<prompt>" </dev/null  # DeepSeek-V4-Pro
```
