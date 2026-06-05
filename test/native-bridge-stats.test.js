import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getNativeBridgeStats,
  recordNativeBridgeAccountGateReject,
  recordNativeBridgeAccountGateSkip,
  recordNativeBridgeCascadeToolCall,
  recordNativeBridgeEmittedToolCall,
  recordNativeBridgeNoToolCallResponse,
  recordNativeBridgeRequest,
  recordNativeBridgeUnmappedCascadeToolCall,
  resetNativeBridgeStats,
} from '../src/native-bridge-stats.js';

describe('native bridge runtime stats', () => {
  beforeEach(() => resetNativeBridgeStats());

  it('records request, tool, cascade kind, fallback and gate counters', () => {
    recordNativeBridgeRequest({
      mappedTools: ['Read', 'Bash'],
      unmappedTools: ['update_plan'],
      additionalSteps: 2,
    });
    recordNativeBridgeCascadeToolCall('run_command');
    recordNativeBridgeEmittedToolCall('Bash', { source: 'cascade' });
    recordNativeBridgeEmittedToolCall('Read', { source: 'provider_xml' });
    recordNativeBridgeUnmappedCascadeToolCall('list_directory');
    recordNativeBridgeAccountGateReject();
    recordNativeBridgeAccountGateSkip();
    recordNativeBridgeNoToolCallResponse();

    const stats = getNativeBridgeStats();
    assert.equal(stats.requests, 1);
    assert.equal(stats.mappedTools, 2);
    assert.equal(stats.unmappedTools, 1);
    assert.equal(stats.additionalSteps, 2);
    assert.equal(stats.cascadeToolCalls, 1);
    assert.equal(stats.emittedToolCalls, 2);
    assert.equal(stats.providerXmlToolCalls, 1);
    assert.equal(stats.unmappedCascadeToolCalls, 1);
    assert.equal(stats.accountGateRejects, 1);
    assert.equal(stats.accountGateSkips, 1);
    assert.equal(stats.noToolCallResponses, 1);
    assert.equal(stats.requestedByTool.Read, 1);
    assert.equal(stats.requestedByTool.Bash, 1);
    assert.equal(stats.unmappedRequestedByTool.update_plan, 1);
    assert.equal(stats.emittedByTool.Read, 1);
    assert.equal(stats.emittedByTool.Bash, 1);
    assert.equal(stats.byCascadeKind.run_command, 1);
    assert.equal(stats.byCascadeKind.list_directory, undefined);
    assert.equal(stats.unmappedByCascadeKind.list_directory, 1);
  });

  it('returns copies so callers cannot mutate counters', () => {
    recordNativeBridgeRequest({ mappedTools: ['Glob'] });
    const snapshot = getNativeBridgeStats();
    snapshot.requestedByTool.Glob = 0;
    snapshot.unmappedRequestedByTool.Edit = 1;
    snapshot.unmappedByCascadeKind.find = 1;
    assert.equal(getNativeBridgeStats().requestedByTool.Glob, 1);
    assert.equal(getNativeBridgeStats().unmappedRequestedByTool.Edit, undefined);
    assert.equal(getNativeBridgeStats().unmappedByCascadeKind.find, undefined);
  });
});
