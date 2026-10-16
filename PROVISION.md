# Provision Made Well on Pi Durable

You are setting up Made Well on Pi Durable on this machine. Do these steps in order; each is safe to
repeat. Run every command from the root of this checkout. Never print a token or key while you work.

Made Well prescribes what each harness must expose (`prescriptions.json`: which job runs on which
harness, provider, model and effort). Your job is to make the harnesses here match, then say plainly
what can run.

## 1. Node

    node --version

It must be 22.19 or newer. If it is older or missing, stop and tell the person: Made Well needs Node
22.19+, installed however they install software. Nothing below works without it.

## 2. Packages

    npm install

## 3. See what is here

    node cli.mjs doctor

It finds which harnesses are installed (Claude Code `claude`, Codex `codex`, pi `pi`), their
versions, whether each is signed in, and which cards of each tier can run. It reads only; it starts
no model and spends no quota. Where it cannot tell whether a harness is signed in, it says UNKNOWN.

A harness that is installed but not signed in: ask the person to sign in (`claude auth login`,
`codex login`, or `/login` inside pi). Signing in is theirs to do.

## 4. Front doors

The front door is how the person's own agent drives Made Well from that harness: start a unit, let
it run in the background, show status, answer a hold, inspect a unit.

    node cli.mjs provision

- **Claude Code** and **Codex**: it writes the `made-well` skill into each installed harness's
  skills folder. A skill that is already there and identical is left alone.
- If it reports `differs`, read the file it names. If it is an older Made Well skill, run
  `node cli.mjs provision --yes`. If it is something else, ask the person before replacing it.
- **pi**: it prints a `pi install "<this checkout>"` command. Run it. Then `/reload` any open pi session.

## 5. The command on PATH (optional)

    npm link

This puts `pi-durable` on PATH. If it fails for lack of permission, skip it: the skills already name
the full `node .../cli.mjs` command to use instead.

## 6. Guard hooks

Made Well's workers are headless harness runs. They carry `PI_DURABLE_WORKER=1` and keep their steps
on Made Well's own record. Any hook on this machine that stops a tool call or a turn until steps,
plans or permissions are written somewhere else will stall them.

Check each harness's hooks:

- Claude Code: the `hooks` in `settings.json` in its config folder (`~/.claude`, or
  `$CLAUDE_CONFIG_DIR`), and in any project's `.claude/settings.json`. `doctor` names the hooks there
  that never mention `PI_DURABLE_WORKER`.
- Codex: `hooks.json` in its home (`~/.codex`, or `$CODEX_HOME`).
- pi: any extension that blocks tool calls.

Each such hook must let a worker through: exit 0 (allow) when `PI_DURABLE_WORKER=1`, for example a
first line of `[ -n "$PI_DURABLE_WORKER" ] && exit 0`. These are the person's own settings: tell them
which hook and the change, and make it only with their yes.

## 7. Check again

    node cli.mjs doctor

Fix each problem it lists with the fix it gives, then run it again. It exits non-zero while some job
has no card that can run here.

## 8. Tell the person

In plain words, no command output:

- what can run here: for each tier (deep, coding, fast), which harness will do that work
- what is missing, if anything, and the one thing that would fix it
- what they could add: each more harness or provider account signed in means more room to keep
  going when one hits its usage limit (the work moves on to the next card by itself)
- how to use it: in pi, say "run this durably: …"; in Claude Code or Codex, ask for it by name
  (the `made-well` skill); from a terminal, `pi-durable start --objective "…" --source-file <file>
  --workspace <dir>`
