// Settings-expansion batches 5 & 6 — runtime-config hardening.
// Covers:
//   - setExperimental: unknown-key whitelist rejection + boolean coercion
//   - getExperimental: orphan keys in state don't leak back out
//   - setSystemPrompts: empty override deletes (falls back to default) + max-len cap
//
// In-memory only: _resetRuntimeConfigForTests reseeds state; persist writes into
// the temp DATA_DIR from test/setup-env.mjs, so no real project file is touched.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  _resetRuntimeConfigForTests,
  getExperimental, setExperimental,
  getSystemPrompts, setSystemPrompts,
} from '../src/runtime-config.js';

describe('setExperimental: whitelist + coercion (batch 6)', () => {
  beforeEach(() => _resetRuntimeConfigForTests());

  it('rejects unknown keys, keeps known ones', () => {
    const before = getExperimental();
    const known = Object.keys(before)[0]; // some real flag
    const out = setExperimental({ [known]: false, bogusJunkKey: true });
    assert.equal(out[known], false, 'known flag applied');
    assert.equal('bogusJunkKey' in out, false, 'unknown key rejected');
  });

  it('coerces truthy/falsy values to real booleans', () => {
    const known = Object.keys(getExperimental())[0];
    const out = setExperimental({ [known]: 'yes' }); // truthy string
    assert.strictEqual(out[known], true);
    const out2 = setExperimental({ [known]: 0 }); // falsy number
    assert.strictEqual(out2[known], false);
  });

  it('getExperimental does not leak orphan keys left in state', () => {
    // Seed state with a junk key as an old pre-whitelist client might have.
    _resetRuntimeConfigForTests({ experimental: { staleGhostFlag: true } });
    const out = getExperimental();
    assert.equal('staleGhostFlag' in out, false, 'orphan key filtered out on read');
  });

  it('returns defaults for every known flag even when state is empty', () => {
    _resetRuntimeConfigForTests({ experimental: {} });
    const out = getExperimental();
    assert.ok(Object.keys(out).length > 0);
    for (const v of Object.values(out)) assert.equal(typeof v, 'boolean');
  });
});

describe('setSystemPrompts: empty-delete + max-len (batch 5)', () => {
  beforeEach(() => _resetRuntimeConfigForTests());

  const somePromptKey = () => Object.keys(getSystemPrompts())[0];

  it('stores a trimmed override', () => {
    const k = somePromptKey();
    const out = setSystemPrompts({ [k]: '  hello prompt  ' });
    assert.equal(out[k], 'hello prompt');
  });

  it('empty / whitespace override deletes the key and falls back to default', () => {
    const k = somePromptKey();
    const def = getSystemPrompts()[k]; // built-in default
    setSystemPrompts({ [k]: 'custom value' });
    assert.equal(getSystemPrompts()[k], 'custom value');
    const out = setSystemPrompts({ [k]: '   ' }); // clear it
    assert.equal(out[k], def, 'falls back to the default, not an empty string');
    assert.notEqual(out[k], '');
  });

  it('caps an over-long override to the max length', () => {
    const k = somePromptKey();
    const huge = 'x'.repeat(50000);
    const out = setSystemPrompts({ [k]: huge });
    assert.ok(out[k].length <= 20000, `capped, got ${out[k].length}`);
    assert.ok(out[k].length > 0);
  });

  it('rejects unknown prompt keys and non-string values', () => {
    const out = setSystemPrompts({ notARealPromptKey: 'x' });
    assert.equal('notARealPromptKey' in out, false);
    const k = somePromptKey();
    setSystemPrompts({ [k]: 12345 }); // non-string ignored
    assert.equal(typeof getSystemPrompts()[k], 'string');
  });
});
