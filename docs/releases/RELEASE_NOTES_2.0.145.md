## v2.0.145 - security hardening (audit follow-up)

Defence-in-depth hardening from an internal security audit. No behavior change
on normal traffic; these only bound malformed/hostile/pathological inputs. The
audit found the core surfaces (auth, SSRF, credential redaction, command
execution) already solid; these close three residual items.

### #1 — Resilient trajectory parsing against malformed protobuf
`parseTrajectorySteps` now degrades gracefully instead of throwing out of the
parser when an upstream Cascade payload is malformed or hostile:
- a bad root buffer returns `[]` instead of throwing;
- a single corrupt step is skipped instead of discarding the whole trajectory.

(The recursive trace walkers in `proto-trace.js` were already depth-bounded;
the production parsers descend a fixed set of known fields, so there was no
unbounded-recursion path — this change is about per-step robustness.)

### #2 — Validate compose labels before docker self-update
`docker-self-update.js` already shell-quoted the compose `project` /
`working_dir` labels, but the file's own contract says not to trust them
blindly. Added `isSafeComposeProject` / `isSafeComposeWorkingDir` shape
validation (charset / clean-absolute-path); a malformed or hostile label now
makes self-update report `unsafe-compose-labels` and abort rather than reach
the deployer command. (Still opt-in via a mounted docker socket + dashboard
auth.)

### #3 — Bound regex work on model output (ReDoS/CPU)
The narrative tool-intent extractor scans the full model output once per
declared tool name, and the reuse-fingerprint meta-tag stripper uses a
backreference regex that is quadratic on inputs with many unclosed tags. None
were exponential (dynamic parts are already escaped), but both could be driven
into polynomial blow-up by pathological model output. Added input length caps:
- `intent-extractor.js`: cap scanned text at 200 KB (NLU recovery is
  best-effort, so a prefix is fine);
- `conversation-pool.js` `stripMetaTags`: cap at 256 KB (output only feeds the
  reuse fingerprint, so the worst case is a cache miss).

`tool-emulation.js` dialect regexes were reviewed and found linear (lazy
quantifiers between escaped literals), so no change was needed there.

### Validation
- New `test/v2145-hardening.test.js` covers all three (6 tests).
- Full suite green; secret scan clean.
