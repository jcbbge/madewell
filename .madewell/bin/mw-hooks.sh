#!/bin/sh
# Wire Made Well stops into this clone's git hooks. Idempotent.
# Does not clobber an unrelated hook — prepends a marked block if missing.
#
#   sh .madewell/bin/mw-hooks.sh
#
# pre-commit  → mw-gate.sh then mw-jigs.sh
# post-commit → mw-record.sh (accepted side of proposed − accepted)

set -e
repo_root=$(git rev-parse --show-toplevel)
hooks_dir=$(git rev-parse --git-path hooks)
mkdir -p "$hooks_dir"

BEGIN="# MADE WELL — begin"

write_pre() {
  hook=$1
  cat > "$hook" <<'EOF'
#!/bin/sh
# MADE WELL — begin
sh .madewell/bin/mw-gate.sh || exit $?
sh .madewell/bin/mw-jigs.sh || exit $?
# MADE WELL — end
EOF
  chmod +x "$hook"
}

write_post() {
  hook=$1
  cat > "$hook" <<'EOF'
#!/bin/sh
# MADE WELL — begin
sh .madewell/bin/mw-record.sh || true
# MADE WELL — end
EOF
  chmod +x "$hook"
}

prepend() {
  hook=$1
  kind=$2
  tmp=$(mktemp)
  if [ "$kind" = pre ]; then
    cat > "$tmp" <<'EOF'
#!/bin/sh
# MADE WELL — begin
sh .madewell/bin/mw-gate.sh || exit $?
sh .madewell/bin/mw-jigs.sh || exit $?
# MADE WELL — end
EOF
  else
    cat > "$tmp" <<'EOF'
#!/bin/sh
# MADE WELL — begin
sh .madewell/bin/mw-record.sh || true
# MADE WELL — end
EOF
  fi
  # drop a leftover shebang from the old hook so we don't double it
  if [ -f "$hook" ]; then
    awk 'NR==1 && /^#!/ {next} {print}' "$hook" >> "$tmp"
  fi
  mv "$tmp" "$hook"
  chmod +x "$hook"
}

pre="$hooks_dir/pre-commit"
post="$hooks_dir/post-commit"

if [ -f "$pre" ] && grep -q "$BEGIN" "$pre" 2>/dev/null; then
  :
elif [ ! -f "$pre" ]; then
  write_pre "$pre"
elif grep -q 'mw-gate.sh' "$pre" 2>/dev/null && ! grep -q 'mw-jigs.sh' "$pre" 2>/dev/null; then
  write_pre "$pre"
else
  prepend "$pre" pre
fi

if [ -f "$post" ] && grep -q "$BEGIN" "$post" 2>/dev/null; then
  :
elif [ ! -f "$post" ]; then
  write_post "$post"
else
  prepend "$post" post
fi

echo "Made Well hooks: $pre (gate + jigs), $post (record)"
