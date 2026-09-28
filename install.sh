#!/bin/sh
# Constellation — installer. Drops the framework into a target repo. That's all it does.
#
#   sh install.sh [TARGET]             install, or re-sync an existing install
#   sh install.sh --uninstall [TARGET] remove it — no residue
#
# Zero deps: POSIX sh + cp/mkdir/grep/awk (+ git, optional, for the version stamp).
# Non-clobbering: never overwrites a file the project owns.
# Idempotent: re-running re-syncs the framework and preserves your work.
#
# You do not need this. It copies files and appends one line to CLAUDE.md/AGENTS.md.
# Doing that by hand is a completely reasonable way to adopt Constellation.
# `constellation adopt` runs it for you, then wires the rest and says what's next.

set -eu

SRC=$(cd "$(dirname "$0")" && pwd)

MODE=install
if [ "${1:-}" = "--uninstall" ]; then MODE=uninstall; shift; fi
DEST_ARG=${1:-.}
DEST=$(cd "$DEST_ARG" 2>/dev/null && pwd) || { echo "install: target '$DEST_ARG' not found" >&2; exit 1; }

GI_BEGIN="# CONSTELLATION — begin (managed; \`install.sh --uninstall\` removes this block)"
GI_END="# CONSTELLATION — end"
LOADER_BEGIN="<!-- CONSTELLATION — loader -->"
LOADER_GUARD=$(cat "$SRC/kernel/templates/loader-guard.txt")   # the one copy of the guard; the driver's trade verb reads it too
LOADER_LINE="$LOADER_GUARD Otherwise, read and follow .constellation/HOST.md before anything else, then continue."
LOADER_OLD="Read and follow .constellation/AGENTS.md"   # retired: the loader before the host law had its own file
LOADER_END="<!-- /CONSTELLATION -->"

# ── uninstall ────────────────────────────────────────────────────────────────
if [ "$MODE" = "uninstall" ]; then
  # unwire first — a hook calling a deleted script breaks every commit in the host repo
  for h in pre-commit post-commit; do
    hook="$DEST/.git/hooks/$h"
    [ -f "$hook" ] || continue
    awk '/^# CONSTELLATION — begin$/{skip=1} !skip{print} /^# CONSTELLATION — end$/{skip=0}' \
      "$hook" > "$hook.cst_tmp" && mv "$hook.cst_tmp" "$hook"
    chmod +x "$hook"
    # nothing left but a shebang and blank lines → the hook was ours alone
    if ! grep -qvE '^#!|^[[:space:]]*$' "$hook"; then rm -f "$hook"; fi
  done
  rm -rf "$DEST/.constellation" "$DEST/CONSTELLATION.md"
  # ideas/ is the drop box `constellation adopt` made; it goes only when nothing was ever dropped in it
  if [ -d "$DEST/ideas" ] && [ -z "$(ls -A "$DEST/ideas" | grep -vx .gitkeep)" ]; then
    rm -f "$DEST/ideas/.gitkeep"; rmdir "$DEST/ideas"
  fi
  for f in CLAUDE.md AGENTS.md; do
    [ -f "$DEST/$f" ] || continue
    awk -v b="$LOADER_BEGIN" -v e="$LOADER_END" '
      $0==b{skip=1} skip&&$0==e{skip=0;next} !skip' "$DEST/$f" > "$DEST/$f.cst_tmp" && mv "$DEST/$f.cst_tmp" "$DEST/$f"
    [ -s "$DEST/$f" ] || rm -f "$DEST/$f"
  done
  gi="$DEST/.gitignore"
  if [ -f "$gi" ]; then
    awk -v b="$GI_BEGIN" -v e="$GI_END" '
      $0==b{skip=1} !skip{print} $0==e{skip=0}' "$gi" > "$gi.cst_tmp" && mv "$gi.cst_tmp" "$gi"
    grep -q '[^[:space:]]' "$gi" || rm -f "$gi"
  fi
  echo "Constellation removed from $DEST (no residue)."
  exit 0
fi

[ "$SRC" = "$DEST" ] && { echo "install: source and target are the same directory" >&2; exit 1; }

