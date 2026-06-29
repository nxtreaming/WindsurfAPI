#!/usr/bin/env node
/**
 * DEVIN_CONNECT image-field tag calibration harness.
 *
 * The `images` field nests inside each ChatMessage, but its protobuf tag number
 * is UNKNOWN — the live capture was text-only and the prost binary embeds no
 * descriptor (see memory: devin-connect-tools-vision-2026-06-30). This harness
 * probes candidate tags by sending a tiny test image under each one against a
 * VISION-CAPABLE model and classifying the upstream reaction:
 *
 *   - A wrong tag collides with another field → decode/"internal" error, or the
 *     image is silently ignored (model says it sees no image).
 *   - The RIGHT tag → the model acknowledges the image content.
 *
 * This CANNOT run on a free account: swe-1.6 is not a vision model. It needs a
 * paid/vision entitlement (e.g. claude-opus-4.8, gemini-3-flash). It is BILLABLE
 * and OFF by default — set IMAGE_CALIBRATE_REAL=1 to actually fire.
 *
 * Usage:
 *   IMAGE_CALIBRATE_REAL=1 \
 *   CONNECT_SMOKE_TOKEN=<paid-token> \
 *   IMAGE_CALIBRATE_MODEL=claude-opus-4.8 \
 *   IMAGE_CALIBRATE_TAGS=4,5,6,10,11 \
 *   node scripts/devin-connect-image-calibrate.mjs
 *
 * The harness sets DEVIN_CONNECT_IMAGE_TAG per-probe (process.env) so the
 * builder emits the ImageData under that tag, then inspects the answer.
 */

import { readFileSync } from 'fs';
import { chat } from '../src/devin-connect.js';
import { resolveConnectSelector } from '../src/devin-connect-models.js';

const realCalls = process.env.IMAGE_CALIBRATE_REAL === '1';
// A 1x1 red PNG — smallest valid image, enough to ask "what color is this?".
const RED_DOT_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function resolveToken() {
  if (process.env.CONNECT_SMOKE_TOKEN) return process.env.CONNECT_SMOKE_TOKEN.trim();
  for (const k of ['DEVIN_CONNECT_TOKEN', 'DEVIN_SESSION_TOKEN', 'WINDSURF_SESSION_TOKEN']) {
    if (process.env[k]) return process.env[k].trim();
  }
  try {
    const accounts = JSON.parse(readFileSync(new URL('../accounts.json', import.meta.url), 'utf8'));
    const first = accounts.find((a) => a.apiKey);
    if (first) return first.apiKey;
  } catch {}
  return '';
}

// Candidate tags worth trying first. From P2-apiserver-methods-fields.md the
// ChatMessageInner declaration order is message_id, role, images, tool_call_id,
// tool_calls, reasoning_details, metadata, tool_search_result,
// hosted_tool_searches, content, thinking — but declaration order ≠ tag number
// (proto allows gaps). #1/#2/#3 are taken by message_id/role/content (content
// observed at #3 live). So `images` is most likely #4–#12. Default sweep:
const DEFAULT_TAGS = [4, 5, 6, 7, 10, 11, 12];

const model = process.env.IMAGE_CALIBRATE_MODEL || 'claude-opus-4.8';
const tags = (process.env.IMAGE_CALIBRATE_TAGS || DEFAULT_TAGS.join(','))
  .split(',').map((s) => Number.parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n) && n > 0);

const token = resolveToken();
const { selector } = resolveConnectSelector(model);

const visionPrompt = [
  { type: 'text', text: 'What single color fills this image? Answer with just the color word.' },
  { type: 'image_url', image_url: { url: `data:image/png;base64,${RED_DOT_PNG}` } },
];

async function probe(tag) {
  process.env.DEVIN_CONNECT_IMAGE_TAG = String(tag);
  try {
    const res = await chat({
      token, model: selector,
      messages: [{ role: 'user', content: visionPrompt }],
    });
    const text = (res.content || '').trim();
    const sawRed = /\bred\b/i.test(text);
    return { tag, ok: true, sawRed, answer: text.slice(0, 80) };
  } catch (err) {
    return { tag, ok: false, code: err.code || 'ERR', answer: String(err.message).slice(0, 80) };
  } finally {
    delete process.env.DEVIN_CONNECT_IMAGE_TAG;
  }
}

console.log(`[image-calibrate] model=${model} selector=${selector} tags=[${tags.join(',')}] real=${realCalls}`);
if (!token) { console.error('[image-calibrate] no token — set CONNECT_SMOKE_TOKEN or persist a paid account'); process.exit(2); }
if (!realCalls) {
  console.log('[image-calibrate] DRY RUN (IMAGE_CALIBRATE_REAL!=1). Encoder is wired; set the flag + a PAID token to probe.');
  console.log('[image-calibrate] Note: free swe-1.6 is NOT a vision model — calibration requires a paid/vision entitlement.');
  process.exit(0);
}

const results = [];
for (const tag of tags) {
  const r = await probe(tag);
  results.push(r);
  const verdict = r.ok ? (r.sawRed ? 'HIT (model saw red!)' : 'accepted but image ignored') : `rejected (${r.code})`;
  console.log(`  tag=${String(tag).padStart(3)} → ${verdict}  answer="${r.answer}"`);
}

const hit = results.find((r) => r.ok && r.sawRed);
console.log(`\n${'─'.repeat(60)}`);
if (hit) {
  console.log(`✅ CALIBRATED: images field tag = ${hit.tag}`);
  console.log(`   Set DEVIN_CONNECT_IMAGE_TAG=${hit.tag} in production and record it to memory.`);
} else {
  console.log('❌ No tag in the sweep made the model see the image.');
  console.log('   Widen IMAGE_CALIBRATE_TAGS, confirm the model is vision-capable, or capture a real');
  console.log('   vision turn from devin.exe via MITM to read the tag directly.');
}
process.exit(hit ? 0 : 1);
