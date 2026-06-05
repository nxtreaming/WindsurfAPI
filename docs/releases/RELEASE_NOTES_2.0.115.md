## v2.0.115 - Native bridge telemetry and proto subconfig traces

This release keeps native bridge behind the existing gray gates, but adds the observability needed to decide when it is safe to widen.

### Native bridge

- Added runtime native bridge counters to authenticated `GET /health?verbose=1`.
- Counters separate requested tools, emitted tool calls, provider XML fallbacks, unmapped Cascade calls, no-tool-call responses, and account-gate skips/rejects.
- Streaming and non-streaming native bridge paths now record the same core counters, including provider-native XML fallback tool calls.

### Protobuf tracing

- Native tool config traces now include known Cascade subconfig kinds for `find`, `run_command`, `view_file`, `list_dir`, and `grep_v2`.
- Subconfig summaries include child field numbers and wire types, which makes real IDE vs proxy request diffs usable without dumping raw prompt text.

### Verification

- `node --test test/proto-trace.test.js test/native-bridge-stats.test.js test/native-tool-routing.test.js` -> 23/23 passing.
- `node --test test/*.test.js` -> 998/998 passing.