# ── 0. the old name — an install from before the rename moves itself over ────
# The retired name is spelled in parts, so the one search for it finds only history.
OLD=made''well OLD_UP=MADE''WELL OLD_MARK="MADE"" WELL" OLD_WORDS="Made"" Well"
retag() { # retag <file> <begin-prefix> <end> : the retired block's markers and paths, in place (a symlink stays one)
  awk -v b="$2" -v e="$3" -v od=".$OLD" -v oup="$OLD_UP.md" -v om="$OLD_MARK" -v oph="<$OLD>" '
    function rep(s, a, c,   i, o) { o = ""; while ((i = index(s, a)) > 0) { o = o substr(s, 1, i - 1) c; s = substr(s, i + length(a)) } return o s }
    index($0, b) == 1 { blk = 1 }
    blk { end = ($0 == e); $0 = rep(rep(rep(rep($0, om, "CONSTELLATION"), od, ".constellation"), oup, "CONSTELLATION.md"), oph, "<constellation>"); if (end) blk = 0 }
    1' "$1" > "$1.cst_tmp" && cat "$1.cst_tmp" > "$1" && rm -f "$1.cst_tmp"
}
for f in CLAUDE.md AGENTS.md; do   # the loader
  [ -f "$DEST/$f" ] && grep -qF "<!-- $OLD_MARK — loader -->" "$DEST/$f" && retag "$DEST/$f" "<!-- $OLD_MARK — loader -->" "<!-- /$OLD_MARK -->"
