# constellation — adopt: the person says one sentence, the agent runs this, and the project is set up. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

cmd_adopt() { # adopt [<project>] : install the kernel, wire the hooks, make ideas/, run the enforcer checks, welcome the person
  [ $# -le 1 ] || die "usage: constellation adopt [<project>]"
  local arg=${1:-.} dest top pkg out again=0
  dest=$(cd "$arg" 2>/dev/null && pwd -P) || die "adopt: there is no folder '$arg'"
  # the project is its repository's top; a folder that is not a repository yet becomes one, since the record is git
  if top=$(git -C "$dest" rev-parse --show-toplevel 2>/dev/null); then dest=$top
  else git init -q "$dest" || die "adopt: could not start a git repository in $dest"
  fi
  [ -d "$dest/$MW" ] && again=1
  pkg=$(cd "$KERNEL/.." && pwd -P)

  # 1. the kernel: from the package, install (or re-sync); from a project's own copy, it is already there
  if [ "$(basename "$KERNEL")" = kernel ] && [ -f "$pkg/install.sh" ]; then   # the package checkout, not an installed .madewell/
    [ "$pkg" != "$dest" ] || die "adopt: this is the Constellation package itself; adopt a project (constellation adopt <project>)"
    out=$(sh "$pkg/install.sh" "$dest" 2>&1) || { printf '%s\n' "$out" >&2; die "adopt: the install did not finish"; }
    grep '^  kept ' <<<"$out" >&2 || true   # a retired layout still holding files: the only thing install asks a person to do
  elif [ "$again" = 0 ]; then
    die "adopt: run it from the Constellation package (<package>/kernel/bin/constellation adopt $dest)"
  fi

  # 2. the hooks: the commit gate and the jigs (idempotent; install wires them too, a project's own copy re-wires them)
  out=$(cd "$dest" && sh "$MW/bin/mw-hooks.sh" 2>&1) || { printf '%s\n' "$out" >&2; die "adopt: could not wire the commit hooks"; }

  # 3. the drop box: anything the person wants picked up goes here, in any form
  mkdir -p "$dest/ideas"
  [ -n "$(ls -A "$dest/ideas")" ] || : >"$dest/ideas/.gitkeep"

  # 4. the enforcer checks: every stop that claims to exist must prove it does, or the welcome would be a false green
  out=$(cd "$dest" && sh "$MW/bin/mw-enforcers.sh" 2>&1) || {
    printf '%s\n' "$out" >&2
    die "adopt: Constellation is installed, but a check that keeps the work honest is not working (above); fix it and adopt again"; }

  # 5. a repository with nothing in it yet gets the adoption as its first commit: only adopt's own paths, so
  #    nothing of the person's is swept in; hooks off, as the adoption commit is the one sanctioned bypass and
  #    the jigs cannot run before a first commit exists. With history, the agent commits the adoption (skills/adopt.md).
  if ! git -C "$dest" rev-parse -q --verify HEAD >/dev/null && [ -z "$(git -C "$dest" ls-files)" ]; then
    git -C "$dest" add -- .gitignore CLAUDE.md AGENTS.md "$MW" && { [ ! -f "$dest/ideas/.gitkeep" ] || git -C "$dest" add -- ideas/.gitkeep; } &&
      git -C "$dest" -c core.hooksPath=/dev/null commit -q -m "adopt Constellation" -m "ACT: plan
DONE: the kernel, the commit hooks and ideas/ are in place; the enforcer checks pass
NEXT: the adopt conversation ($MW/skills/adopt.md)" ||
      printf 'constellation: adopt: the first commit could not be made (does git know a name and email?); commit the adoption yourself\n' >&2
  fi

  # 6. the welcome, in the person's words: no engine words, no commands
  local name; name=$(basename "$dest")
  if [ "$again" = 1 ]; then say "Constellation was already set up in $name. It is up to date, and nothing of yours was changed."
  else say "Constellation is set up in $name."
  fi
  say "
What you can do next:
  - Talk about your work, in your own words: ideas, notes, call transcripts, voice memos.
  - Drop any file into the ideas folder, and it will be picked up from there.
  - Ask what is being made, or what is done, whenever you like.

Before anything is started you will be asked the four questions: what it is, what it is not,
how you will know it is done, and whether anything is holding it up. The rest is handled for
you. There are no commands to learn."
}
