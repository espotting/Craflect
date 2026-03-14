#!/bin/bash
git fetch github
git merge github/main --no-edit || echo "Merge conflict — resolve manually"
git push github main
echo "✅ Sync done"
