# v2.0.139 - full CI shard hotfix

## What changed

- Fixed `test/audit-fixes.test.js` on Linux by using `fileURLToPath(import.meta.url)` instead of manually stripping the leading slash from `import.meta.url`.
- Fixed fake HTTP/2 language-server tests to close/destroy active sessions before `server.close()`, preventing CI shard timeouts in `test/client-panel-retry.test.js` and `test/native-read-wrapper.test.js`.
- Bumped the package version and native-bridge canary note to v2.0.139.

## Context

v2.0.138 Release, Docker build, and GitHub Release succeeded. The newly restored full CI shards then exposed these test-harness portability/resource-cleanup issues. This release keeps the v2.0.138 product changes and makes the full CI gate green.

## Validation

- `node --test --test-force-exit test/audit-fixes.test.js`
- `node --test --test-force-exit test/client-panel-retry.test.js`
- `node --test --test-force-exit test/native-read-wrapper.test.js`
- `npm.cmd run test:release`
- `npm.cmd run test:shard -- 0 4 --timeout-ms=90000`
- `npm.cmd run test:shard -- 1 4 --timeout-ms=90000`
- `npm.cmd run test:shard -- 2 4 --timeout-ms=90000`
- `npm.cmd run test:shard -- 3 4 --timeout-ms=90000`
