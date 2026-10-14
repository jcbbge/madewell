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

export function parseResponse(text) {
  const body = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try { return JSON.parse(body); } catch {}
  const start = body.indexOf('{'), end = body.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
  throw new Error('Response is not JSON');
}
