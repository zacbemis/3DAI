#!/bin/bash
# Launch parallel training agents for different objects
# Usage: ./launch-training.sh [max_concurrent]
# Default: 5 concurrent agents, rest queued

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_PROMPT="$SCRIPT_DIR/train-object.md"
MAX_CONCURRENT=${1:-3}

# ============================================================
# TRAINING OBJECTS — 41 (new coverage + cotter pin retrain)
# ============================================================
OBJECTS=(
  # --- Retrain ---
  "a cotter pin 30mm long with thin wire-like legs of equal length"

  # --- Fasteners & joints ---
  "a dovetail joint with male and female pieces displayed side by side"
  "a snap buckle clip like on a backpack strap"
  "a cable tie / zip tie with ratchet teeth"
  "a toggle clamp with base, arm, and clamping bar"
  "a magnetic mount base with a counterbore for a disc magnet"

  # --- Enclosures & cases ---
  "a Raspberry Pi case with port cutouts on the sides"
  "a battery compartment with spring contacts and a sliding lid"
  "an SD card holder rack for 6 cards"
  "a watch box with a hinged lid"
  "a small safe box with a combination dial on the front"

  # --- Architectural & structural ---
  "a roman arch bridge"
  "a gothic arch window frame with pointed top"
  "a spiral staircase with 5 steps around a central column"
  "a miniature classical column with capital, shaft, and base"
  "a fence post with a decorative pointed finial on top"

  # --- Tools & instruments ---
  "an open-end wrench for a 10mm bolt"
  "a screwdriver handle with ergonomic grip and hex socket"
  "a C-clamp with screw and swivel pad"
  "a level bubble vial housing with a window cutout"
  "a protractor half-circle with degree tick marks at 10-degree intervals"

  # --- Toys & novelty ---
  "a six-sided die (D6) with pip indents on each face"
  "a spinning top with a pointed tip and finger grip"
  "a whistle with an internal air chamber and sound hole"
  "a flat maze puzzle disc with channel grooves"
  "a stacking rings toy with 3 graduated rings on a post"

  # --- Wearable / personal ---
  "a plain ring band sized for a finger, 18mm inner diameter"
  "a keychain tag with raised text reading HELLO"
  "a badge clip with a spring mechanism and flat plate"
  "a pair of eyeglass nose pads on wire arms"
  "a zipper pull with a loop and teardrop shape"

  # --- Plumbing / piping ---
  "a pipe T-junction with 20mm inner diameter"
  "a pipe reducer connecting 25mm to 15mm diameter"
  "a pipe flange disc with 4 bolt holes in a circle"
  "a valve handle with a cross/plus shape"
  "a curved faucet spout with a 90-degree arc"

  # --- Thin-walled / outline objects (gap from Level 2) ---
  "a star-shaped cookie cutter made from thin metal band, not solid"
  "a heart-shaped cookie cutter from thin 1mm wall"
  "a circular cookie cutter with a handle on top"
  "a thin-walled cylindrical vase with no bottom, like a sleeve"
  "a wire frame cube made from thin rods"
)

