## v2.0.127 - Native bridge observability and probe tooling

- `/health?verbose=1` now exposes sanitized native bridge decision telemetry:
  total enabled/disabled decisions, reason counters, last decision, and a small
  recent-decision ring. It records why a request did or did not use the native
  bridge without storing caller keys, account IDs, or upstream API keys.
- The authenticated dashboard overview API now includes the same sanitized
  native bridge telemetry, and the overview UI shows mode, gray gates, decision
  totals, top disable reasons, and recent mapped/unmapped tool decisions. This
  makes "why did this request stay on prompt emulation?" visible without
  reading logs or exposing the server API key to the browser.
- `npm run smoke:native-bridge` now includes native bridge decision deltas in
  its JSON output, so Read/Grep/Glob canaries can prove both the routing path
  and the emitted tool-call path.
- Added `npm run smoke:lsp-matrix` for real deployment LSP capacity probes. It
  runs configurable chat concurrency, snapshots `/health?verbose=1`, and reports
  RSS, LS pool occupancy, memory-guard state, and admission-stat deltas.
- Added a direct `GetWebSearchResults` helper and `npm run probe:web-search`.
  The probe uses explicit upstream account keys or persisted `accounts.json`;
  it intentionally does not treat the gateway `API_KEY` as a Windsurf account
  key. This is the safe path for WebSearch investigation while LS-native
  WebSearch/WebFetch remain outside the default native bridge allowlist.
- Default production behavior is unchanged: the native bridge still requires
  explicit env gates, and WebSearch/WebFetch are still lab-only until live
  LS-native result payloads are confirmed.

Verification:

- `node --check src\cascade-native-bridge.js`
- `node --check src\native-bridge-stats.js`
- `node --check src\handlers\chat.js`
- `node --check src\windsurf-api.js`
- `node --check scripts\native-bridge-smoke.mjs`
- `node --check scripts\lsp-capacity-matrix.mjs`
- `node --check scripts\web-search-direct-probe.mjs`
- `node --test --test-timeout=120000 --test-force-exit test\*.test.js`
