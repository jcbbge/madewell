# constellation — land: fast-forward the piece, then take it off the bench: done work is gone from the
# tree, and its receipt is the body of the finish commit. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
#
# A leaf lands after a passing verify: its branch fast-forwards onto the default branch, and one finish
# commit removes .constellation/bench/<slug>.md with the receipt in its message. A piece that broke down
# lands when its parts are all done: the finish commit removes the whole bench/<slug>/. Nothing moves
# to a done shelf; `constellation receipt` and `status` read the finish commit back from git log.

cmd_land() {
  local slug=${1:-}; [ -n "$slug" ] || die "usage: constellation land <slug>"
  R=$(main_repo); repo_lock
  case "$(next_step "$slug")" in
    land) land_leaf "$slug" ;;
    finish) land_breakdown "$slug" ;;
    *) die "$slug has not passed verify (constellation status $slug)" ;;
  esac
}

finish_commit_msg() { # finish_commit_msg <slug> <receipt> <done> : the finish commit's message, the receipt as its body
  printf 'finish %s\n\n' "$1"
  [ -z "$2" ] || printf '%s\n\n' "$2"
  printf 'ACT: verify\nDONE: %s\nNEXT: —\n' "$3"
}

finish_piece() { # finish_piece <slug> <path> <receipt> <done> : land the piece's removal (land_write), or leave it be
  land_write "$(finish_commit_msg "$1" "$3" "$4")" del "$2"
}

land_leaf() {
  local slug=$1 wt br def; wt=$(work_of "$slug"); br=$(branch_of "$slug")
  def=$(git -C "$R" branch --show-current)
  [ -z "$(git -C "$wt" status --porcelain --untracked-files=no)" ] || die "the worktree has uncommitted changes"
  if ! git -C "$R" merge-base --is-ancestor "$def" "$br"; then
    git -C "$wt" -c core.hooksPath=/dev/null rebase -q "$def" || { git -C "$wt" rebase --abort 2>/dev/null; die "$br does not rebase cleanly onto $def; resolve it in $wt, then constellation land $slug"; }
  fi
  # the fast-forward keeps whatever else is staged or changed in the checkout, and refuses when that touches the piece's paths
  git -C "$R" merge --ff-only -q "$br" || die "the fast-forward failed; nothing landed"
  local rc; rc=$(receipt_compose "$slug" HEAD) || rc=""
  finish_piece "$slug" "$CST/bench/$slug.md" "$rc" "$slug verified by a star that did not build it; landed from $br" ||
    die "the finish was refused (above); the code is landed, the piece is still on the bench"
  local fin; fin=$(git -C "$R" rev-parse --short "$LANDED")
  repo_unlock   # the project's teardown may take a while, or leave something running: not under the lock
  project_hook teardown "$slug" "$wt" || say "$slug landed; the project's teardown for its worktree failed (above): run $CST/teardown $wt $R by hand"
  repo_lock
  git -C "$R" worktree remove --force "$wt" 2>/dev/null || true
  git -C "$R" branch -D "$br" >/dev/null 2>&1 || true
  repo_unlock
  notify "$slug landed and is done"
  say "landed $slug into $def; it is done, and its receipt is in the finish commit ($fin)"
  [ -z "$rc" ] || printf '\n%s\n' "$rc"
}

land_breakdown() { # a piece that broke down: every part done, so the whole bench/<slug>/ goes
  local slug=$1 def; def=$(git -C "$R" branch --show-current)
  local rc; rc=$(receipt_breakdown "$slug")
  finish_piece "$slug" "$CST/bench/$slug" "$rc" "$slug is done: every part of it was finished" ||
    die "the finish was refused (above); $slug is still on the bench"
  local fin; fin=$(git -C "$R" rev-parse --short "$LANDED")
  repo_unlock
  notify "$slug is done"
  say "finished $slug on $def; it is done, and its receipt is in the finish commit ($fin)"
  printf '\n%s\n' "$rc"
}
