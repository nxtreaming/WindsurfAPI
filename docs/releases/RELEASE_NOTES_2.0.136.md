# v2.0.136 - audit hardening

## What changed

- Oversized HTTP request bodies now return protocol-shaped `413 Request body too large` errors instead of being misclassified as `Invalid JSON`.
- WebFetch lab auto-approve now canonicalizes URL/origin allowlist entries and rejects non-http(s), malformed, or credential-bearing URLs.
- `read_url_content` no longer trusts the unconfirmed top-level field 5 summary by default; legacy fallback requires `WINDSURFAPI_NATIVE_TOOL_BRIDGE_READ_URL_LEGACY_SUMMARY=1`.
- Atomic JSON writes now use unique temporary filenames and retry short-lived Windows rename locks, including `accounts.json`.
- Added `docs/audits/AUDIT_2026-06-06.md` with the audit baseline, findings, fixed items, and remaining follow-ups.

## Notes

- Read/WebSearch/WebFetch remain lab-only native bridge surfaces. This release tightens canary behavior; it does not production-open those tools.
- Release workflow metadata/test-gate hardening is documented in the audit, but was not included in this release because the current GitHub token lacks `workflow` scope.
- Dashboard account pagination for #168 is the next recommended implementation slice.

## Validation

- `node --test test/*.test.js` -> 1070/1070 passing.
