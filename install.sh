#!/bin/sh
# Made Well — installer. Drop the framework into a target repo; the agent does the rest.
#
#   sh install.sh [TARGET_DIR]           install / re-sync into TARGET_DIR (default: cwd)
#   sh install.sh --uninstall [TARGET]   remove Made Well (droppable — no residue)
#
# Zero deps: POSIX sh + cp/mkdir/grep/awk (+ git, optional, for the version stamp).
# Non-clobbering: never overwrites a file the project owns; appends a guarded loader block.
# Idempotent: re-running RE-SYNCS the framework (drift-gate) and PRESERVES project memory.

set -eu

SRC=$(cd "$(dirname "$0")" && pwd)

MODE=install
if [ "${1:-}" = "--uninstall" ]; then MODE=uninstall; shift; fi
DEST_ARG=${1:-.}
DEST=$(cd "$DEST_ARG" 2>/dev/null && pwd) || { echo "install: target '$DEST_ARG' not found" >&2; exit 1; }

LOADER_BEGIN="<!-- MADE WELL — loader -->"
LOADER_LINE="Read and follow .madewell/AGENTS.md before anything else, then continue."
LOADER_END="<!-- /MADE WELL -->"

if [ "$MODE" = "uninstall" ]; then
  rm -rf "$DEST/.madewell" "$DEST/MADEWELL.md"
  for f in CLAUDE.md AGENTS.md; do
    [ -f "$DEST/$f" ] || continue
    awk -v b="$LOADER_BEGIN" -v e="$LOADER_END" '
      $0==b{skip=1} skip&&$0==e{skip=0;next} !skip' "$DEST/$f" > "$DEST/$f.mw_tmp" && mv "$DEST/$f.mw_tmp" "$DEST/$f"
    [ -s "$DEST/$f" ] || rm -f "$DEST/$f"
  done
  # Strip the Made Well lines from .gitignore (keep the project's own); drop it if now blank.
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

# Detect an existing install (for the update-vs-install message + memory preservation).
prev=""
[ -f "$DEST/.madewell/VERSION" ] && prev=$(head -1 "$DEST/.madewell/VERSION" | awk '{print $2}')
[ -n "$prev" ] && echo "Updating Made Well in $DEST (re-syncing framework; your memory is preserved)" \
               || echo "Installing Made Well → $DEST"

# 1. Framework files (allowlist) — ALWAYS overwritten; this is the re-sync / update path.
mkdir -p "$DEST/.madewell"
cp "$SRC/.madewell/AGENTS.md" "$DEST/.madewell/AGENTS.md"   # canonical instructions; never at root → never clobbers
cp "$SRC/MADEWELL.md" "$DEST/MADEWELL.md"
for d in guides skills packs templates bin; do
  rm -rf "$DEST/.madewell/$d"
  cp -R "$SRC/.madewell/$d" "$DEST/.madewell/$d"
done
cp "$SRC/.madewell/LIFECYCLE.md"  "$DEST/.madewell/LIFECYCLE.md"   # canonical lifecycle model
cp "$SRC/.madewell/profiles.json" "$DEST/.madewell/profiles.json"
cp "$SRC/.madewell/PROFILES.md"   "$DEST/.madewell/PROFILES.md"

# 2. Fresh memory — created ONLY on first install; never clobbered on re-sync.
mkdir -p "$DEST/.madewell/work/packages" "$DEST/.madewell/work/reports" "$DEST/.madewell/work/test-results" "$DEST/.madewell/specs" "$DEST/.madewell/decisions" "$DEST/.madewell/cycles"
[ -f "$DEST/.madewell/DECISIONS.md" ]    || cp "$SRC/.madewell/templates/DECISIONS.md" "$DEST/.madewell/DECISIONS.md"
[ -f "$DEST/.madewell/PRODUCT.md" ]      || cp "$SRC/.madewell/templates/PRODUCT.md"   "$DEST/.madewell/PRODUCT.md"
[ -f "$DEST/.madewell/madewell.json" ]      || cp "$SRC/.madewell/madewell.json"             "$DEST/.madewell/madewell.json"
[ -f "$DEST/.madewell/work/tax.jsonl" ]  || : > "$DEST/.madewell/work/tax.jsonl"
for k in work/packages work/reports work/test-results specs decisions cycles; do
  [ -e "$DEST/.madewell/$k/.gitkeep" ] || : > "$DEST/.madewell/$k/.gitkeep"
done

# 3. Wire the loader (non-clobbering): root CLAUDE.md + AGENTS.md point at .madewell/AGENTS.md.
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

# 4. Git-ignore the local, per-clone profile marker.
gi="$DEST/.gitignore"
if [ ! -f "$gi" ] || ! grep -qF ".madewell/profile" "$gi"; then
  printf '\n# Made Well — local per-clone profile marker (never committed)\n.madewell/profile\n' >> "$gi"
fi

# 5. Provenance stamp (answers the cross-repo drift question: re-run install to re-sync).
ver=$(cd "$SRC" && git rev-parse --short HEAD 2>/dev/null || echo unversioned)
when=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)
printf 'madewell %s\ninstalled %s\n' "$ver" "$when" > "$DEST/.madewell/VERSION"

if [ -n "$prev" ] && [ "$prev" != "$ver" ]; then
  echo "Done. Updated $prev -> $ver. Framework re-synced; madewell.json/DECISIONS/PRODUCT/tax preserved."
  echo "Tell your agent: Made Well was updated — re-read .madewell/AGENTS.md, then continue."
elif [ -n "$prev" ]; then
  echo "Done. Already at $ver — framework re-synced; nothing else changed."
else
  echo "Done. Made Well @ $ver."
  echo "Next: point your agent at this repo and say  ->  Let's build."
  echo "You start here: ./MADEWELL.md   ·   Remove anytime: sh <madewell>/install.sh --uninstall ."
fi
