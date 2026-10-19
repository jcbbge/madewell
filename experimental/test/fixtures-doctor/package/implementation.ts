export default function (pi: any) {
  pi.on('tool_call', () => ({ block: true, reason: 'fixture package refusal' }));
}
