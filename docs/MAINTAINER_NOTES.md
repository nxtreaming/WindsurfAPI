# Maintainer Notes

These notes capture project operating rules that should survive context
resets. They are not release notes.

## Evidence Rules

- Do not claim support from names, guesses, or encode/decode round trips. For
  protocol work, require descriptor evidence, LS binary field evidence, or a
  real redacted trace.
- Do not widen production defaults from a single lab success. First add gated
  smoke, logs, docs, and a rollback path.
- Keep unsupported boundaries explicit. If a tool, model, media input, or
  backend cannot be bridged safely, return a clear error instead of pretending
  it is OpenAI-compatible.
- When an issue is broad, keep it as a reproduction bucket and require logs.
  Do not close it because a related bug was fixed elsewhere.

## Native Bridge Rules

- Production default native bridge scope is the Bash family only:
  `Bash`, `shell_command`, and `run_command`.
- `Read`, `Grep`, `Glob`, `WebSearch`, and `WebFetch` are protocol-lab tools
  until real traces confirm argument shape, result shape, and execution
  boundary.
- `WINDSURFAPI_NATIVE_TOOL_BRIDGE=all_mapped` is not a generic fix for "tools
  not called". Use it only with explicit API key, account, model, and tool
  gates.
- Native bridge executes in the remote Windsurf workspace. Do not describe it
  as local IDE/MCP/client tool execution.
- Keep raw proto traces redacted by default. Raw string trace switches are for
  gated lab runs only.

## SWE / Special-Agent Rules

- SWE-1.6 and SWE-1.6-fast are special-agent work unless a real official trace
  proves direct Cascade chat support.
- Do not mix SWE-1.6 with ordinary cloud catalog fixes.
- Devin/ACP backends must be default-off, bounded, and text-only first.
- Client-local tools and media must be rejected or explicitly bridged; never
  silently execute them in a different workspace.

## WebSearch / WebFetch Rules

- Direct `GetWebSearchResults` is confirmed for WebSearch investigation.
- No direct WebFetch/read-url API is confirmed. Do not implement one from a
  guessed method name.
- The observed WebFetch path is LS requested interaction plus
  `HandleCascadeUserInteraction`, then a later trajectory step.
- Do not bypass production VPS memory guards just to force a WebFetch canary.
  Use an isolated memory-safe lab environment.

## Release Rules

- For code releases, update `package.json`, add release notes, run the focused
  tests, run `npm run test:release`, run `npm run secret-scan`, and run full
  shards when the blast radius is not trivial.
- After tag push, verify GitHub CI, Release, Docker build, and deployed VPS
  smoke before calling the release done.
- VPS smoke should include `/health?verbose=1`, Docker image labels, `/v1/models`,
  and one basic chat completion.
- Verify the actual WindsurfAPI entrypoint before judging VPS health. In the
  current VPS deployment the compose nginx entry is on `:3003`; public port 80
  may be served by another stack and is not a WindsurfAPI health signal.
- `/health` build metadata matters. If commit is missing, fix build metadata
  injection instead of relying only on image labels.

## Security And Privacy Rules

- Never write raw API keys, passwords, account credentials, session tokens, or
  customer email lists into docs, release notes, issue comments, or logs.
- Use hashes, counts, IDs, and redacted previews for diagnostics.
- Run secret scan before release and before pushing documentation that touched
  examples or operational notes.

## Code And UI Rules

- Prefer existing local helpers and patterns. Avoid new dependencies unless the
  maintenance tradeoff is clearly worth it.
- Keep patches scoped. Do not mix protocol reverse engineering, dashboard UI,
  release workflow, and unrelated cleanup in one release unless there is a real
  dependency.
- Dashboard UI should stay operational and dense: pagination, summaries,
  compact tables, predictable controls, and no marketing-style layout.
- Dashboard interactions should use existing app confirmation/prompt patterns,
  not native browser alerts.
- Do not revert unrelated user or generated changes in the worktree.
