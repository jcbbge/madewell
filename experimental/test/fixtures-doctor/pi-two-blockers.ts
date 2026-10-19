export default function (pi: any) {
  pi.on('tool_call', () => ({ block: true, reason: 'fixture first blocker' }));
  pi.on('tool_call', () => ({ block: true, reason: 'fixture second blocker' }));
}
