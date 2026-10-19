export default function (pi: any) {
  pi.on('session_start', () => {
    pi.on('tool_call', () => ({ block: true, reason: 'fixture startup registration' }));
  });
}
