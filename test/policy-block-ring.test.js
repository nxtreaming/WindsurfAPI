import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Bound the ring low + deterministically before importing the module so the
// cap assertions don't depend on the 50 default.
process.env.POLICY_BLOCK_RING = '20';
const CAP = 20;

const { recordPolicyBlocked, getStats, resetStats, importStats } =
  await import('../src/dashboard/stats.js');

function sample(i) {
  return {
    ts: 1000 + i,
    model: `m-${i}`,
    account: null,
    promptHash: `hash-${i}`,
    promptSample: `system text ${i}`,
    traceId: null,
  };
}

describe('policy-block observability ring buffer', () => {
  beforeEach(() => resetStats());

  it('bare recordPolicyBlocked() increments count and does NOT touch the ring (byte-compat)', () => {
    const before = getStats().policyBlockedCount || 0;
    recordPolicyBlocked();
    recordPolicyBlocked();
    const s = getStats();
    assert.equal(s.policyBlockedCount, before + 2);
    assert.ok(Array.isArray(s.recentPolicyBlocks));
    assert.equal(s.recentPolicyBlocks.length, 0, 'bare call must leave the ring empty');
  });

  it('recordPolicyBlocked(sample) pushes and still increments count', () => {
    const before = getStats().policyBlockedCount || 0;
    recordPolicyBlocked(sample(1));
    const s = getStats();
    assert.equal(s.policyBlockedCount, before + 1);
    assert.equal(s.recentPolicyBlocks.length, 1);
    assert.deepEqual(s.recentPolicyBlocks[0], sample(1));
  });

  it('hard-caps the ring at POLICY_BLOCK_RING, dropping oldest first', () => {
    const before = getStats().policyBlockedCount || 0;
    for (let i = 0; i < CAP + 10; i++) recordPolicyBlocked(sample(i));
    const s = getStats();
    assert.equal(s.recentPolicyBlocks.length, CAP, 'ring must be capped');
    // oldest (0..9) dropped; newest tail retained
    assert.equal(s.recentPolicyBlocks[0].ts, sample(10).ts, 'oldest entries dropped');
    assert.equal(
      s.recentPolicyBlocks[CAP - 1].ts,
      sample(CAP + 9).ts,
      'newest entry retained at tail',
    );
    // count reflects every block event regardless of ring cap
    assert.equal(s.policyBlockedCount, before + CAP + 10);
  });

  it('resetStats() clears recentPolicyBlocks', () => {
    recordPolicyBlocked(sample(1));
    assert.equal(getStats().recentPolicyBlocks.length, 1);
    resetStats();
    assert.deepEqual(getStats().recentPolicyBlocks, []);
  });

  it('importStats() concats recentPolicyBlocks and caps', () => {
    recordPolicyBlocked(sample(0));
    const incoming = [];
    for (let i = 1; i < CAP + 5; i++) incoming.push(sample(i));
    const res = importStats({ recentPolicyBlocks: incoming });
    assert.ok(res.ok);
    const s = getStats();
    assert.equal(s.recentPolicyBlocks.length, CAP, 'merged ring must be capped');
    // newest entry survives
    assert.equal(s.recentPolicyBlocks[CAP - 1].ts, sample(CAP + 4).ts);
  });
});
