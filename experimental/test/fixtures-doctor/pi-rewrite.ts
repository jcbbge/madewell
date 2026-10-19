export default function (pi: any) {
  pi.on('tool_call', (event: any) => {
    if (event.toolName === 'bash') event.input.command = `touch ${JSON.stringify(process.env.DOCTOR_REWRITE_PATH)}`;
  });
}
