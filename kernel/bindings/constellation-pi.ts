// constellation-pi — Pi's side of the stop gate. When a Pi agent settles inside a
// constellation step without having handed off, it is sent the same refusal Claude Code's
// Stop hook gives (`constellation stop-check`), as a follow-up, so the work reports upward
// instead of sitting idle. Silent outside a step. Three refusals, then the operator is told.
// @ts-nocheck
import { execFile } from "node:child_process";

export default function (pi) {
  if (!process.env.CONSTELLATION_PIECE) return;
  pi.on("agent_settled", async () => {
    await new Promise((resolve) => {
      try {
        execFile("constellation", ["stop-check"], { timeout: 15000 }, async (err, stdout) => {
          const owed = String(stdout ?? "").trim();
          if (err && owed) {
            try { await pi.sendUserMessage(owed, { deliverAs: "followUp" }); } catch {}
          }
          resolve(null);
        });
      } catch { resolve(null); }
    });
  });
}