done
[ -f "$DEST/.gitignore" ] && grep -qF "# $OLD_MARK — begin" "$DEST/.gitignore" && retag "$DEST/.gitignore" "# $OLD_MARK — begin" "# $OLD_MARK — end"
hooks_changed=""
if [ -e "$DEST/.git" ]; then   # the old hook blocks go; step 6 wires the new ones in the same place
  hp=$(git -C "$DEST" rev-parse --git-path hooks)
  case "$hp" in /*) ;; *) hp="$DEST/$hp" ;; esac
  for hook in "$hp"/*; do
    [ -f "$hook" ] && grep -qxF "# $OLD_MARK — begin" "$hook" || continue
    awk -v b="# $OLD_MARK — begin" -v e="# $OLD_MARK — end" '$0==b{skip=1} !skip{print} $0==e{skip=0}' "$hook" > "$hook.cst_tmp" &&
      cat "$hook.cst_tmp" > "$hook" && rm -f "$hook.cst_tmp"
    grep -qvE '^#!|^[[:space:]]*$' "$hook" || rm -f "$hook"   # nothing left but a shebang: it was ours alone
    rel=${hook#"$DEST"/}
    [ "$rel" != "$hook" ] && git -C "$DEST" ls-files --error-unmatch -- "$rel" >/dev/null 2>&1 && hooks_changed="$hooks_changed $rel"
  done
fi
moved=""
if [ -d "$DEST/.$OLD" ] && [ ! -e "$DEST/.constellation" ]; then
  if [ -e "$DEST/.git" ] && [ -n "$(git -C "$DEST" ls-files -- ".$OLD" | head -1)" ]; then
    git -C "$DEST" mv ".$OLD" .constellation   # the tracked work, staged; untracked and ignored files move with the folder
  else
    mv "$DEST/.$OLD" "$DEST/.constellation"
  fi
  moved=1
  if [ -e "$DEST/.git" ] && git -C "$DEST" ls-files --error-unmatch -- "$OLD_UP.md" >/dev/null 2>&1; then
    git -C "$DEST" rm -q -f -- "$OLD_UP.md"
  else
    rm -f "$DEST/$OLD_UP.md"
  fi
  # what inside names the old folder, its tools or its words: the pieces, the ledgers, the jig registry,
  # the project's own setup/teardown, session records. The framework itself is replaced below.
  grep -rlIF -e "$OLD" -e "$OLD_UP" -e "$OLD_WORDS" -e "$OLD_MARK" -e mw- -e MW_ "$DEST/.constellation" 2>/dev/null |
  while IFS= read -r f; do
    sed -e "s/\\.$OLD/.constellation/g" -e "s/$OLD_UP\\.md/CONSTELLATION.md/g" -e "s/$OLD_MARK/CONSTELLATION/g" \
        -e "s/$OLD_WORDS/Constellation/g" -e "s/$OLD/constellation/g" -e "s/$OLD_UP/CONSTELLATION/g" \
        -e 's/MW_GATE/CONSTELLATION_GATE/g' -e 's/MW_BIN/CONSTELLATION_BIN/g' \
        -e 's/mw-gate/cst-gate/g' -e 's/mw-jigs/cst-jigs/g' -e 's/mw-jig-sections/cst-jig-sections/g' -e 's/mw-record/cst-record/g' \
        -e 's/mw-hooks/cst-hooks/g' -e 's/mw-enforcers/cst-enforcers/g' -e 's/mw-tax/cst-tax/g' -e 's/mw-session/cst-session/g' -e 's/mw-move/cst-move/g' \
        "$f" > "$f.cst_tmp" && cat "$f.cst_tmp" > "$f" && rm -f "$f.cst_tmp"
  done
elif [ -d "$DEST/.$OLD" ]; then
  echo "  kept .$OLD/ (a .constellation/ is here too; move what you need from it, then delete it)" >&2
fi

prev=""
[ -f "$DEST/.constellation/VERSION" ] && prev=$(head -1 "$DEST/.constellation/VERSION" | awk '{print $2}')
[ -n "$prev" ] && echo "Updating Constellation in $DEST" || echo "Installing Constellation → $DEST"

# ── 1. framework — always overwritten; this is the re-sync path ──────────────
mkdir -p "$DEST/.constellation"
cp "$SRC/CONSTELLATION.md" "$DEST/CONSTELLATION.md"                       # the model, at root, for the person
cp "$SRC/SPEC.md"     "$DEST/.constellation/SPEC.md"                 # where work lives
for f in HOST.md EXTENDING.md PROFILES.md profiles.json; do
  cp "$SRC/kernel/$f" "$DEST/.constellation/$f"
done
rm -f "$DEST/.constellation/AGENTS.md"                                # retired: the host law is HOST.md, the stars' is stars/LAW.md
for d in guides skills templates bin lib registers bindings stars; do
  rm -rf "$DEST/.constellation/$d"
  cp -R "$SRC/kernel/$d" "$DEST/.constellation/$d"
done
rm -rf "$DEST/.constellation/trades"                                  # the cartridges: dev, marketing, sales
cp -R "$SRC/trades" "$DEST/.constellation/trades"

# ground + jig (framework docs) — instance roots/conventions/registry seeded once
mkdir -p "$DEST/.constellation/ground" "$DEST/.constellation/jig"
for f in README.md PROTOCOL.md PICTURE.md; do
  cp "$SRC/kernel/ground/$f" "$DEST/.constellation/ground/$f"
done
for f in README.md CONTRACT.md CORRECTIONS.md .gitignore; do
  cp "$SRC/kernel/jig/$f" "$DEST/.constellation/jig/$f"
done
# metabolism is kernel code, not instance data — cst-tax.sh execs tax.mjs from here
rm -rf "$DEST/.constellation/jig/metabolism"
cp -R "$SRC/kernel/jig/metabolism" "$DEST/.constellation/jig/metabolism"

# retired layout — directories a previous version created and no longer uses.
# A package that cannot remove its own leftovers is not installable, only addable.
for d in decisions specs work packs cycles queue; do
  [ -d "$DEST/.constellation/$d" ] || continue
  if find "$DEST/.constellation/$d" -type f ! -name '.gitkeep' | grep -q .; then
    echo "  kept .constellation/$d (retired layout, holds files — move them yourself, then delete)" >&2
  else
    rm -rf "$DEST/.constellation/$d"
    echo "  removed .constellation/$d (retired layout)"
  fi
done

# ── 2. the three states + memory + instance instruments — seeded once ────────
for k in stock bench finished; do
  mkdir -p "$DEST/.constellation/$k"
  [ -e "$DEST/.constellation/$k/.gitkeep" ] || : > "$DEST/.constellation/$k/.gitkeep"
done
[ -f "$DEST/.constellation/DECISIONS.md" ] || cp "$SRC/kernel/templates/DECISIONS.md" "$DEST/.constellation/DECISIONS.md"
[ -f "$DEST/.constellation/PRODUCT.md" ]   || cp "$SRC/kernel/templates/PRODUCT.md"   "$DEST/.constellation/PRODUCT.md"
[ -f "$DEST/.constellation/ground/ROOTS.md" ] || cp "$SRC/kernel/templates/ground-ROOTS.md" "$DEST/.constellation/ground/ROOTS.md"
mkdir -p "$DEST/.constellation/jig/conventions"
[ -e "$DEST/.constellation/jig/conventions/.gitkeep" ] || : > "$DEST/.constellation/jig/conventions/.gitkeep"
[ -f "$DEST/.constellation/jig/registry.json" ] || \
  cp "$SRC/kernel/templates/jig-registry.json" "$DEST/.constellation/jig/registry.json"

# ── 3. loader — appended, never replacing the project's own root files ───────
wire() {
  f="$DEST/$1"
  if [ ! -f "$f" ]; then
    printf '%s\n%s\n%s\n' "$LOADER_BEGIN" "$LOADER_LINE" "$LOADER_END" > "$f"
  elif ! grep -qF "$LOADER_BEGIN" "$f"; then
    printf '\n%s\n%s\n%s\n' "$LOADER_BEGIN" "$LOADER_LINE" "$LOADER_END" >> "$f"
  elif grep -qF "$LOADER_OLD" "$f"; then   # an older loader: the guard and HOST.md, keeping any trade it names
    awk -v b="$LOADER_BEGIN" -v e="$LOADER_END" -v old="$LOADER_OLD" \
        -v new="$LOADER_GUARD Otherwise, read and follow .constellation/HOST.md" '
      $0==b{on=1} $0==e{on=0}
      on && index($0, old)==1 { $0 = new substr($0, length(old) + 1) } 1' "$f" > "$f.cst_tmp" &&
      cat "$f.cst_tmp" > "$f" && rm -f "$f.cst_tmp"   # in place: a symlinked CLAUDE.md stays a symlink
  elif ! grep -qF "$LOADER_GUARD" "$f"; then   # an earlier guard: today's words, keeping the rest of the line
    awk -v b="$LOADER_BEGIN" -v e="$LOADER_END" -v g="$LOADER_GUARD" '
      $0==b{on=1} $0==e{on=0}
      on && index($0, "If CONSTELLATION_STEP")==1 && (i = index($0, " Otherwise,")) { $0 = g substr($0, i) } 1' "$f" > "$f.cst_tmp" &&
      cat "$f.cst_tmp" > "$f" && rm -f "$f.cst_tmp"
  fi
}
wire CLAUDE.md
wire AGENTS.md

# ── 4. gitignore the vendored framework; never the work ─────────────────────
# One .constellation/ in a repo. The framework inside it is a package — reinstallable,
# so it does not belong in the host's history. The WORK inside it is not ignored:
# a piece's state is the directory it is in, so stock/bench/finished must be in git
# or Constellation has no ledger at all.
gi="$DEST/.gitignore"
if [ ! -f "$gi" ] || ! grep -qF "$GI_BEGIN" "$gi"; then
  cat >> "$gi" <<'CSTGI'

# CONSTELLATION — begin (managed; `install.sh --uninstall` removes this block)
# Vendored framework — reinstall with: sh <constellation>/install.sh .
.constellation/*
CONSTELLATION.md
# …but the work, and this project's own files, stay in git:
!.constellation/stock/
!.constellation/bench/
!.constellation/finished/
!.constellation/DECISIONS.md
!.constellation/PRODUCT.md
!.constellation/ground/
.constellation/ground/*
!.constellation/ground/ROOTS.md
!.constellation/jig/
.constellation/jig/*
!.constellation/jig/registry.json
!.constellation/jig/conventions/
!.constellation/setup
!.constellation/teardown
# CONSTELLATION — end
CSTGI
elif ! grep -qxF '!.constellation/setup' "$gi"; then   # an older block: let the project's own setup/teardown into git
  awk -v e="$GI_END" '$0==e{print "!.constellation/setup"; print "!.constellation/teardown"} {print}' "$gi" > "$gi.cst_tmp" && cat "$gi.cst_tmp" > "$gi" && rm -f "$gi.cst_tmp"
fi

# ── 5. provenance — so you can tell whether a project has drifted ────────────
ver=$(cd "$SRC" && git rev-parse --short HEAD 2>/dev/null || echo unversioned)
printf 'constellation %s\ninstalled %s\n' "$ver" "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)" \
  > "$DEST/.constellation/VERSION"

# ── 6. wire the stops — gate + jigs on pre-commit, correction record on post-commit
if [ -e "$DEST/.git" ]; then   # a directory, or a file in a linked worktree
  ( cd "$DEST" && sh .constellation/bin/cst-hooks.sh )
fi

echo
if [ -n "$prev" ] && [ "$prev" != "$ver" ]; then
  echo "Done. Updated $prev -> $ver. Framework re-synced; stock/bench/finished, DECISIONS and PRODUCT untouched."
  echo "Tell your agent: Constellation was updated — re-read .constellation/HOST.md, then continue."
elif [ -n "$prev" ]; then
  echo "Done. Already at $ver — framework re-synced, nothing else changed."
else
  echo "Done. Constellation @ $ver."
  echo "Read ./CONSTELLATION.md, then tell your agent:  Let's build."
  echo "Remove anytime: sh <constellation>/install.sh --uninstall ."
fi
if [ -n "$moved" ]; then   # `constellation adopt` passes these lines on
  echo
  echo "  moved .$OLD/ to .constellation/, the new name; the move is staged, not committed. Commit it:"
  echo "  commit: git add -A -- .constellation .gitignore CLAUDE.md AGENTS.md$hooks_changed && CONSTELLATION_GATE=off git commit -m 'chore(constellation): .$OLD/ is now .constellation/'"
  left=""
  [ -e "$DEST/.git" ] && left=$(git -C "$DEST" grep -l -I -i --untracked -e "$OLD" -e "$OLD_MARK" -- . ':!.constellation' 2>/dev/null | tr '\n' ' ' || true)
  [ -z "$left" ] || echo "  still naming the old folder (change .$OLD/ to .constellation/ there): $left"
fi
