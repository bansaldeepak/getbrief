# Codex CLI — Second Opinion

Codex CLI is set up and working on this machine. Use it as a second opinion — a fresh, differently-modeled
read on a diagnosis, a fix, or a design choice — before assuming it's broken.

## Auth is fine — a known false alarm

Auth is Azure OpenAI via a command-backed provider (`[model_providers.azure.auth]` in
`~/.codex/config.toml`), which reads the API key from the macOS Keychain (service `codex-azure`).
There is no env var and no `~/.codex/auth.json` — that's expected, not broken.

`codex login status` prints "Not logged in" and `~/.codex/auth.json` is absent. **Both are normal.**
That check is for ChatGPT/OpenAI login, which this setup doesn't use. **Never run `codex login`** —
it's solving a problem that doesn't exist here and won't fix anything.

To actually verify auth:

```bash
node -e "const m=await import('/Users/db/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/lib/codex.mjs');console.log(await m.getCodexAuthStatus(process.cwd()))"
```

Expect `loggedIn: true` and "Azure OpenAI is configured and does not require OpenAI authentication".

## Running Codex

```bash
codex exec --skip-git-repo-check "<prompt>" </dev/null              # gpt-5.6-sol (default)
codex exec --skip-git-repo-check -p deepseek "<prompt>" </dev/null  # DeepSeek-V4-Pro
```

- `</dev/null` is required — omit it and the run hangs on "Reading additional input from stdin...".
- Prefix with `RUST_LOG=codex_models_manager=off` to suppress a ~330KB JSON dump on stderr (Codex
  fails to parse Azure's `/models` response shape — cosmetic only, not a real error).

## Harmless warnings — don't chase these

- "Model metadata for `DeepSeek-V4-Pro` not found. Defaulting to fallback metadata"
- "MCP client for cloudflare-api failed to start: OAuth authorization required"
- "rmcp::transport::worker: worker quit with fatal ... Auth(AuthorizationRequired)"

## Don't trust self-identification

Codex's system prompt tells every underlying model it is GPT-5.6 Sol, so asking it "which model are
you" always returns the wrong answer regardless of `-p`. Trust the `model:` banner line in the output
instead.
