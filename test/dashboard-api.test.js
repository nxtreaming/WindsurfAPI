import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { configureBindHost } from '../src/auth.js';
import { buildBatchProxyBinding, handleDashboardApi } from '../src/dashboard/api.js';
import {
  recordNativeBridgeDecision,
  resetNativeBridgeStats,
} from '../src/native-bridge-stats.js';

const originalDashboardPassword = config.dashboardPassword;
const originalApiKey = config.apiKey;
const originalNativeBridgeApiKeys = process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_API_KEYS;
const originalNativeBridgeAccounts = process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_ACCOUNTS;

afterEach(() => {
  config.dashboardPassword = originalDashboardPassword;
  config.apiKey = originalApiKey;
  if (originalNativeBridgeApiKeys === undefined) delete process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_API_KEYS;
  else process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_API_KEYS = originalNativeBridgeApiKeys;
  if (originalNativeBridgeAccounts === undefined) delete process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_ACCOUNTS;
  else process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_ACCOUNTS = originalNativeBridgeAccounts;
  resetNativeBridgeStats();
  configureBindHost('0.0.0.0');
});

function fakeRes() {
  return {
    statusCode: 0,
    body: '',
    writeHead(status) { this.statusCode = status; },
    end(chunk) { this.body += chunk ? String(chunk) : ''; },
    json() { return this.body ? JSON.parse(this.body) : null; },
  };
}

describe('dashboard batch import proxy binding', () => {
  it('uses nested result.account.id from processWindsurfLogin output', () => {
    const binding = buildBatchProxyBinding(
      { success: true, account: { id: 'acct_123' } },
      'socks5://user:pass@proxy.example.com:1080'
    );
    assert.equal(binding.accountId, 'acct_123');
    assert.deepEqual(binding.proxy, {
      type: 'socks5',
      host: 'proxy.example.com',
      port: 1080,
      username: 'user',
      password: 'pass',
    });
  });

  it('fails closed for dashboard write APIs without auth on non-localhost binds', async () => {
    config.dashboardPassword = '';
    config.apiKey = '';
    configureBindHost('0.0.0.0');

    const res = fakeRes();
    await handleDashboardApi('DELETE', '/cache', {}, { headers: {} }, res);

    assert.equal(res.statusCode, 401);
    assert.match(res.json().error, /Unauthorized/);
  });

  it('allows unauthenticated dashboard writes only on localhost binds', async () => {
    config.dashboardPassword = '';
    config.apiKey = '';
    configureBindHost('127.0.0.1');

    const res = fakeRes();
    await handleDashboardApi('GET', '/cache', {}, { headers: {} }, res);

    assert.equal(res.statusCode, 200);
  });

  it('accepts dashboard auth headers with timing-safe configured secrets', async () => {
    config.dashboardPassword = 'dash-secret';
    config.apiKey = '';
    configureBindHost('0.0.0.0');

    const res = fakeRes();
    await handleDashboardApi('GET', '/cache', {}, { headers: { 'x-dashboard-password': 'dash-secret' } }, res);

    assert.equal(res.statusCode, 200);
  });

  it('includes sanitized native bridge telemetry in authenticated overview', async () => {
    config.dashboardPassword = 'dash-secret';
    config.apiKey = '';
    configureBindHost('0.0.0.0');
    process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_API_KEYS = 'secret-api-key';
    process.env.WINDSURFAPI_NATIVE_TOOL_BRIDGE_ACCOUNTS = 'secret-account';
    recordNativeBridgeDecision({
      enabled: false,
      reason: 'native_bridge_model_not_allowed',
      mode: 'all_mapped',
      modelKey: 'gpt-5.5-medium',
      mappedTools: ['Read'],
      unmappedTools: ['update_plan'],
      callerKey: 'api:secret-caller',
    });

    const res = fakeRes();
    await handleDashboardApi('GET', '/overview', {}, { headers: { 'x-dashboard-password': 'dash-secret' } }, res);
    const body = res.json();
    const raw = JSON.stringify(body);

    assert.equal(res.statusCode, 200);
    assert.equal(body.nativeBridge.decisions, 1);
    assert.equal(body.nativeBridge.decisionReasons.native_bridge_model_not_allowed, 1);
    assert.equal(body.nativeBridgeConfig.hasApiKeyGate, true);
    assert.equal(body.nativeBridgeConfig.hasAccountGate, true);
    assert.equal(raw.includes('secret-api-key'), false);
    assert.equal(raw.includes('secret-account'), false);
    assert.equal(raw.includes('secret-caller'), false);
  });
});
