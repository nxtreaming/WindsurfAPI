## v2.0.118 - Native bridge smoke argument checks

This release keeps production native bridge behavior unchanged. It tightens the
gray-test evidence needed before widening native bridge.

### Native bridge smoke

- `scripts/native-bridge-smoke.mjs` now validates smoke tool arguments by
  default, not just the presence/source of a tool call.
- Read/Bash/Grep/Glob smoke diagnostics include compact tool argument previews.
- `NATIVE_BRIDGE_SMOKE_VALIDATE_ARGS=0` disables the argument validator for
  protocol debugging.
- This prevents degraded native results, such as a `Glob` call reconstructed
  from a `list_directory` step with `pattern:"*"`, from being counted as a full
  Glob success.

### Verification

- `node --check scripts/native-bridge-smoke.mjs`
- `node --test test/native-bridge-smoke.test.js test/native-tool-routing.test.js test/cascade-native-bridge.test.js`
- `node --test test/*.test.js`
