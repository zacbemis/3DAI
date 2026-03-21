#!/bin/bash
# Full training cycle — two modes:
#   ./training/full-cycle.sh auto      — fully autonomous, runs overnight
#   ./training/full-cycle.sh guided    — pauses for human approval at each step
#
# The cycle: Train → Merge → Build → Score → Queue → Repeat

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

MODE=${1:-guided}
MAX_ROUNDS=${2:-5}
ROUND=0

if [ "$MODE" != "auto" ] && [ "$MODE" != "guided" ]; then
  echo "Usage: ./training/full-cycle.sh [auto|guided] [max_rounds]"
  echo "  auto    — fully autonomous, no human input"
  echo "  guided  — pauses for approval at each step"
  exit 1
fi

echo "=== Full Training Cycle ==="
echo "Mode: $MODE"
echo "Max rounds: $MAX_ROUNDS"
echo ""

pause_if_guided() {
  if [ "$MODE" = "guided" ]; then
    echo ""
    echo ">>> $1"
    read -p "    Press Enter to continue, or 'q' to stop: " choice
    if [ "$choice" = "q" ]; then
      echo "Stopped by user."
      exit 0
    fi
  fi
}

while [ $ROUND -lt $MAX_ROUNDS ]; do
  ROUND=$((ROUND + 1))
  echo ""
  echo "============================================"
  echo "  ROUND $ROUND / $MAX_ROUNDS"
  echo "============================================"
  echo ""

  # ---- Step 1: Check if there's a queue to train ----
  if [ $ROUND -eq 1 ]; then
    # First round: use whatever is in launch-training.sh
    echo "[Step 1] Using objects from launch-training.sh"
  else
    # Subsequent rounds: generate queue from scores
    echo "[Step 1] Generating training queue from scores..."
    npm run auto-queue 2>&1
    echo ""

    QUEUE_FILE="$SCRIPT_DIR/next-batch.txt"
    if [ ! -f "$QUEUE_FILE" ] || ! grep -q '^"' "$QUEUE_FILE" 2>/dev/null; then
      echo "No objects to train — all levels passing!"
      echo "Training cycle complete after $((ROUND - 1)) rounds."
      break
    fi

    # Extract prompts from next-batch.txt into launch-training.sh
    echo "Updating launch-training.sh with queued objects..."
    PROMPTS=$(grep '^"' "$QUEUE_FILE" | sed 's/ *#.*//')

    # Build new OBJECTS array
    {
      echo "# Auto-generated batch — round $ROUND"
      echo "OBJECTS=("
      echo "$PROMPTS" | while read -r line; do
        echo "  $line"
      done
      echo ")"
    } > /tmp/training_objects_patch.txt

    # Replace OBJECTS array in launch-training.sh
    # Find start and end of OBJECTS array
    START=$(grep -n '^OBJECTS=(' "$SCRIPT_DIR/launch-training.sh" | head -1 | cut -d: -f1)
    END=$(awk "NR>$START && /^\)/{print NR; exit}" "$SCRIPT_DIR/launch-training.sh")

    if [ -n "$START" ] && [ -n "$END" ]; then
      head -n $((START - 1)) "$SCRIPT_DIR/launch-training.sh" > /tmp/launch_training_new.sh
      cat /tmp/training_objects_patch.txt >> /tmp/launch_training_new.sh
      tail -n +$((END + 1)) "$SCRIPT_DIR/launch-training.sh" >> /tmp/launch_training_new.sh
      cp /tmp/launch_training_new.sh "$SCRIPT_DIR/launch-training.sh"
      chmod +x "$SCRIPT_DIR/launch-training.sh"
    fi
  fi

  pause_if_guided "Ready to start training?"

  # ---- Step 2: Train ----
  echo "[Step 2] Launching training..."
  "$SCRIPT_DIR/launch-training.sh"
  echo ""
  echo "Training complete."

  # ---- Step 3: Merge ----
  if [ "$MODE" = "auto" ]; then
    echo "[Step 3] Auto-merging (score >= 7 approved, < 7 skipped, conflicts skipped)..."
    npm run merge-training -- --auto 2>&1
  else
    echo "[Step 3] Review and merge training results..."
    pause_if_guided "Ready to review and merge?"
    npm run merge-training
  fi

  # ---- Step 4: Rebuild prod ----
  echo "[Step 4] Rebuilding agent-prod.md..."
  npm run build-prod 2>&1
  echo ""

  # ---- Step 5: Score ----
  echo "[Step 5] Running regression tests..."

  echo ""
  echo "--- Level 1: Routing ---"
  npm run regression 2>&1
  echo ""

  pause_if_guided "Run Level 2 (generation test, slow)?"

  echo "--- Level 2: Generation ---"
  npm run regression -- --full 2>&1
  echo ""

  pause_if_guided "Run Level 3 (generalization test, slow)?"

  echo "--- Level 3: Generalization ---"
  npm run level3 2>&1
  echo ""

  # ---- Step 6: Scorecard ----
  echo "[Step 6] Scorecard..."
  npm run scorecard 2>&1
  echo ""

  pause_if_guided "Continue to next round?"

done

echo ""
echo "=== Training Cycle Complete ==="
echo "Rounds completed: $ROUND"
echo ""
echo "Final status:"
npm run scorecard 2>&1
