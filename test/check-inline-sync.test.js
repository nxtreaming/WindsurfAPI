import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Guards the inline mirrors (pool-events.js / diff.js ↔ index.html inline copies)
// against silent drift. If someone edits one copy but not the other, the gate
// exits non-zero and this test fails — surfacing the drift in CI, not prod.
describe('check-inline-sync gate', () => {
  it('inline dashboard logic stays in sync with its testable modules', () => {
    const r = spawnSync(process.execPath, ['src/dashboard/check-inline-sync.js'], {
      cwd: ROOT, encoding: 'utf8',
    });
    assert.equal(r.status, 0, `inline-sync gate failed:\n${r.stdout}\n${r.stderr}`);
  });
});
