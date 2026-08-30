#!/bin/sh
# Made Well — installer. Drops the framework into a target repo. That's all it does.
#
#   sh install.sh [TARGET]             install, or re-sync an existing install
#   sh install.sh --uninstall [TARGET] remove it — no residue
#
# Zero deps: POSIX sh + cp/mkdir/grep/awk (+ git, optional, for the version stamp).
# Non-clobbering: never overwrites a file the project owns.
# Idempotent: re-running re-syncs the framework and preserves your work.
#
# You do not need this. It copies files and appends one line to CLAUDE.md/AGENTS.md.
# Doing that by hand is a completely reasonable way to adopt Made Well.

set -eu

SRC=$(cd "$(dirname "$0")" && pwd)

MODE=install
if [ "${1:-}" = "--uninstall" ]; then MODE=uninstall; shift; fi
DEST_ARG=${1:-.}
DEST=$(cd "$DEST_ARG" 2>/dev/null && pwd) || { echo "install: target '$DEST_ARG' not found" >&2; exit 1; }

LOADER_BEGIN="<!-- MADE WELL — loader -->"
LOADER_LINE="Read and follow .madewell/AGENTS.md before anything else, then continue."
LOADER_END="<!-- /MADE WELL -->"

# ── uninstall ────────────────────────────────────────────────────────────────
if [ "$MODE" = "uninstall" ]; then
  # unwire first — a hook calling a deleted script breaks every commit in the host repo
  for h in pre-commit post-commit; do
    hook="$DEST/.git/hooks/$h"
    [ -f "$hook" ] || continue
    awk '/^# MADE WELL — begin$/{skip=1} !skip{print} /^# MADE WELL — end$/{skip=0}' \
      "$hook" > "$hook.mw_tmp" && mv "$hook.mw_tmp" "$hook"
    chmod +x "$hook"
    # nothing left but a shebang and blank lines → the hook was ours alone
    if ! grep -qvE '^#!|^[[:space:]]*$' "$hook"; then rm -f "$hook"; fi
  done
  rm -rf "$DEST/.madewell" "$DEST/MADEWELL.md"
  for f in CLAUDE.md AGENTS.md; do
    [ -f "$DEST/$f" ] || continue
    awk -v b="$LOADER_BEGIN" -v e="$LOADER_END" '
      $0==b{skip=1} skip&&$0==e{skip=0;next} !skip' "$DEST/$f" > "$DEST/$f.mw_tmp" && mv "$DEST/$f.mw_tmp" "$DEST/$f"
    [ -s "$DEST/$f" ] || rm -f "$DEST/$f"
  done
  gi="$DEST/.gitignore"
  if [ -f "$gi" ]; then
    grep -v -e '^# Made Well — local per-clone profile marker' -e '^\.madewell/profile$' "$gi" \
      > "$gi.mw_tmp" && mv "$gi.mw_tmp" "$gi"
    grep -q '[^[:space:]]' "$gi" || rm -f "$gi"
  fi
  echo "Made Well removed from $DEST (no residue)."
  exit 0
fi

[ "$SRC" = "$DEST" ] && { echo "install: source and target are the same directory" >&2; exit 1; }

prev=""
[ -f "$DEST/.madewell/VERSION" ] && prev=$(head -1 "$DEST/.madewell/VERSION" | awk '{print $2}')
[ -n "$prev" ] && echo "Updating Made Well in $DEST" || echo "Installing Made Well → $DEST"

# ── 1. framework — always overwritten; this is the re-sync path ──────────────
mkdir -p "$DEST/.madewell"
cp "$SRC/MADEWELL.md" "$DEST/MADEWELL.md"                       # the model, at root, for the person
cp "$SRC/SPEC.md"     "$DEST/.madewell/SPEC.md"                 # where work lives
for f in AGENTS.md EXTENDING.md PROFILES.md profiles.json; do
  cp "$SRC/.madewell/$f" "$DEST/.madewell/$f"
done
for d in guides skills templates bin registers; do
  rm -rf "$DEST/.madewell/$d"
  cp -R "$SRC/.madewell/$d" "$DEST/.madewell/$d"
done

# ground + jig (framework docs) — instance roots/conventions/registry seeded once
mkdir -p "$DEST/.madewell/ground" "$DEST/.madewell/jig"
for f in README.md PROTOCOL.md PICTURE.md; do
  cp "$SRC/.madewell/ground/$f" "$DEST/.madewell/ground/$f"
