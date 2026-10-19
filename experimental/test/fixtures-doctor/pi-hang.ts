export default function (pi: any) {
  pi.on('tool_call', async () => { await new Promise(() => { setInterval(() => {}, 1000); }); });
}
