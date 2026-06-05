const stats = {
  requests: 0,
  mappedTools: 0,
  unmappedTools: 0,
  additionalSteps: 0,
  accountGateRejects: 0,
  accountGateSkips: 0,
  cascadeToolCalls: 0,
  emittedToolCalls: 0,
  providerXmlToolCalls: 0,
  unmappedCascadeToolCalls: 0,
  noToolCallResponses: 0,
  requestedByTool: Object.create(null),
  unmappedRequestedByTool: Object.create(null),
  emittedByTool: Object.create(null),
  byCascadeKind: Object.create(null),
  unmappedByCascadeKind: Object.create(null),
};

function bump(obj, key, n = 1) {
  const k = String(key || '(unknown)');
  obj[k] = (obj[k] || 0) + n;
}

export function recordNativeBridgeRequest({ mappedTools = [], unmappedTools = [], additionalSteps = 0 } = {}) {
  stats.requests++;
  stats.mappedTools += Array.isArray(mappedTools) ? mappedTools.length : 0;
  stats.unmappedTools += Array.isArray(unmappedTools) ? unmappedTools.length : 0;
  stats.additionalSteps += Math.max(0, Number(additionalSteps) || 0);
  for (const name of mappedTools || []) bump(stats.requestedByTool, name);
  for (const name of unmappedTools || []) bump(stats.unmappedRequestedByTool, name);
}

export function recordNativeBridgeAccountGateReject() {
  stats.accountGateRejects++;
}

export function recordNativeBridgeAccountGateSkip() {
  stats.accountGateSkips++;
}

export function recordNativeBridgeCascadeToolCall(kind) {
  stats.cascadeToolCalls++;
  bump(stats.byCascadeKind, kind);
}

export function recordNativeBridgeEmittedToolCall(name, { source = 'cascade' } = {}) {
  stats.emittedToolCalls++;
  bump(stats.emittedByTool, name);
  if (source === 'provider_xml') stats.providerXmlToolCalls++;
}

export function recordNativeBridgeUnmappedCascadeToolCall(kind) {
  stats.unmappedCascadeToolCalls++;
  bump(stats.unmappedByCascadeKind, kind);
}

export function recordNativeBridgeNoToolCallResponse() {
  stats.noToolCallResponses++;
}

export function getNativeBridgeStats() {
  return {
    ...stats,
    requestedByTool: { ...stats.requestedByTool },
    unmappedRequestedByTool: { ...stats.unmappedRequestedByTool },
    emittedByTool: { ...stats.emittedByTool },
    byCascadeKind: { ...stats.byCascadeKind },
    unmappedByCascadeKind: { ...stats.unmappedByCascadeKind },
  };
}

export function resetNativeBridgeStats() {
  for (const key of Object.keys(stats)) {
    if (key === 'requestedByTool' || key === 'unmappedRequestedByTool' || key === 'emittedByTool' || key === 'byCascadeKind' || key === 'unmappedByCascadeKind') {
      stats[key] = Object.create(null);
    } else {
      stats[key] = 0;
    }
  }
}
