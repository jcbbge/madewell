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
  [ -d "$dest/$CST" ] && again=1
  pkg=$(cd "$KERNEL/.." && pwd -P)
  repo_lock "$dest"   # one writer at a time in the main checkout, held to the end of adopt

  # 1. the kernel: from the package, install (or re-sync); from a project's own copy, it is already there
  if [ "$(basename "$KERNEL")" = kernel ] && [ -f "$pkg/install.sh" ]; then   # the package checkout, not an installed .constellation/
    [ "$pkg" != "$dest" ] || die "adopt: this is the Constellation package itself; adopt a project (constellation adopt <project>)"
    out=$(sh "$pkg/install.sh" "$dest" 2>&1) || { printf '%s\n' "$out" >&2; die "adopt: the install did not finish"; }
    grep '^  kept ' <<<"$out" >&2 || true   # a retired layout still holding files: the only thing install asks a person to do
    # an install from before the rename moved to the new folder: staged, not committed; what to commit goes to the agent
    if grep -q '^  moved ' <<<"$out"; then again=moved; grep -E '^  (moved|commit:|still) ' <<<"$out" >&2; fi
  elif [ "$again" = 0 ]; then
    die "adopt: run it from the Constellation package (<package>/kernel/bin/constellation adopt $dest)"
  fi

  # 1b. done work is gone: an install from before kept a finished/ shelf (at the top, and inside pieces that broke
  #     down). Its history is in git, so it goes: staged, not committed; the agent commits it with the adoption.
  local shelf shelves=() tidied=""
  while IFS= read -r shelf; do [ -n "$shelf" ] && shelves+=("$shelf"); done < <(cd "$dest" &&
    find "$CST" -type d -name finished \( -path "$CST/finished" -o -path "$CST/bench/*/finished" \) -prune 2>/dev/null | awk -F/ '{ print NF "\t" $0 }' | sort -n | cut -f2-)   # the top one first
  if [ ${#shelves[@]} -gt 0 ]; then
    local gone=()
    for shelf in "${shelves[@]}"; do   # one holding anything the last commit does not have stays, and is said
      if ! in_history "$dest" "$shelf"; then
        printf '  kept %s/: it holds changes git does not have; commit or drop them, then adopt again\n' "$shelf" >&2; continue
      fi
      git -C "$dest" rm -r -q -f --ignore-unmatch -- "$shelf" >/dev/null   # -f: an old install's move may be staged
      rm -rf "${dest:?}/$shelf"; gone+=("$shelf/")
    done
    if [ ${#gone[@]} -gt 0 ]; then
      tidied=1
      printf '  removed %s: done work is in git history now, not on a shelf; the removal is staged, commit it with the adoption\n' \
        "$(printf '%s, ' "${gone[@]}" | sed 's/, $//')" >&2
    fi
  fi

  # 1c. one text for every assistant: CLAUDE.md and AGENTS.md are read by different ones, so they must not disagree
  parity_check "$dest"

  # 2. the hooks: the commit gate and the jigs (idempotent; install wires them too, a project's own copy re-wires them)
  out=$(cd "$dest" && sh "$CST/bin/cst-hooks.sh" 2>&1) || { printf '%s\n' "$out" >&2; die "adopt: could not wire the commit hooks"; }

  # 3. the drop box: anything the person wants picked up goes here, in any form
  mkdir -p "$dest/ideas"
  [ -n "$(ls -A "$dest/ideas")" ] || : >"$dest/ideas/.gitkeep"

  # 4. the enforcer checks: every stop that claims to exist must prove it does, or the welcome would be a false green
  out=$(cd "$dest" && sh "$CST/bin/cst-enforcers.sh" 2>&1) || {
    printf '%s\n' "$out" >&2
    die "adopt: Constellation is installed, but a check that keeps the work honest is not working (above); fix it and adopt again"; }

  # 5. a repository with nothing in it yet gets the adoption as its first commit: only adopt's own paths, so
  #    nothing of the person's is swept in; hooks off, as the adoption commit is the one sanctioned bypass and
  #    the jigs cannot run before a first commit exists. With history, the agent commits the adoption (skills/adopt.md).
  if ! git -C "$dest" rev-parse -q --verify HEAD >/dev/null && [ -z "$(git -C "$dest" ls-files)" ]; then
    git -C "$dest" add -- .gitignore CLAUDE.md AGENTS.md "$CST" && { [ ! -f "$dest/ideas/.gitkeep" ] || git -C "$dest" add -- ideas/.gitkeep; } &&
      git -C "$dest" -c core.hooksPath=/dev/null commit -q -m "adopt Constellation" -m "ACT: plan
DONE: the kernel, the commit hooks and ideas/ are in place; the enforcer checks pass
NEXT: the adopt conversation ($CST/skills/adopt.md)" ||
      printf 'constellation: adopt: the first commit could not be made (does git know a name and email?); commit the adoption yourself\n' >&2
  fi

  # 6. the welcome, in the person's words: no engine words, no commands
  local name; name=$(basename "$dest")
  if [ "$again" = moved ]; then say "Constellation was already set up in $name, under its old name. It is up to date, and all of your work moved with it."
  elif [ "$again" = 1 ] && [ -n "$tidied" ]; then say "Constellation was already set up in $name. It is up to date: what is done is now kept in the project's history instead of a folder, and nothing else of yours was changed."
  elif [ "$again" = 1 ]; then say "Constellation was already set up in $name. It is up to date, and nothing of yours was changed."
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

in_history() { # in_history <project> <folder> : every file in it is in the last commit, under some name
  local d=$1 f sums; sums=$(git -C "$d" ls-tree -r HEAD 2>/dev/null | awk '{ print $3 }')
  while IFS= read -r -d '' f; do
    [ "$(basename "$f")" != .gitkeep ] || continue
    grep -qxF -- "$(git -C "$d" hash-object -- "$f")" <<<"$sums" || return 1
  done < <(cd "$d" && find "$2" -type f -print0)
}

parity_check() { # parity_check <project> : when CLAUDE.md and AGENTS.md both exist and differ, say which one to copy over
  local d=$1 a=CLAUDE.md b=AGENTS.md from to why
  [ -f "$d/$a" ] && [ -f "$d/$b" ] || return 0
  ! cmp -s "$d/$a" "$d/$b" || return 0
  if [ -z "$(grep -vxF -f "$d/$a" "$d/$b")" ]; then from=$a to=$b why="it says everything $b says, and more"
  elif [ -z "$(grep -vxF -f "$d/$b" "$d/$a")" ]; then from=$b to=$a why="it says everything $a says, and more"
  else
    local ta tb; ta=$(git -C "$d" log -1 --format=%ct -- "$a" 2>/dev/null); tb=$(git -C "$d" log -1 --format=%ct -- "$b" 2>/dev/null)
    [ -n "$ta" ] && [ -n "$tb" ] || { ta=$(date -r "$d/$a" +%s); tb=$(date -r "$d/$b" +%s); }
    if [ "${tb:-0}" -gt "${ta:-0}" ]; then from=$b to=$a; else from=$a to=$b; fi
    why="it is the newer; bring over anything of $to's first"
  fi
  printf '  %s and %s differ, and different assistants read different ones, so they should be one text: copy %s over %s (%s)\n' "$a" "$b" "$from" "$to" "$why" >&2
}
