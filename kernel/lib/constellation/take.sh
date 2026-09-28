# constellation — take: stock → bench, the piece branch and its worktree. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

cmd_take() {
  local slug=${1:-}; [ -n "$slug" ] || die "usage: constellation take <slug>"
  R=$(main_repo); local src="$R/$MW/stock/$slug.md" dst="$R/$MW/bench/$slug.md"
  [ -f "$src" ] || die "no piece $MW/stock/$slug.md on the rack"
  local gaps; gaps=$(floor_gaps "$src")
  [ -z "$gaps" ] || die "$slug cannot reach the bench without its floor: missing $gaps. Add, in the piece:
  **Making:** …   **Not making:** …   **Done when:** …   **Waits on:** …   (Waits on may be empty)"
  [ -z "$(git -C "$R" diff --cached --name-only)" ] || die "the index already holds staged changes; commit or unstage them first"
  git -C "$R" mv "$src" "$dst"
  git -C "$R" commit -q -m "take $slug to the bench" -m "ACT: plan
DONE: $slug is in hand (its floor is stated)
NEXT: constellation run $slug (vega, ideate)" || die "the move was refused (mw-gate); nothing changed"
  local wt; wt=$(work_of "$slug"); mkdir -p "$(dirname "$wt")"
  git -C "$R" worktree add -q -b "$(branch_of "$slug")" "$wt" HEAD || die "could not make the worktree for $slug"
  seed_framework "$wt"
  say "took $slug to the bench — branch $(branch_of "$slug"), worktree $wt
next: constellation run $slug"
}
seed_framework() { # the vendored Made Well framework is gitignored; a worktree needs it for the commit gate
  local wt=$1 d
  for d in bin lib guides skills templates registers bindings stars; do
    [ -d "$R/$MW/$d" ] && [ ! -e "$wt/$MW/$d" ] && cp -a "$R/$MW/$d" "$wt/$MW/$d"
  done; return 0
}
