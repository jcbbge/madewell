// Reproduces the historical blind/repeated-write defect with native pi events.
// Guard selection belongs to this fixture alone. Production must execute it.
export default function (pi: any) {
  let grounded = false;
  let previous = '';
  const allowed = new Set<string>();
  pi.on('session_start', () => { grounded = false; previous = ''; allowed.clear(); });
  pi.on('tool_call', (event: any, ctx: any) => {
    if (process.env.PI_OFFLINE !== '1' || process.env.WORK || process.env.WORK_TOKEN) throw new Error('fixture worker environment');
    if (!ctx.sessionManager.getSessionId() || !Array.isArray(ctx.sessionManager.getBranch())) throw new Error('native session context required');
    if (!['read', 'write', 'bash'].includes(event.toolName) || !event.toolCallId) throw new Error('native tool envelope required');
    if (process.env.DOCTOR_FIXTURE_GUARDED !== '1' || process.env.PI_DURABLE_WORKER !== '1') {
      if (event.toolName === 'write' && !grounded && (!previous || previous === event.input.path)) return { block: true, reason: 'fixture grounding refusal' };
    }
    allowed.add(event.toolCallId);
  });
  pi.on('tool_result', (event: any) => {
    if (!allowed.delete(event.toolCallId)) throw new Error('result emitted for refused or unknown tool call');
    if (event.isError) return;
    if (event.toolName === 'read') grounded = true;
    if (event.toolName === 'write') { grounded = false; previous = event.input.path; }
  });
}
