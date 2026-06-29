/**
 * Devin web backend (app.devin.ai) REST/SSE adapter — escape-hatch PATH B.
 *
 * Cascade's gRPC backend (server.self-serve.windsurf.com) is scheduled to retire
 * 2026-07-01 (see memory: cascade-retirement-2026-07-01). Two forward paths exist:
 *   PATH A — Devin CLI local subprocess (src/special-agent.js + src/devin-acp.js)
 *   PATH B — direct app.devin.ai REST/SSE (THIS FILE)
 *
 * SCOPE OF THIS SCAFFOLD: only the VERIFIED protocol surface is implemented.
 * Verified facts come from dao-devin-export v1.4.3 source + official docs and are
 * recorded in .workflow-results/REF-devin-backend-protocol.md. Everything verified
 * here is READ-ONLY (auth probe + list/detail/event/org reads). The WRITE surface a
 * real reverse-proxy needs (create-session + send-prompt) is NOT present in any
 * verified source, so it is left as explicit TODO stubs that throw — never faked.
 *
 * Design notes:
 * - Zero npm deps; uses global fetch (Node >=20). `fetchImpl` is injectable so unit
 *   tests can mock the network and CI never touches app.devin.ai.
 * - Nothing here runs at import time and no function dials the network unless called.
 * - All values treated as data; no shell, no eval.
 */

import { VERSION } from './version.js';

const DEFAULT_BASE_URL = 'https://app.devin.ai/api';

/**
 * Build the runtime config from env. Pure — no I/O, safe to call anytime.
 * Token/org are referenced by key name only and never logged by this module.
 *
 *   DEVIN_BACKEND_BASE_URL   override API base (default https://app.devin.ai/api)
 *   DEVIN_BACKEND_TOKEN      Bearer token (devin-session-token$… / JWT / auth1_…)
 *                            falls back to WINDSURF_API_KEY (same key system the
 *                            Devin CLI uses — see memory: devin-acp-live-verified)
 *   DEVIN_BACKEND_ORG_ID     org id, form `org-XXXX` (x-cog-org-id header)
 *   DEVIN_BACKEND_ENABLED=1  feature flag; off by default
 */
export function getDevinBackendConfig(env = process.env) {
  const baseUrl = String(env.DEVIN_BACKEND_BASE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  return {
    baseUrl,
    token: String(env.DEVIN_BACKEND_TOKEN || env.WINDSURF_API_KEY || '').trim(),
    orgId: String(env.DEVIN_BACKEND_ORG_ID || '').trim(),
    enabled: env.DEVIN_BACKEND_ENABLED === '1',
  };
}

export function isDevinBackendEnabled(env = process.env) {
  return getDevinBackendConfig(env).enabled;
}

/**
 * Assemble the standard auth headers.
 *   Authorization: Bearer <token>          (verified — all calls)
 *   x-cog-org-id:  <orgId>                 (verified — all calls; omitted if unset,
 *                                           e.g. the post-auth call that *derives* it)
 *   Accept / User-Agent / Content-Type     (sane defaults)
 *
 * `extra` is merged last so callers can add e.g. Accept: text/event-stream for SSE.
 */
export function buildDevinHeaders(cfg, extra = {}) {
  if (!cfg || !cfg.token) {
    throw Object.assign(new Error('Devin backend token is not configured'), {
      status: 401,
      type: 'backend_misconfigured',
    });
  }
  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': `WindsurfAPI/${VERSION}`,
  };
  if (cfg.orgId) headers['x-cog-org-id'] = cfg.orgId;
  return { ...headers, ...extra };
}

/**
 * The org path segment. dao uses `org-{bare}` where {bare} is the org id with any
 * leading `org-` stripped, so `org-abc` and `abc` both yield `org-abc`.
 */
export function orgPathSegment(orgId) {
  const bare = String(orgId || '').replace(/^org-/, '');
  if (!bare) {
    throw Object.assign(new Error('Devin backend orgId is not configured'), {
      status: 400,
      type: 'backend_misconfigured',
    });
  }
  return `org-${bare}`;
}

function joinUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Low-level JSON request helper. Injectable `fetchImpl` keeps tests offline.
 * Returns parsed JSON on 2xx; throws a tagged Error otherwise.
 */
