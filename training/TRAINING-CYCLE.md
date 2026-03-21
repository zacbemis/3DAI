# Training Cycle

## One Command

```bash
./training/full-cycle.sh auto       # fully autonomous, runs overnight
./training/full-cycle.sh guided     # step-by-step with human approval
./training/full-cycle.sh auto 10    # auto, max 10 rounds
```

**Auto mode:** Trains → auto-approves score 7+ → scores → queues weak areas → repeats. No human input needed.

**Guided mode:** Same loop but pauses at each step. Press Enter to continue, 'q' to stop.

---

## Manual Step-by-Step

```bash
# 1. Train
./training/launch-training.sh
./training/status.sh --watch

# 2. Merge
npm run merge-training               # interactive: approve/retrain/skip
npm run merge-training -- --auto     # non-interactive: auto-approve 7+
npm run build-prod                   # rebuild agent-prod.md

# 3. Score
npm run regression                   # Level 1: routing (instant)
npm run regression -- --full         # Level 2: trained objects (slow)
npm run level3                       # Level 3: random objects (slow)
npm run scorecard                    # dashboard: categories + trends

# 4. Queue next batch
npm run auto-queue                   # generates next-batch.txt from weak areas
# copy into launch-training.sh, repeat
```

---

## Commands

| Command | What | Speed |
|---------|------|-------|
| `./training/full-cycle.sh auto` | Full autonomous loop | hours |
| `./training/full-cycle.sh guided` | Full loop with approval | interactive |
| `./training/launch-training.sh` | Train batch | ~5 min/object |
| `./training/status.sh --watch` | Live dashboard | instant |
| `./training/status.sh --nuke` | Kill all + wipe data | instant |
| `./training/status.sh --clean` | Remove failed dirs | instant |
| `npm run merge-training` | Interactive review | interactive |
| `npm run merge-training -- --auto` | Auto-approve 7+, skip rest | fast |
| `npm run merge-training -- --dry-run` | Preview without changes | instant |
| `npm run build-prod` | Rebuild agent-prod.md | instant |
| `npm run regression` | Level 1: routing | instant |
| `npm run regression -- --full` | Level 2: generation test | ~2 min/object |
| `npm run level3` | Level 3: generalization | ~2 min/object |
| `npm run scorecard` | Scores + categories + trends | instant |
| `npm run auto-queue` | Generate next batch from weak areas | instant |

---

## What Each Level Tests

| Level | Tests | Measures |
|-------|-------|----------|
| 1 | Keyword routing | Does the right technique get selected? |
| 2 | Trained quality | Do trained objects still generate well? |
| 3 | Generalization | Do untrained random objects work? |

---

## Merge Modes

| Flag | Behavior |
|------|----------|
| (none) | Opens render in browser, asks approve/retrain/skip |
| `--auto` | Score >= 7 auto-approved, < 7 skipped, conflicts skipped |
| `--dry-run` | Preview only, no changes |

---

## Reading the Scorecard

```
CATEGORY SCORES:
  revolution       7.5/10 avg (10 objects)       ← strong
  organic          5.5/10 avg (6 objects)         ← WEAK
  uncategorized    5.2/10 avg (3 objects)         (low sample)
```

- **7+** = good
- **6-7** = could improve
- **<6.5 with 5+ objects** = WEAK, auto-queue adds training for this
- **(low sample)** = need more data

---

## The Auto-Queue

`npm run auto-queue` reads Level 2 + Level 3 reports and generates `next-batch.txt`:

- **Retrains** — objects that regressed or errored
- **L3 failures** — random objects that scored below 6
- **Category expansion** — new objects for weak categories

---

## Full Cycle Example

```bash
# Run overnight
./training/full-cycle.sh auto 5

# Next morning, check results
npm run scorecard

# If satisfied, deploy
npm run build-prod
# copy agent-prod.md to your production project
```
