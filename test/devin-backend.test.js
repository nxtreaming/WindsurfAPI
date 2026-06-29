import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDevinBackendConfig,
  isDevinBackendEnabled,
  buildDevinHeaders,
  orgPathSegment,
  probePostAuth,
  listSessions,
  listSessionsFallback,
  getSession,
  getFirstLoadEvents,
  getOrganization,
  buildEventStreamRequest,
  createSession,
  sendPrompt,
} from '../src/devin-backend.js';
import { VERSION } from '../src/version.js';

const ENV_KEYS = [
  'DEVIN_BACKEND_BASE_URL',
  'DEVIN_BACKEND_TOKEN',
  'DEVIN_BACKEND_ORG_ID',
  'DEVIN_BACKEND_ENABLED',
  'WINDSURF_API_KEY',
];
const originalEnv = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
});

// A mock fetch that records the call and returns a canned 2xx JSON response.
// No real network is ever touched.
function mockFetch(jsonBody, { ok = true, status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok,
      status,
      json: async () => jsonBody,
    };
  };
  return { fetchImpl, calls };
}

const baseCfg = () => ({
  baseUrl: 'https://app.devin.ai/api',
  token: 'devin-session-token$abc123',
  orgId: 'org-acme',
  enabled: true,
});

describe('devin-backend config', () => {
  it('reads base url, token, org, and enabled flag from env', () => {
    const cfg = getDevinBackendConfig({
      DEVIN_BACKEND_BASE_URL: 'https://app.devin.ai/api/',
      DEVIN_BACKEND_TOKEN: 'tok-1',
      DEVIN_BACKEND_ORG_ID: 'org-x',
      DEVIN_BACKEND_ENABLED: '1',
    });
    assert.equal(cfg.baseUrl, 'https://app.devin.ai/api'); // trailing slash stripped
    assert.equal(cfg.token, 'tok-1');
    assert.equal(cfg.orgId, 'org-x');
    assert.equal(cfg.enabled, true);
  });

  it('defaults base url and falls back to WINDSURF_API_KEY for token', () => {
    const cfg = getDevinBackendConfig({ WINDSURF_API_KEY: 'ws-key' });
    assert.equal(cfg.baseUrl, 'https://app.devin.ai/api');
    assert.equal(cfg.token, 'ws-key');
    assert.equal(cfg.orgId, '');
    assert.equal(cfg.enabled, false);
  });

  it('prefers DEVIN_BACKEND_TOKEN over WINDSURF_API_KEY', () => {
    const cfg = getDevinBackendConfig({ DEVIN_BACKEND_TOKEN: 'primary', WINDSURF_API_KEY: 'fallback' });
    assert.equal(cfg.token, 'primary');
  });

  it('is disabled by default', () => {
    assert.equal(isDevinBackendEnabled({}), false);
    assert.equal(isDevinBackendEnabled({ DEVIN_BACKEND_ENABLED: '1' }), true);
  });
});

describe('devin-backend header assembly', () => {
  it('builds Bearer + x-cog-org-id + defaults', () => {
    const h = buildDevinHeaders(baseCfg());
    assert.equal(h.Authorization, 'Bearer devin-session-token$abc123');
    assert.equal(h['x-cog-org-id'], 'org-acme');
    assert.equal(h.Accept, 'application/json');
    assert.equal(h['Content-Type'], 'application/json');
    assert.equal(h['User-Agent'], `WindsurfAPI/${VERSION}`);
  });

  it('omits x-cog-org-id when orgId is empty', () => {
    const h = buildDevinHeaders({ ...baseCfg(), orgId: '' });
    assert.equal(h.Authorization, 'Bearer devin-session-token$abc123');
    assert.ok(!('x-cog-org-id' in h));
  });

  it('lets extra headers override (e.g. SSE Accept)', () => {
    const h = buildDevinHeaders(baseCfg(), { Accept: 'text/event-stream' });
    assert.equal(h.Accept, 'text/event-stream');
  });

  it('throws when token missing', () => {
    assert.throws(() => buildDevinHeaders({ ...baseCfg(), token: '' }), /token is not configured/);
  });
});

describe('devin-backend org path segment', () => {
  it('normalizes bare and prefixed org ids to org-{bare}', () => {
    assert.equal(orgPathSegment('acme'), 'org-acme');
    assert.equal(orgPathSegment('org-acme'), 'org-acme');
  });
  it('throws on empty org id', () => {
    assert.throws(() => orgPathSegment(''), /orgId is not configured/);
  });
});

