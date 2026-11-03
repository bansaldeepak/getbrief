#!/usr/bin/env bash
# Portable Brief installer.
#   curl -fsSL https://raw.githubusercontent.com/bansaldeepak/getbrief/main/scripts/install.sh | bash
#
# Puts the `brief` command on your PATH and creates ~/.brief/projects/.
# Settings (environment variables):
#   BRIEF_REPO    git URL or local path to install from   (default: GitHub repo)
#   BRIEF_REF     branch or tag to install                 (default: main)
#   BRIEF_HOME    where the CLI is installed               (default: ~/.brief/cli)
#   BRIEF_BIN_DIR where the `brief` link goes              (default: ~/.local/bin)
set -euo pipefail

MIN_NODE_MAJOR=22
BRIEF_REPO="${BRIEF_REPO:-https://github.com/bansaldeepak/getbrief.git}"
BRIEF_REF="${BRIEF_REF:-main}"
BRIEF_HOME="${BRIEF_HOME:-$HOME/.brief/cli}"
BRIEF_BIN_DIR="${BRIEF_BIN_DIR:-$HOME/.local/bin}"

fail() { echo "brief install: $*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "git is required but was not found. Install git and run this again."
command -v node >/dev/null 2>&1 || fail "Node.js $MIN_NODE_MAJOR or newer is required but 'node' was not found. Install it from https://nodejs.org and run this again."
command -v python3 >/dev/null 2>&1 || fail "python3 is required (Brief uses it to update workflow files) but was not found. Install it and run this again."
command -v npm >/dev/null 2>&1 || fail "npm is required but was not found. It comes with Node.js."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js $MIN_NODE_MAJOR or newer is required (found $(node --version)). Upgrade Node.js and run this again."
fi

mkdir -p "$(dirname "$BRIEF_HOME")" "$BRIEF_BIN_DIR"

if [ -d "$BRIEF_HOME/.git" ]; then
  echo "Updating Brief in $BRIEF_HOME ..."
  git -C "$BRIEF_HOME" remote set-url origin "$BRIEF_REPO"
  git -C "$BRIEF_HOME" fetch --depth 1 origin "$BRIEF_REF"
  git -C "$BRIEF_HOME" checkout --quiet --force FETCH_HEAD
elif [ -e "$BRIEF_HOME" ]; then
  fail "$BRIEF_HOME exists but is not a Brief install. Move it away or set BRIEF_HOME."
else
  echo "Installing Brief into $BRIEF_HOME ..."
  git clone --quiet --depth 1 --branch "$BRIEF_REF" "$BRIEF_REPO" "$BRIEF_HOME"
fi

(cd "$BRIEF_HOME" && npm install --omit=dev --no-audit --no-fund --silent)

chmod +x "$BRIEF_HOME/cli.mjs"
ln -sf "$BRIEF_HOME/cli.mjs" "$BRIEF_BIN_DIR/brief"
mkdir -p "$HOME/.brief/projects"

echo "Installed: $("$BRIEF_BIN_DIR/brief" --version)"
case ":$PATH:" in
  *":$BRIEF_BIN_DIR:"*) ;;
  *) echo "Add this line to your shell profile, then open a new shell:"
     echo "  export PATH=\"$BRIEF_BIN_DIR:\$PATH\"" ;;
esac
echo "Next: cd into a repo and run: brief init"
