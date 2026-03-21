# Training Pipeline

## The Loop

```bash
./training/launch-training.sh       # 1. Train
./training/status.sh --watch        # 2. Watch
npm run merge-training              # 3. Review & merge
```

That's it. Train → Watch → Merge → Done.

---

## What Each Step Does

### 1. Train
```bash
./training/launch-training.sh       # 31 objects, 3 concurrent
./training/launch-training.sh 5     # or 5 concurrent
```
Spawns agents that each run 10 iterations of OpenSCAD generation on an object.

### 2. Watch
```bash
./training/status.sh --watch        # live dashboard (Ctrl+C to stop)
./training/status.sh                # one-shot check
```
Status meanings:
| Status | Meaning |
|--------|---------|
| STARTING | Agent launched, no iterations yet |
| RUNNING | Iterations in progress, shows score trajectory (4→5→6→7) |
| DONE (8) | Summary written, score shown, ready for merge |
| NO SUMMARY | Agent finished but didn't write summary |
| FAILED | Agent died with no iterations |

When summaries are ready: `Ready to merge: 3 — run: npm run merge-training`

### Cleanup
```bash
./training/status.sh --clean        # remove dirs with 0 iterations (gentle)
./training/status.sh --nuke         # kill all agents + delete all data (nuclear reset)
```
Use `--nuke` when you want to restart a batch from scratch. Use `--clean` to tidy up failed leftovers.

### 3. Review & Merge
```bash
npm run merge-training              # interactive review
npm run merge-training -- --dry-run # preview only
```
Opens the 4-view render in your browser for each result. You choose:
- **`a`** approve — merges technique into agent.md
- **`r`** retrain — launches a new agent to try again
- **`s`** skip — leaves it for later

Routing regression runs automatically after merge.

---

## Check for Degradation

```bash
npm run regression              # Level 1: routing checks (instant)
npm run regression -- --full    # Level 1 + Level 2: generate and score (slow)
```

### Level 1: Routing (instant, no API)
Checks that prompts route to the correct techniques. Runs after every merge automatically.

### Level 2: Generation (slow, uses Claude Code)
Re-generates each baseline object using current agent.md and scores the render:
- **1 run per baseline** — generates code, compiles, renders 4 views, scores with separate agent
- **All 4 angles scored** — iso, front, right, top (not just iso)
- **Regressions auto-open** — if a score drops by 2+ from baseline, grid.html opens in your browser
- **Renders saved** to `/tmp/regression_level2/{date}/` for review
- Uses `claude --print` for both generation and scoring — no API keys needed

To enable Level 2 for a baseline, set `minScore` in `regression.json`. This happens automatically when you approve during merge.

### When to run each level
| When | Command |
|------|---------|
| After every merge | Level 1 runs automatically |
| After a big batch of merges | `npm run regression -- --full` |
| Before a release | `npm run regression -- --full` |
| Spot-checking one object | Open its render in `/tmp/regression_level2/` |

---

## View a Specific Object

```bash
# See iterations
ls /tmp/training/{object}/iter_*/

# View latest render
open /tmp/training/{object}/iter_9/grid.html

# Read agent log
cat /tmp/training/{object}/agent-output.log
```

## Re-train a Single Object

```bash
mkdir -p /tmp/training/my_object
cat <<'PROMPT' | claude --print --allowedTools 'Bash,Read,Write,Glob,Grep'
Read training/train-object.md for instructions. Read agent.md for techniques.
Your object prompt is: "my object description"
Your work directory is: /tmp/training/my_object
The OpenSCAD binary is at /opt/homebrew/bin/openscad
Start iterating. Run all 10 iterations, then write the summary.
PROMPT
```

## Edit the Object List

Change the `OBJECTS` array in `launch-training.sh`.

## Directory Structure

```
training/
  launch-training.sh    # Launch training agents
  status.sh             # Progress dashboard
  train-object.md       # Agent instructions
  merge.ts              # Merge with visual approval
  regression.ts         # Regression testing
  regression.json       # Quality baselines
  lib/                  # Shared modules
  test/                 # Unit tests
  archive/              # Past results (gitignored)
```
