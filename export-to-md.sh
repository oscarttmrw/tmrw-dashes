#!/usr/bin/env bash
# Outputs all git-tracked files as a single markdown document
OUT="codebase-export.md"
{
  echo "# tmrw-dashes — Full Codebase Export"
  echo ""
  echo "_Generated: $(date -u '+%Y-%m-%d %H:%M UTC')_"
  echo ""
  git ls-files | sort | while IFS= read -r file; do
    [ -f "$file" ] || continue
    # skip binary files (images, lock files, etc.)
    case "$file" in
      *.png|*.jpg|*.jpeg|*.gif|*.ico|*.svg|*.woff*|*.ttf|*.eot) continue ;;
    esac
    ext="${file##*.}"
    echo "## \`$file\`"
    echo ""
    echo "\`\`\`$ext"
    cat "$file"
    echo ""
    echo "\`\`\`"
    echo ""
  done
} > "$OUT"
echo "Written: $OUT ($(wc -l < "$OUT") lines, $(du -sh "$OUT" | cut -f1))"
