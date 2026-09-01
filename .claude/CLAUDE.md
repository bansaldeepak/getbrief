@../HARNESS.md

### Codex CLI login note

If `codex login status` (or any codex command) reports "not logged in", that's a false alarm on this
machine — auth here is Azure OpenAI via the Keychain, not ChatGPT/OpenAI login, so that check doesn't
apply. Don't try to fix it or avoid using Codex as a second opinion because of it; the codex skills
already know how to run it. If asked for a second opinion with DeepSeek specifically:

```bash
codex exec --skip-git-repo-check "<prompt>" </dev/null              # gpt-5.6-sol (default)
codex exec --skip-git-repo-check -p deepseek "<prompt>" </dev/null  # DeepSeek-V4-Pro
```