done
for f in README.md CONTRACT.md CORRECTIONS.md; do
  cp "$SRC/.madewell/jig/$f" "$DEST/.madewell/jig/$f"
done
# metabolism is kernel code, not instance data — mw-tax.sh execs tax.mjs from here
rm -rf "$DEST/.madewell/jig/metabolism"
cp -R "$SRC/.madewell/jig/metabolism" "$DEST/.madewell/jig/metabolism"

# retired layout — directories a previous Made Well created and no longer uses.
# A package that cannot remove its own leftovers is not installable, only addable.
for d in decisions specs work packs cycles queue; do
  [ -d "$DEST/.madewell/$d" ] || continue
  if find "$DEST/.madewell/$d" -type f ! -name '.gitkeep' | grep -q .; then
    echo "  kept .madewell/$d (retired layout, holds files — move them yourself, then delete)" >&2
  else
    rm -rf "$DEST/.madewell/$d"
    echo "  removed .madewell/$d (retired layout)"
  fi
done

# ── 2. the three states + memory + instance instruments — seeded once ────────
for k in stock bench finished; do
  mkdir -p "$DEST/.madewell/$k"
  [ -e "$DEST/.madewell/$k/.gitkeep" ] || : > "$DEST/.madewell/$k/.gitkeep"
done
[ -f "$DEST/.madewell/DECISIONS.md" ] || cp "$SRC/.madewell/templates/DECISIONS.md" "$DEST/.madewell/DECISIONS.md"
[ -f "$DEST/.madewell/PRODUCT.md" ]   || cp "$SRC/.madewell/templates/PRODUCT.md"   "$DEST/.madewell/PRODUCT.md"
[ -f "$DEST/.madewell/ground/ROOTS.md" ] || cp "$SRC/.madewell/templates/ground-ROOTS.md" "$DEST/.madewell/ground/ROOTS.md"
mkdir -p "$DEST/.madewell/jig/conventions"
[ -e "$DEST/.madewell/jig/conventions/.gitkeep" ] || : > "$DEST/.madewell/jig/conventions/.gitkeep"
[ -f "$DEST/.madewell/jig/registry.json" ] || \
  cp "$SRC/.madewell/templates/jig-registry.json" "$DEST/.madewell/jig/registry.json"

# ── 3. loader — appended, never replacing the project's own root files ───────
wire() {
  f="$DEST/$1"
  if [ ! -f "$f" ]; then
    printf '%s\n%s\n%s\n' "$LOADER_BEGIN" "$LOADER_LINE" "$LOADER_END" > "$f"
  elif ! grep -qF "$LOADER_BEGIN" "$f"; then
    printf '\n%s\n%s\n%s\n' "$LOADER_BEGIN" "$LOADER_LINE" "$LOADER_END" >> "$f"
  fi
}
wire CLAUDE.md
wire AGENTS.md

# ── 4. the per-clone profile marker is local, never committed ────────────────
gi="$DEST/.gitignore"
if [ ! -f "$gi" ] || ! grep -qF ".madewell/profile" "$gi"; then
  printf '\n# Made Well — local per-clone profile marker (never committed)\n.madewell/profile\n' >> "$gi"
fi

# ── 5. provenance — so you can tell whether a project has drifted ────────────
ver=$(cd "$SRC" && git rev-parse --short HEAD 2>/dev/null || echo unversioned)
printf 'madewell %s\ninstalled %s\n' "$ver" "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)" \
  > "$DEST/.madewell/VERSION"

# ── 6. wire the stops — gate + jigs on pre-commit, correction record on post-commit
if [ -d "$DEST/.git" ]; then
  ( cd "$DEST" && sh .madewell/bin/mw-hooks.sh )
fi

echo
if [ -n "$prev" ] && [ "$prev" != "$ver" ]; then
  echo "Done. Updated $prev -> $ver. Framework re-synced; stock/bench/finished, DECISIONS and PRODUCT untouched."
  echo "Tell your agent: Made Well was updated — re-read .madewell/AGENTS.md, then continue."
elif [ -n "$prev" ]; then
  echo "Done. Already at $ver — framework re-synced, nothing else changed."
else
  echo "Done. Made Well @ $ver."
  echo "Read ./MADEWELL.md, then tell your agent:  Let's build."
  echo "Remove anytime: sh <madewell>/install.sh --uninstall ."
fi