async function requestJson(cfg, method, path, { body, extraHeaders, fetchImpl } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw Object.assign(new Error('fetch is not available'), { status: 500, type: 'backend_misconfigured' });
  }
  const url = joinUrl(cfg.baseUrl, path);
  const headers = buildDevinHeaders(cfg, extraHeaders);
  const init = { method, headers };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);

  const res = await fetchFn(url, init);
  if (!res.ok) {
    const err = new Error(`Devin backend ${method} ${path} failed: ${res.status}`);
    err.status = res.status === 401 || res.status === 403 ? res.status : 502;
    err.type = 'backend_error';
    throw err;
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// VERIFIED READ surface
// ---------------------------------------------------------------------------

/**
 * Liveness + entitlement probe. POST /users/post-auth with a Bearer token and an
 * empty body returns {org_id, org_name, email}. Zero-cost (no model billed), so it
 * doubles as "is this token still alive and what org does it map to" after 7/1.
 *
 * NOTE: callers must NOT hit the real network in unit tests — pass a mock fetchImpl.
 * Returns the parsed org info; does not mutate cfg.
 */
export async function probePostAuth(cfg, { fetchImpl } = {}) {
  // x-cog-org-id is intentionally not required here: this call derives org_id.
  const probeCfg = { ...cfg, orgId: '' };
  return requestJson(probeCfg, 'POST', '/users/post-auth', { body: {}, fetchImpl });
}

/** GET /org-{bare}/v2sessions — session list (primary). */
export async function listSessions(cfg, { fetchImpl } = {}) {
  const seg = orgPathSegment(cfg.orgId);
  return requestJson(cfg, 'GET', `/${seg}/v2sessions`, { fetchImpl });
}

/** GET /sessions — session list (verified fallback when v2sessions is unavailable). */
export async function listSessionsFallback(cfg, { fetchImpl } = {}) {
  return requestJson(cfg, 'GET', '/sessions', { fetchImpl });
}

/** GET /sessions/{devinId} — single session detail. */
export async function getSession(cfg, devinId, { fetchImpl } = {}) {
  const id = encodeURIComponent(String(devinId || ''));
  if (!id) throw Object.assign(new Error('devinId is required'), { status: 400, type: 'bad_request' });
  return requestJson(cfg, 'GET', `/sessions/${id}`, { fetchImpl });
}

/** GET /events/first-load/{devinId} — first-screen events for a session. */
export async function getFirstLoadEvents(cfg, devinId, { fetchImpl } = {}) {
  const id = encodeURIComponent(String(devinId || ''));
  if (!id) throw Object.assign(new Error('devinId is required'), { status: 400, type: 'bad_request' });
  return requestJson(cfg, 'GET', `/events/first-load/${id}`, { fetchImpl });
}

/** GET /organizations/{orgId} — org settings. */
export async function getOrganization(cfg, { fetchImpl } = {}) {
  const id = encodeURIComponent(String(cfg.orgId || ''));
  if (!id) throw Object.assign(new Error('orgId is required'), { status: 400, type: 'bad_request' });
  return requestJson(cfg, 'GET', `/organizations/${id}`, { fetchImpl });
}

/**
 * Build (do NOT open) the SSE event-stream URL + headers for a session.
 * GET /events/{devinId}/stream with Accept: text/event-stream.
 *
 * Returned as {url, headers} rather than an open connection so the caller owns the
 * fetch/abort lifecycle and tests can assert the URL/headers without a live socket.
 */
export function buildEventStreamRequest(cfg, devinId) {
  const id = encodeURIComponent(String(devinId || ''));
  if (!id) throw Object.assign(new Error('devinId is required'), { status: 400, type: 'bad_request' });
  return {
    url: joinUrl(cfg.baseUrl, `/events/${id}/stream`),
    headers: buildDevinHeaders(cfg, { Accept: 'text/event-stream' }),
  };
}

// ---------------------------------------------------------------------------
// WRITE surface — UNVERIFIED. Stubs only. Do NOT implement with guessed routes.
// ---------------------------------------------------------------------------
//
// A real reverse proxy needs to CREATE a session and SEND a prompt to run the
// agent. dao-devin-export is an export-only tool and exposes NO write endpoint,
// and no other verified source documents one. The route, request shape, and
// streaming contract are all unknown.
//
// These stubs preserve the intended call signatures so the rest of the codebase
// can be wired up, but they throw rather than guess. To implement: capture Devin
// Desktop's network traffic (create-session + send-prompt) and replace the TODOs
// with the observed route + payload, then add real (mocked) tests.

const NOT_IMPLEMENTED = (name) => Object.assign(
  new Error(`${name} is not implemented: Devin backend write endpoint is unverified`),
  { status: 501, type: 'not_implemented' },
);

/**
 * Create a new agent session.
 * @param {object} cfg     backend config from getDevinBackendConfig()
 * @param {object} opts    { prompt?, model?, ... } — shape TBD
 * @returns {Promise<{sessionId: string}>}
 *
 * TODO(unverified): 需逆向 Devin Desktop 网络请求确认写端点
 *   - route + method (likely POST /org-{bare}/… or /sessions — UNCONFIRMED)
 *   - request body shape (prompt / model / repo / snapshot fields — UNKNOWN)
 *   - response shape (where the new session/devin id lives — UNKNOWN)
 */
// eslint-disable-next-line no-unused-vars
export async function createSession(cfg, opts = {}) {
  throw NOT_IMPLEMENTED('createSession');
}

/**
 * Send a prompt/message to an existing session and stream the agent's reply.
 * @param {object} cfg        backend config
 * @param {string} sessionId  id from createSession()
 * @param {object} opts       { prompt, ... } — shape TBD
 * @returns {Promise<{text: string, raw?: any}>}  (or an async stream — TBD)
 *
 * TODO(unverified): 需逆向 Devin Desktop 网络请求确认写端点
 *   - send route + method (UNCONFIRMED)
 *   - whether the reply comes back on this response or only via the
 *     /events/{devinId}/stream SSE channel (buildEventStreamRequest) — UNKNOWN
 *   - prompt payload shape and how model selection is passed — UNKNOWN
 */
// eslint-disable-next-line no-unused-vars
export async function sendPrompt(cfg, sessionId, opts = {}) {
  throw NOT_IMPLEMENTED('sendPrompt');
}

export const __testing = { joinUrl, requestJson, DEFAULT_BASE_URL };
