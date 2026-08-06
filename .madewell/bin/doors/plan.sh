#!/bin/sh
# .madewell/bin/doors/plan.sh — Plan walls (P1–P5).
#
# Run by `mw advance plan <item-id>` (gate) or `mw check plan <item-id>` (gauge)
# per SPEC.md §6. Verifies the Plan artifact for an Imagine item is fit to hand off.
#
# Walls (per SPEC.md §6.4):
#   P1 — a Plan artifact exists for this (cycle, item)
#   P2 — the artifact carries a `Data-Flow Conformance` block where the cartridge demands it
#   P3 — the Imagine queue is a real DAG: every item has dependsOn, non-empty
#        starting frontier, no cycles
#   P4 — the artifact names exemplar file(s) the code will match
#   P5 — a framework line is present (e.g. SolidJS primitive named, no React idiom)
#
# Contract (SPEC §6.1/§6.2):
#   argv:  $1 = repo-root  $2 = cycle-id  $3 = item-id
#   env:   MW_LEDGER (events.jsonl path), MW_MODE (gate|gauge)
#   stdout: one line per wall:  <wall-id> <pass|fail> <message>
#   exit:   0 = all pass  1 = at least one fail  2 = N/A in this context
#
# Rule 1 (SPEC §1): this script only reads inside the repo.

set -u

repo_root=$1
cycle_id=$2
item_id=$3

cd "$repo_root" || { printf 'P0 fail cannot cd to %s\n' "$repo_root"; exit 1; }

mw_dir=.madewell
specs_dir=$mw_dir/specs
artifacts_dir=$specs_dir/$cycle_id
mw_json=$mw_dir/madewell.json

fail_count=0
fire_pass() { printf '%s %s %s\n' "$1" "pass" "$2"; }
fire_fail() { printf '%s %s %s\n' "$1" "fail" "$2"; fail_count=$((fail_count + 1)); }

# P1 — Plan artifact exists.
artifact=$artifacts_dir/$item_id.md
if [ -f "$artifact" ]; then
  fire_pass P1 "Plan artifact exists at $artifact"
else
  fire_fail P1 "Plan artifact not found at $artifact"
  # Without an artifact, downstream walls cannot run.
  exit 1
fi

artifact_body=$(cat "$artifact" 2>/dev/null || true)

# P2 — Data-Flow Conformance block present.
if printf '%s' "$artifact_body" | grep -Eq '^#{1,6}[[:space:]]+Data-Flow[[:space:]]+Conformance'; then
  fire_pass P2 "Data-Flow Conformance block present"
else
  fire_fail P2 "Data-Flow Conformance block missing from Plan artifact"
fi

# P3 — dependency DAG sound: every item has dependsOn, non-empty frontier.
# Extract the open cycle's items as a JSONL stream: one item per line.
items_block=$(mktemp) || { fire_fail P3 "cannot create temp file"; exit 1; }
trap 'rm -f "$items_block"' EXIT

awk -v c="$cycle_id" '
  BEGIN { in_cyc = 0; depth = 0; cyc_buf = "" }
  {
    line = $0
    if (in_cyc == 0 && line ~ "\"id\"[[:space:]]*:[[:space:]]*\"" c "\"") { in_cyc = 1 }
    if (in_cyc == 1) {
      cyc_buf = cyc_buf line "\n"
      n_open = gsub(/\{/, "{", line)
      n_close = gsub(/\}/, "}", line)
      depth += n_open - n_close
      if (depth <= 0 && cyc_buf ~ "\"id\"[[:space:]]*:[[:space:]]*\"" c "\"") {
        # cycle block captured; extract items array
        if (match(cyc_buf, /"items"[[:space:]]*:[[:space:]]*\[/)) {
          items_start = RSTART + RLENGTH
          rest = substr(cyc_buf, items_start)
          d = 0
          for (k = 1; k <= length(rest); k++) {
            ch = substr(rest, k, 1)
            if (ch == "[") d++
            if (ch == "]") d--
            if (d < 0) { items_end = k - 1; break }
          }
          items_str = substr(cyc_buf, items_start, items_end)
          d = 0
          cur = ""
          in_str = 0
          escape = 0
          for (k = 1; k <= length(items_str); k++) {
            ch = substr(items_str, k, 1)
            if (escape) { cur = cur ch; escape = 0; continue }
            if (ch == "\\") { cur = cur ch; escape = 1; continue }
            if (ch == "\"") { in_str = !in_str; cur = cur ch; continue }
            if (!in_str) {
              if (ch == "{") d++
              if (ch == "}") d--
            }
            cur = cur ch
            if (!in_str && d == 0 && length(cur) > 0) {
              gsub(/^[[:space:]]+|[[:space:]]+$/, "", cur)
              sub(/^,/, "", cur)
              gsub(/^[[:space:]]+/, "", cur)
              if (length(cur) > 0) print cur
              cur = ""
            }
          }
        }
        exit
      }
    }
  }
' "$mw_json" > "$items_block"

# P3 check: every item has a "dependsOn" key, and at least one item is in the
# starting frontier (dependsOn == []).
if [ -s "$items_block" ]; then
  missing_deps=0
  total=0
  has_frontier=0
  while IFS= read -r it; do
    [ -z "$it" ] && continue
    total=$((total + 1))
    if ! printf '%s' "$it" | grep -q '"dependsOn"'; then
      missing_deps=$((missing_deps + 1))
    fi
    if printf '%s' "$it" | grep -Eq '"dependsOn":[[:space:]]*\[\]'; then
      has_frontier=1
    fi
  done < "$items_block"
  if [ "$missing_deps" -eq 0 ] && [ "$total" -gt 0 ]; then
    if [ "$has_frontier" -eq 1 ]; then
      fire_pass P3 "DAG sound: $total items, all with dependsOn, non-empty frontier"
    else
      fire_fail P3 "DAG has no starting frontier (no item with empty dependsOn)"
    fi
  else
    fire_fail P3 "DAG unsound: $missing_deps of $total items missing dependsOn"
  fi
else
  fire_fail P3 "could not extract cycle items for DAG check"
fi

# P4 — exemplars named in the artifact.
if printf '%s' "$artifact_body" | grep -Eqi '^#{1,6}[[:space:]]+(Exemplar|Reference)[[:space:]]+File' || \
   printf '%s' "$artifact_body" | grep -Eq '^[[:space:]]*[-*][[:space:]]+`[^`]+\.[a-z]+`'; then
  fire_pass P4 "exemplar file(s) named in artifact"
else
  fire_fail P4 "no exemplar file reference found in artifact"
fi

# P5 — framework line present (cartridge concern; the reference uses SolidJS).
if printf '%s' "$artifact_body" | grep -Eqi '^#{1,6}[[:space:]]+Framework' || \
   printf '%s' "$artifact_body" | grep -Eqi '^[[:space:]]*framework:[[:space:]]'; then
  fire_pass P5 "framework line present"
else
  fire_fail P5 "no framework line (e.g. 'framework: SolidJS') in artifact"
fi

if [ "$fail_count" -eq 0 ]; then
  exit 0
else
  exit 1
fi
