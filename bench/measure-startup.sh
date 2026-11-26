#!/usr/bin/env bash
# Measure window first-paint startup under Xvfb.
# Usage: measure-startup.sh <display-number> <command...>
# Prints milliseconds from spawn to the first changed root-window pixels.
set -euo pipefail

DISPLAY_NUM="$1"
shift
XVFB=""
APP=""

cleanup() {
  if [ -n "${APP:-}" ]; then kill "$APP" 2>/dev/null || true; fi
  if [ -n "${XVFB:-}" ]; then kill "$XVFB" 2>/dev/null || true; fi
}
trap cleanup EXIT

Xvfb ":$DISPLAY_NUM" -screen 0 1024x768x24 >/tmp/tardis-startup-xvfb.log 2>&1 &
XVFB=$!
sleep 0.5
export DISPLAY=":$DISPLAY_NUM"

import -window root /tmp/tardis-startup-baseline.png 2>/dev/null || true
START=$(date +%s%N)
"$@" >/tmp/tardis-startup-app.log 2>&1 &
APP=$!

while true; do
  NOW=$(date +%s%N)
  if [ $(( (NOW - START) / 1000000 )) -gt 15000 ]; then
    echo "timeout" >&2
    exit 1
  fi
  sleep 0.05
  if ! kill -0 "$APP" 2>/dev/null; then
    echo "app exited before first paint" >&2
    exit 1
  fi
  if ! import -window root /tmp/tardis-startup-current.png 2>/dev/null; then
    continue
  fi
  RAW=$(compare -metric AE /tmp/tardis-startup-baseline.png /tmp/tardis-startup-current.png null: 2>&1 || true)
  DIFF=$(printf '%s' "$RAW" | sed -E 's/^([0-9]+).*/\1/')
  if [ -n "$DIFF" ] && [ "$DIFF" -gt 200 ] 2>/dev/null; then
    END=$(date +%s%N)
    echo $(( (END - START) / 1000000 ))
    exit 0
  fi
done
