#!/bin/sh
# Section-reference detector. A fence: decidable, no placeholder ambiguity.
#
# Every "<FILE>.md §N" written in tracked markdown must resolve to a numbered
# heading N in that file. Catches the class where a document cites a section of
# another document that does not exist — the conformance criterion pointing at
# nothing, the cross-reference that survived a rewrite.
#
# Deliberately NOT a path checker. A naive path checker over this corpus returns
# ~43 hits of which ~2 are real: schematic placeholders (stock/X.md), "if present"
# trees, ignore-list examples, gitignored ledgers, and prohibitions ("never write
# STAGING.md") all read as dangling. That is a SIGN, not a fence, until someone
# adopts a placeholder marker. This checks only what is decidable.
#
# Exit 0 = every §n resolves. Exit 1 = at least one does not.
set -eu
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root"
fail=0

git ls-files '*.md' | while IFS= read -r src; do
  grep -oE '[A-Za-z0-9_.-]+\.md §[0-9]+' "$src" 2>/dev/null | sort -u | while IFS= read -r ref; do
    doc=${ref%% *}
    num=${ref##*§}
    # resolve: beside the citing file, at repo root, else by basename
    target=""
    for cand in "$(dirname "$src")/$doc" "$doc" $(git ls-files "*$doc" | head -1); do
      [ -n "$cand" ] && [ -f "$cand" ] && { target=$cand; break; }
    done
    [ -n "$target" ] || { printf 'mw-jig-sections: %s cites %s — file not found\n' "$src" "$ref" >&2; echo x >> /tmp/.mwjig.$$; continue; }
    if ! grep -qE "^#+[[:space:]]+$num\." "$target"; then
      printf 'mw-jig-sections: %s cites %s — %s has no section %s\n' "$src" "$ref" "$target" "$num" >&2
      echo x >> /tmp/.mwjig.$$
    fi
  done
done

if [ -f /tmp/.mwjig.$$ ]; then
  n=$(wc -l < /tmp/.mwjig.$$ | tr -d ' ')
  rm -f /tmp/.mwjig.$$
  printf 'mw-jig-sections: %s unresolved section reference(s)\n' "$n" >&2
  fail=1
fi
exit $fail