describe('devin-backend read endpoints (mocked fetch, no network)', () => {
  it('probePostAuth POSTs /users/post-auth with empty body and no org header', async () => {
    const { fetchImpl, calls } = mockFetch({ org_id: 'org-acme', org_name: 'Acme', email: 'a@b.c' });
    const out = await probePostAuth(baseCfg(), { fetchImpl });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://app.devin.ai/api/users/post-auth');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.body, '{}');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer devin-session-token$abc123');
    // probe derives org_id, so it must not send x-cog-org-id
    assert.ok(!('x-cog-org-id' in calls[0].init.headers));
    assert.deepEqual(out, { org_id: 'org-acme', org_name: 'Acme', email: 'a@b.c' });
  });

  it('listSessions GETs /org-{bare}/v2sessions', async () => {
    const { fetchImpl, calls } = mockFetch({ sessions: [] });
    await listSessions(baseCfg(), { fetchImpl });
    assert.equal(calls[0].url, 'https://app.devin.ai/api/org-acme/v2sessions');
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers['x-cog-org-id'], 'org-acme');
  });

  it('listSessionsFallback GETs /sessions', async () => {
    const { fetchImpl, calls } = mockFetch({ sessions: [] });
    await listSessionsFallback(baseCfg(), { fetchImpl });
    assert.equal(calls[0].url, 'https://app.devin.ai/api/sessions');
  });

  it('getSession GETs /sessions/{id} url-encoded', async () => {
    const { fetchImpl, calls } = mockFetch({ id: 'd 1' });
    await getSession(baseCfg(), 'd 1', { fetchImpl });
    assert.equal(calls[0].url, 'https://app.devin.ai/api/sessions/d%201');
  });

  it('getFirstLoadEvents GETs /events/first-load/{id}', async () => {
    const { fetchImpl, calls } = mockFetch({ events: [] });
    await getFirstLoadEvents(baseCfg(), 'devin-1', { fetchImpl });
    assert.equal(calls[0].url, 'https://app.devin.ai/api/events/first-load/devin-1');
  });

  it('getOrganization GETs /organizations/{orgId}', async () => {
    const { fetchImpl, calls } = mockFetch({ id: 'org-acme' });
    await getOrganization(baseCfg(), { fetchImpl });
    assert.equal(calls[0].url, 'https://app.devin.ai/api/organizations/org-acme');
  });

  it('propagates HTTP errors as tagged errors', async () => {
    const { fetchImpl } = mockFetch({}, { ok: false, status: 401 });
    await assert.rejects(() => listSessions(baseCfg(), { fetchImpl }), (e) => {
      assert.equal(e.status, 401);
      assert.equal(e.type, 'backend_error');
      return true;
    });
  });

  it('maps 5xx to 502 backend_error', async () => {
    const { fetchImpl } = mockFetch({}, { ok: false, status: 500 });
    await assert.rejects(() => getSession(baseCfg(), 'x', { fetchImpl }), (e) => {
      assert.equal(e.status, 502);
      return true;
    });
  });
});

describe('devin-backend SSE request builder', () => {
  it('builds the event-stream url + text/event-stream Accept', () => {
    const req = buildEventStreamRequest(baseCfg(), 'devin-9');
    assert.equal(req.url, 'https://app.devin.ai/api/events/devin-9/stream');
    assert.equal(req.headers.Accept, 'text/event-stream');
    assert.equal(req.headers.Authorization, 'Bearer devin-session-token$abc123');
    assert.equal(req.headers['x-cog-org-id'], 'org-acme');
  });
});

describe('devin-backend write surface (unverified — must stay stubbed)', () => {
  it('createSession throws not_implemented (never fakes a route)', async () => {
    await assert.rejects(() => createSession(baseCfg(), { prompt: 'hi' }), (e) => {
      assert.equal(e.status, 501);
      assert.equal(e.type, 'not_implemented');
      return true;
    });
  });

  it('sendPrompt throws not_implemented (never fakes a route)', async () => {
    await assert.rejects(() => sendPrompt(baseCfg(), 'sid', { prompt: 'hi' }), (e) => {
      assert.equal(e.status, 501);
      assert.equal(e.type, 'not_implemented');
      return true;
    });
  });
});
