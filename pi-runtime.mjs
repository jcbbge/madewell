import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

// The Made Well lifecycle. Each step is a different agent; handoff is the verification.
export const STEPS = [
  { name: 'discover', act: 'discovery', role: 'Vega', duty: 'Preserve source, identify the coherent work, uncertainties and scope. Do not implement.' },
  { name: 'ideate', act: 'think', role: 'Vega', duty: 'Explore the objective and produce bounded options. Do not implement.' },
  { name: 'challenge', act: 'think', role: 'Polaris', duty: 'Challenge the idea, its failure modes and assumptions. Do not implement.' },
  { name: 'plan', act: 'plan', role: 'Cassiopeia', duty: 'Inspect the actual repository and environment. Produce grounded instructions: Making / Not making / Done when / Waits on. Do not implement.' },
  { name: 'test-plan', act: 'plan', role: 'Orion', duty: 'Derive the tests from the plan, independently of implementation, and write them. Do not implement product code.' },
  { name: 'implement', act: 'implement', role: 'Sirius', duty: 'Execute the plan. No redesign or invented scope. Stop and report a blocker rather than improvise.' },
  { name: 'verify', act: 'test', role: 'Aldebaran', duty: 'Run the tests against the implementation and report what you observed. Never repair product code or tests.' },
];
export const ARBITER = { name: 'arbitrate', role: 'Arbiter', duty: 'A test failed. Decide whose question it is: a pre-existing bug, a bad implementation, or a bad test.' };
export const stepIndex = name => STEPS.findIndex(s => s.name === name);

const inspect = ['read', 'grep', 'find', 'ls'];
// Tool ceilings per step. null = every tool the user's pi provides.
export const TOOLS = {
  discover: inspect, ideate: inspect, challenge: inspect, plan: inspect,
  // The Pi write guard requires `task now` before any write; the test author
  // needs bash to run that command and, when useful, demonstrate a red test.
  'test-plan': [...inspect, 'bash', 'write', 'edit'],
  implement: null,
  verify: [...inspect, 'bash'],
  arbitrate: [...inspect, 'bash'],
  intake: inspect, originator: inspect, // NQ judgment calls are read-only
};

export const progressExtension = fileURLToPath(new URL('./work-progress.mjs', import.meta.url));

// A worker is plain pi: the user's own extensions, skills, settings and login all load.
// Re-running the same sessionId continues the same pi session: that is the recovery.
export function buildPiArgs({ step, system, model, sessionDir, sessionId, progress = false }) {
  if (!Object.hasOwn(TOOLS, step)) throw new TypeError(`Unknown step ${step}`);
  if (typeof sessionDir !== 'string' || !isAbsolute(sessionDir)) throw new TypeError('Absolute sessionDir required');
  const args = ['--print', '--mode', 'json', '--offline', '--session-dir', sessionDir];
  if (sessionId) args.push('--session-id', sessionId);
  if (system) args.push('--append-system-prompt', system);
  const tools = TOOLS[step];
  if (tools) args.push('--tools', [...tools, ...(progress ? ['durable_progress'] : [])].join(','));
  if (progress) args.push('--extension', progressExtension);
  if (model) args.push('--model', model);
  return args;
}
