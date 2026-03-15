#!/usr/bin/env bash
# Resolve a unique plan name, appending -2 .. -10 to avoid collisions.
# Usage: resolve-plan-name.sh <base-name> <plans-dir>
# Outputs the resolved name on stdout. Exits 1 if all 10 suffixes are taken.

BASE="$1"
DIR="${2:-.codevoyant/plans}"
NAME="$BASE"

if [ ! -d "$DIR/$NAME" ]; then
  echo "$NAME"
  exit 0
fi

for i in $(seq 2 10); do
  NAME="${BASE}-${i}"
  if [ ! -d "$DIR/$NAME" ]; then
    echo "$NAME"
    exit 0
  fi
done

echo "ERROR: all names taken (${BASE} through ${BASE}-10)" >&2
exit 1
