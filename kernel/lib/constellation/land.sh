# constellation — land: fast-forward the piece, bench → finished, with its receipt. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

cmd_land() {
  local slug=${1:-}; [ -n "$slug" ] || die "usage: constellation land <slug>"
  R=$(main_repo); local wt br def; wt=$(work_of "$slug"); br=$(branch_of "$slug")
  [ "$(next_step "$slug")" = land ] || die "$slug has not passed verify (constellation status $slug)"
  def=$(git -C "$R" branch --show-current)
  [ -z "$(git -C "$R" status --porcelain --untracked-files=no)" ] || die "the main checkout has uncommitted changes; clean it, then constellation land $slug"
  [ -z "$(git -C "$wt" status --porcelain --untracked-files=no)" ] || die "the worktree has uncommitted changes"
  if ! git -C "$R" merge-base --is-ancestor "$def" "$br"; then
    git -C "$wt" -c core.hooksPath=/dev/null rebase -q "$def" || { git -C "$wt" rebase --abort 2>/dev/null; die "$br does not rebase cleanly onto $def; resolve it in $wt, then constellation land $slug"; }
  fi
  git -C "$R" merge --ff-only -q "$br" || die "the fast-forward failed; nothing landed"
  local rc; rc=$(receipt_compose "$slug" HEAD) || rc=""
  git -C "$R" mv "$MW/bench/$slug.md" "$MW/finished/$slug.md"
  if [ -n "$rc" ]; then printf '\n%s\n' "$rc" >>"$R/$MW/finished/$slug.md"; git -C "$R" add "$MW/finished/$slug.md"; fi
  main_commit "finish $slug" "ACT: verify
DONE: $slug verified by a star that did not build it; landed from $br
NEXT: —" || die "the finish move was refused (mw-gate); the code is landed, the piece is still on the bench"
  git -C "$R" worktree remove --force "$wt" 2>/dev/null || true
  git -C "$R" branch -D "$br" >/dev/null 2>&1 || true
  notify "$slug landed and finished"
  say "landed $slug into $def; $MW/finished/$slug.md"
  [ -z "$rc" ] || printf '\n%s\n' "$rc"
}
