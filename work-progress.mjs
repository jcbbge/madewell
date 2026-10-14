import { Type } from '@earendil-works/pi-ai';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Loaded only into step workers. Reports deliverables to the work record and receives
// the 30-minute silence check-in. Progress is not acceptance.
export default function durableProgress(pi) {
  const attemptId = process.env.PI_DURABLE_ATTEMPT, inbox = process.env.PI_DURABLE_CHECKIN;
  if (!attemptId || !inbox) return;
  let watcher, lastQuestion = null;
  pi.registerTool({
    name: 'durable_progress', label: 'Report deliverable',
    description: 'Report a finished deliverable and the workspace file that shows it. Use at deliverable boundaries, not for status chatter. On a check-in, report the blocker and the support you need.',
    parameters: Type.Object({ deliverable: Type.String(), evidence: Type.String() }),
    async execute(_id, params) {
      if (!params.deliverable.trim() || !params.evidence.trim()) throw new Error('Name a deliverable and its evidence file');
      return { content: [{ type: 'text', text: 'Recorded on the work. This is progress, not acceptance.' }],
        details: { durableProgress: { attemptId, deliverable: params.deliverable, evidence: params.evidence } } };
    },
  });
  pi.on('session_start', async () => {
    watcher?.close();
    const receive = async () => {
      let question;
      try { question = JSON.parse(await readFile(inbox, 'utf8')); } catch { return; }
      if (question.attemptId !== attemptId || question.id === lastQuestion) return;
      lastQuestion = question.id;
      await pi.sendMessage({ customType: 'durable-check-in', display: true,
        content: `Work check-in: ${question.text}\nAnswer with the next deliverable, or the blocker and the support you need. This does not change scope.` },
        { triggerTurn: true, deliverAs: 'steer' });
    };
    watcher = watch(dirname(inbox), () => { void receive(); });
    watcher.on('error', () => {});
    void receive();
  });
  pi.on('session_shutdown', async () => { watcher?.close(); watcher = undefined; });
}
