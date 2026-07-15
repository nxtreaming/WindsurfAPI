/**
 * Cline compatibility layer — standalone, pluggable, and OFF by default.
 *
 * WHY THIS EXISTS
 * Cline's "OpenAI Compatible" provider is built on Vercel's
 * `@ai-sdk/openai-compatible`. That client is stricter than the OpenAI spec in
 * one load-bearing place: it gates every tool call behind `isParsableJson(args)`
 * and SILENTLY DROPS the call when the accumulated `function.arguments` string
 * is not parseable JSON (vercel/ai#6687). Claude — which we forward — emits
 * `arguments: ""` for a parameterless tool. Empty string is not parseable, so
 * the tool call never executes, the agent stalls, and nothing surfaces the
 * failure. This layer normalizes that (and future Cline-specific edges) at the
 * egress boundary.
 *
 * DESIGN CONTRACT
 * - Standard `/v1/*` stays BYTE-IDENTICAL unless this layer is explicitly
 *   activated. Activation has two independent sources:
 *     1. endpoint  — the request came through the dedicated `/v1/cline/*`
 *        namespace. This is an explicit opt-in a partner points Cline at, so it
 *        is active EVEN WHEN the master toggle is off (the namespace IS the
 *        consent). A stable address that never depends on a dashboard flag.
 *     2. detect    — the request looks like Cline (User-Agent) AND the master
 *        `experimental.clineCompat` toggle is on. This is the "auto-apply to any
 *        Cline client hitting the normal endpoint" path, so it is gated behind
 *        the operator's explicit opt-in.
 * - This module holds ZERO I/O and ZERO imports from the request pipeline, so it
 *   stays trivially testable and cannot perturb the default path by mere import.
 */

const CLINE_ENDPOINT_PREFIX = '/v1/cline/';

// Process-wide counters surfaced in the dashboard diagnostics card. Reset only
// in tests. Cheap monotonic ints — no per-request allocation.
const _stats = { argRepairs: 0 };

/**
 * Coalesce a tool-call arguments string into something `isParsableJson` accepts.
 * Empty, whitespace-only, or unparseable → "{}". Anything that already parses as
 * JSON (object, array, or scalar) is returned VERBATIM — we must not rewrite a
 * value the model deliberately produced, only rescue the ones the SDK would drop.
 */
export function normalizeToolCallArgs(argsStr) {
  if (typeof argsStr !== 'string') return '{}';
  const trimmed = argsStr.trim();
  if (trimmed === '') return '{}';
  try {
    JSON.parse(trimmed);
    // Return the TRIMMED form, not the original. JS String.trim() strips the
    // full Unicode White_Space set (NBSP U+00A0, BOM U+FEFF, U+2028/U+2029,
    // U+2000-200A, U+3000), but JSON's grammar only permits space/tab/LF/CR. So
    // an arg like " {}" makes `trimmed` ("{}") parse while the ORIGINAL
    // stays unparseable — returning the original would hand @ai-sdk a string it
    // still rejects, silently dropping the very tool call we exist to rescue.
    // `trimmed` is guaranteed parseable and semantically identical (whitespace
    // outside JSON tokens carries no meaning).
    return trimmed;
  } catch {
    return '{}';
  }
}

/**
 * Identify a Cline client from request headers. Cline's provider stack sets a
 * User-Agent carrying "cline" (the VS Code extension and its @ai-sdk transport).
 * Case-insensitive substring match — narrow enough not to catch unrelated
 * clients, broad enough to survive version/format churn.
 */
export function detectClineClient(headers) {
  if (!headers || typeof headers !== 'object') return false;
  const ua = String(headers['user-agent'] || headers['User-Agent'] || '');
  return /cline/i.test(ua);
}

/**
 * Resolve whether the Cline compat layer is active for this request, and why.
 * Pure function of (path, headers, masterEnabled) so it is fully unit-testable.
 * Returns { active, source } where source ∈ 'endpoint' | 'detect' | null.
 */
export function resolveClineCompat({ path = '', headers = {}, masterEnabled = false } = {}) {
  if (typeof path === 'string' && path.startsWith(CLINE_ENDPOINT_PREFIX)) {
    return { active: true, source: 'endpoint' };
  }
  if (masterEnabled && detectClineClient(headers)) {
    return { active: true, source: 'detect' };
  }
  return { active: false, source: null };
}

/**
 * Rewrite a `/v1/cline/<rest>` path to its canonical `/v1/<rest>` form so the
 * dedicated namespace reuses the existing handlers instead of duplicating them.
 * Returns the input unchanged when it is not a cline-namespaced path.
 */
export function stripClineNamespace(path) {
  if (typeof path !== 'string' || !path.startsWith(CLINE_ENDPOINT_PREFIX)) return path;
  return '/v1/' + path.slice(CLINE_ENDPOINT_PREFIX.length);
}

export function recordArgRepair() { _stats.argRepairs++; }
export function getClineCompatStats() { return { argRepairs: _stats.argRepairs }; }
export function resetClineCompatStats() { _stats.argRepairs = 0; }
