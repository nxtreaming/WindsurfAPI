## v2.0.108 - native smoke finish-frame accounting

No production behavior changes.

### Smoke

- Fixed `scripts/native-bridge-smoke.mjs` so
  `NATIVE_BRIDGE_SMOKE_EARLY_TOOL=0` also reports whether the completed SSE
  body contained `data: [DONE]`.
- This avoids misreading a smoke-reporting gap as a server-side stream finish
  regression while validating native bridge tool-call early return.
