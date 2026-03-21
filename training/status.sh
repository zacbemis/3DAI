#!/bin/bash
# Check status of all training runs
# Usage: ./training/status.sh [--watch]
#        ./training/status.sh --clean   (remove failed/empty training dirs)
#        ./training/status.sh --nuke    (kill all agents + remove all training data)

if [ "$1" = "--nuke" ]; then
  echo "Killing all training agents..."
  pkill -9 -f "claude --print" 2>/dev/null
  sleep 1
  echo "Removing all training data from /tmp/training/..."
  rm -rf /tmp/training/*
  echo "Done. Clean slate."
  exit 0
fi

if [ "$1" = "--clean" ]; then
  echo "Cleaning failed training dirs (0 iterations, no summary)..."
  for d in /tmp/training/*/; do
    [ -d "$d" ] || continue
    iters=$(ls -d "$d"iter_*/ 2>/dev/null | wc -l | tr -d ' ')
    if [ "$iters" -eq 0 ] && [ ! -f "$d/summary.md" ]; then
      echo "  Removing $(basename "$d")"
      rm -rf "$d"
    fi
  done
  echo "Done."
  exit 0
fi

WATCH=false
if [ "$1" = "--watch" ] || [ "$1" = "-w" ]; then
  WATCH=true
fi

short_name() {
  # Shorten object name: strip "a_", "an_", "the_" prefix, truncate to 35 chars
  echo "$1" | sed 's/^a_//;s/^an_//;s/^the_//' | head -c 35
}

show_status() {
  clear 2>/dev/null || true

  RUNNING=$(pgrep -f "claude --print.*allowedTools" 2>/dev/null | wc -l | tr -d ' ')

  DONE=0
  WIP=0
  FAILED=0
  TOTAL=0

  # Build output into arrays first
  done_lines=()
  wip_lines=()
  fail_lines=()

  for d in /tmp/training/*/; do
    [ -d "$d" ] || continue
    TOTAL=$((TOTAL + 1))
    name=$(short_name "$(basename "$d")")
    iters=$(ls -d "$d"iter_*/ 2>/dev/null | wc -l | tr -d ' ')

    # Read scores
    scores=""
    if [ -f "$d/scores.txt" ]; then
      scores=$(awk -F: '{printf "%s", (NR>1 ? "→" : "") $2}' "$d/scores.txt")
    fi

    if [ -f "$d/summary.md" ]; then
      score=$(grep -o 'Score [0-9]*/10' "$d/summary.md" 2>/dev/null | tail -1 | grep -o '[0-9]*/' | tr -d '/')
      DONE=$((DONE + 1))
      done_lines+=("$(printf "  %-37s DONE %-4s %3s  %s" "$name" "($score)" "$iters" "$scores")")
    elif [ "$iters" -gt 0 ]; then
      dir_name=$(basename "$d")
      if pgrep -f "$dir_name" > /dev/null 2>&1; then
        WIP=$((WIP + 1))
        wip_lines+=("$(printf "  %-37s RUNNING     %3s  %s" "$name" "$iters" "$scores")")
      else
        log_size=$(wc -c < "$d/agent-output.log" 2>/dev/null || echo 0)
        if [ "$log_size" -gt 0 ]; then
          FAILED=$((FAILED + 1))
          fail_lines+=("$(printf "  %-37s NO SUMMARY  %3s  %s" "$name" "$iters" "$scores")")
        else
          FAILED=$((FAILED + 1))
          fail_lines+=("$(printf "  %-37s STARTING    %3s  %s" "$name" "$iters" "$scores")")
        fi
      fi
    elif [ -f "$d/agent-output.log" ] && [ ! -s "$d/agent-output.log" ]; then
      WIP=$((WIP + 1))
      wip_lines+=("$(printf "  %-37s STARTING      0" "$name")")
    else
      FAILED=$((FAILED + 1))
      fail_lines+=("$(printf "  %-37s FAILED        0" "$name")")
    fi
  done

  echo "=== Training Status ==="
  echo "$(date '+%H:%M:%S') | Agents: $RUNNING | Done: $DONE | Running: $WIP | Failed: $FAILED | Total: $TOTAL"
  echo ""

  if [ ${#wip_lines[@]} -gt 0 ]; then
    echo "IN PROGRESS:"
    for line in "${wip_lines[@]}"; do echo "$line"; done
    echo ""
  fi

  if [ ${#done_lines[@]} -gt 0 ]; then
    echo "COMPLETED:"
    for line in "${done_lines[@]}"; do echo "$line"; done
    echo ""
  fi

  if [ ${#fail_lines[@]} -gt 0 ]; then
    echo "FAILED (run --clean to remove empty ones):"
    for line in "${fail_lines[@]}"; do echo "$line"; done
    echo ""
  fi

  READY=$(ls /tmp/training/*/summary.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "$READY" -gt 0 ]; then
    echo ">>> $READY ready to merge: npm run merge-training"
  fi
}

if [ "$WATCH" = true ]; then
  while true; do
    show_status
    sleep 10
  done
else
  show_status
fi