# ============================================================
# Concurrency management
# ============================================================
RUNNING_PIDS=()
COMPLETED=0
FAILED=0
SKIPPED_COUNT=0
TOTAL=${#OBJECTS[@]}
echo "Note: Tier 1-2 are retrains/improvements, Tier 3 are baseline tests, Tier 4-7 are new objects"

sanitize_name() {
  echo "$1" | tr ' ' '_' | tr -cd 'a-zA-Z0-9_-' | head -c 50
}

wait_for_slot() {
  while [ ${#RUNNING_PIDS[@]} -ge $MAX_CONCURRENT ]; do
    local new_pids=()
    for pid in "${RUNNING_PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        new_pids+=("$pid")
      else
        wait "$pid"
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
          COMPLETED=$((COMPLETED + 1))
        else
          FAILED=$((FAILED + 1))
        fi
        echo "[Progress] $((COMPLETED + FAILED))/$TOTAL done ($COMPLETED ok, $FAILED failed), ${#new_pids[@]} running"
      fi
    done
    RUNNING_PIDS=("${new_pids[@]}")
    if [ ${#RUNNING_PIDS[@]} -ge $MAX_CONCURRENT ]; then
      sleep 2
    fi
  done
}

should_skip() {
  local obj_name="$1"
  local work_dir="/tmp/training/$obj_name"

  # Skip if already has a summary (done, waiting for merge)
  if [ -f "$work_dir/summary.md" ]; then
    echo "already done"
    return 0
  fi

  # Skip if already archived (previously merged)
  local archive_dir="$APP_DIR/training/archive"
  if find "$archive_dir" -maxdepth 3 -name "summary.md" -path "*$obj_name*" 2>/dev/null | grep -q .; then
    echo "already merged"
    return 0
  fi

  # Skip if there are iterations AND no summary (still in progress or died)
  local iters=$(ls -d "$work_dir"/iter_*/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$iters" -gt 0 ] && [ ! -f "$work_dir/summary.md" ]; then
    # Check if an agent is actually running for this dir
    if pgrep -f "$work_dir" > /dev/null 2>&1; then
      echo "in progress ($iters iters)"
      return 0
    else
      # Has iterations but no running agent and no summary — probably crashed
      # Don't skip — let it retrain
      return 1
    fi
  fi

  return 1
}

launch_agent() {
  local object="$1"
  local obj_name
  obj_name=$(sanitize_name "$object")
  local work_dir="/tmp/training/$obj_name"

  # Check if we should skip
  local skip_reason
  skip_reason=$(should_skip "$obj_name")
  if [ $? -eq 0 ]; then
    echo "[Skip]   $object ($skip_reason)"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    return
  fi

  mkdir -p "$work_dir"

  # Pre-filter agent.md to only relevant techniques
  npx tsx "$SCRIPT_DIR/filter-context.ts" "$object" "$work_dir" > "$work_dir/agent-context.md" 2>/dev/null

  echo "[Launch] $object"
  echo "         -> $work_dir"
  # Show what techniques were matched
  if [ -f "$work_dir/filter-log.txt" ]; then
    grep "Matched" "$work_dir/filter-log.txt" | head -1 | sed 's/^/         /'
  fi

  cat <<PROMPT | claude --print --allowedTools 'Bash,Read,Write,Glob,Grep' > "$work_dir/agent-output.log" 2>&1 &
Read $AGENT_PROMPT for your instructions. Then read $work_dir/agent-context.md for relevant techniques (this is a pre-filtered version of agent.md with only the techniques that match your object).

Your object prompt is: "$object"
Your work directory is: $work_dir
The OpenSCAD binary is at /opt/homebrew/bin/openscad

Start iterating. Use the external scorer as described in the instructions. Do NOT score yourself. Do NOT open a browser.
PROMPT

  RUNNING_PIDS+=($!)
}

# ============================================================
# Main
# ============================================================
echo "=== 3D Model Training Launcher ==="
echo "Objects: $TOTAL"
echo "Max concurrent: $MAX_CONCURRENT"
echo "App dir: $APP_DIR"
echo ""

for i in "${!OBJECTS[@]}"; do
  wait_for_slot
  launch_agent "${OBJECTS[$i]}"
done

# Wait for remaining
echo ""
echo "All launched. Waiting for remaining ${#RUNNING_PIDS[@]} agents..."
for pid in "${RUNNING_PIDS[@]}"; do
  wait "$pid"
  exit_code=$?
  if [ $exit_code -eq 0 ]; then
    COMPLETED=$((COMPLETED + 1))
  else
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=== Training Complete ==="
echo "Total: $TOTAL | Launched: $((COMPLETED + FAILED)) | Skipped: $SKIPPED_COUNT | Completed: $COMPLETED | Failed: $FAILED"
echo ""
echo "Summaries ready for merge:"
for i in "${!OBJECTS[@]}"; do
  obj_name=$(sanitize_name "${OBJECTS[$i]}")
  summary="/tmp/training/$obj_name/summary.md"
  if [ -f "$summary" ]; then
    echo "  ✓ $summary"
  else
    echo "  ✗ /tmp/training/$obj_name/ (no summary)"
  fi
done
echo ""
echo "Next step: npm run merge-training"
