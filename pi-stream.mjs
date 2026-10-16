// Only authoritative assistant message_end records contribute, never stream deltas.
export function summarizePi(raw) {
  const events = raw.split('\n').filter(line => line.trim()).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const messages = events.filter(e => e.type === 'message_end' && e.message?.role === 'assistant').map(e => e.message);
  const last = messages.at(-1);
  return {
    output: (last?.content ?? []).filter(c => c.type === 'text').map(c => c.text).join('\n'),
    settled: events.some(e => e.type === 'agent_settled'),
    finalStopReason: last?.stopReason ?? null,
    toolCalls: events.filter(e => e.type === 'tool_execution_start').length,
    error: last?.errorMessage ?? '',
  };
}

// The answer's JSON is its last JSON object. A report may quote code with braces before it,
// so take the last fenced json block, else the last '{' that starts a complete object.
export function parseResponse(text) {
  const body = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try { return JSON.parse(body); } catch {}
  for (const block of [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(m => m[1].trim()).reverse()) {
    try { const v = JSON.parse(block); if (v && typeof v === 'object') return v; } catch {}
  }
  const end = body.lastIndexOf('}');
  for (let i = body.lastIndexOf('{', end); i >= 0; i = body.lastIndexOf('{', i - 1)) {
    try { const v = JSON.parse(body.slice(i, end + 1)); if (v && typeof v === 'object') return v; } catch {}
    if (i === 0) break;
  }
  throw new Error('Response is not JSON');
}
