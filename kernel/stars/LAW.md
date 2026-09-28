## Ground before you plan

**Contact:** `.madewell/ground/PROTOCOL.md` in full. The picture shape is
`.madewell/ground/PICTURE.md`. Where to look *here* is `.madewell/ground/ROOTS.md`.
This is kernel law, not a skill.

Skip grounding only for pure conversation, a trivial edit to a file already in context, or
work already grounded earlier this session. A plan whose task was never grounded is a
process defect.

## The Jig before you implement, and at verify

**Contact:** `.madewell/jig/README.md` and `CONTRACT.md`. Honor compiled conventions.
Run wired jigs in `jig/registry.json`. Never bypass `bin/mw-gate.sh`. A rule with no
detector is UNJIGGED — say so.

**Tax:** When the human overrode you, write `.madewell/jig/proposed.json` before the
commit that lands their version (`CORRECTIONS.md`). Run `constellation tax`
at verify and session-end. **RATIFY** → ask them to compile a shop-made jig (never
auto-build). **HOLD** → not yet. **DROP** / **SUNSET** → take-down is theirs. The
fixture harness is not this reading.

---

## Commits

Stage explicitly. **Never `git add -A`.** Never `git reset --hard` in a tree with uncommitted
work you did not write.

```
<type>(<scope>): <summary>

ACT: <ideate | plan | implement | verify>
DONE: <what got done>
NEXT: <the handoff; write `—` if none>
```
