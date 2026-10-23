#!/bin/bash
# Safe workflow setup. Inspect --dry-run first; --adopt-existing preserves backups.
set -euo pipefail
BRIEF_SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$BRIEF_SOURCE_DIR/build.sh" "$@"
