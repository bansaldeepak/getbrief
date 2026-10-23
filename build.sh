#!/bin/bash
# Install only the shared brief workflow; preserve unrelated provider configuration.
set -euo pipefail
BRIEF_SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$BRIEF_SOURCE_DIR/scripts/check-references.py"
node "$BRIEF_SOURCE_DIR/scripts/validate-skills.mjs"
exec python3 "$BRIEF_SOURCE_DIR/scripts/install-workflow.py" "$@"
