# Training Agent: Iterate on a 3D Object

You are training a 3D model generation system. Your job is to iterate on a single object through up to 10 rounds of generate → render → get scored by external scorer → refine.

You do NOT score yourself. A separate scorer agent evaluates your renders.

## Setup

1. OpenSCAD must be installed (`brew install openscad`)
2. You need Bash access to run OpenSCAD CLI and the scorer

## Your Task

You will be given an **object prompt** and a **context file** (pre-filtered agent.md with only relevant techniques). Iterate until the scorer says stop.

### Per iteration:

1. **Write OpenSCAD code** — use techniques from the context file if relevant, otherwise develop new ones
2. **Save to a .scad file** — `{work_dir}/iter_{n}/model.scad`
3. **Compile to STL** via OpenSCAD CLI:
   ```bash
   mkdir -p {work_dir}/iter_{n}
   cd {work_dir}/iter_{n}
   /opt/homebrew/bin/openscad -o model.stl model.scad
   ```
   If compile fails, fix the error and retry (up to 3 times).
4. **Render 4 views** via OpenSCAD CLI:
   ```bash
   /opt/homebrew/bin/openscad -o iso.png --camera=0,0,0,55,0,25,0 --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow model.scad
   /opt/homebrew/bin/openscad -o front.png --camera=0,0,0,90,0,0,0 --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow --projection=ortho model.scad
   /opt/homebrew/bin/openscad -o right.png --camera=0,0,0,90,0,90,0 --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow --projection=ortho model.scad
   /opt/homebrew/bin/openscad -o top.png --camera=0,0,0,0,0,0,0 --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow --projection=ortho model.scad
   ```
5. **Call the external scorer** — run this bash command and capture the output:
   ```bash
   SCORE_OUTPUT=$(cat <<'SCOREPROMPT' | claude --print --allowedTools 'Read'
   You are scoring a 3D model render. The model was supposed to be: "{prompt}"

   Read these 4 PNG files to evaluate:
   - {work_dir}/iter_{n}/iso.png
   - {work_dir}/iter_{n}/front.png
   - {work_dir}/iter_{n}/right.png
   - {work_dir}/iter_{n}/top.png

   IMPORTANT: OpenSCAD renders thin walls and certain angles as semi-transparent or ghostly. This is a rendering artifact, NOT a geometry problem. Do not penalize for transparency — the model is solid. Focus on shape, not rendering quality.

   Evaluation criteria:
   - Silhouette: does the outline match what the object should look like?
   - Proportions: are features the right size relative to each other?
   - Detail: are curves smooth, walls consistent, no artifacts?
   - Completeness: are all described features present?
   - IGNORE: transparency artifacts, color, surface texture — these are OpenSCAD rendering limitations, not model defects

   Respond with EXACTLY two lines:
   SCORE: {1-10}
   FEEDBACK: {one sentence describing what is right and what is wrong}

   Do not add any other text.
   SCOREPROMPT
   )
   echo "$SCORE_OUTPUT"
   ```
6. **Parse the score** — extract the score and feedback from the output:
   - Score: match `/SCORE:\s*(\d+)/i` — if no match, default to 5 and mark as PARSE_FAIL
   - Feedback: match `/FEEDBACK:\s*(.+)/i` — if no match, use "could not parse scorer output"
7. **Write to scores.txt:**
   ```bash
   echo "{n}:{score}" >> {work_dir}/scores.txt
   ```
   If parse failed, write `{n}:{score}:PARSE_FAIL` instead.
8. **Track scorer failures** — if the scorer has failed to parse 3+ times total in this run, STOP and write summary with best result so far. Flag as `SCORER_BROKEN` in the summary.
9. **Check termination — these are MANDATORY, not suggestions:**
   - **Score >= 8** → STOP IMMEDIATELY. Go to "Write Summary" below. Do NOT do another iteration.
   - **Same score 3 times in a row** → STOP. You are stuck. Go to "Write Summary." Example: 7→7→7 means STOP. Example: 6→7→7→7 means STOP (three 7s in a row).
   - **Iteration 10** → STOP. Hard cap. Go to "Write Summary."
   - **Score < 4** → start over with a completely different approach
   - **Score 4-7** → use the scorer's FEEDBACK to fix the single biggest issue
   - **Score drops from previous** → REVERT to best version's code
10. **Log the iteration:**
    ```
    Iteration {n}: Score {score}/10 — {scorer feedback}
    ```

### Write Summary

1. **Save the final .scad and .stl** to `{work_dir}/final/`
2. **Write the training summary** to `{work_dir}/summary.md`:
   ```markdown
   # Training: {object name}

   ## Prompt
   {the original prompt}

   ## Iterations
   {iteration log from above}

   ## Technique Discovered
   - **Name:** {technique name}
   - **Category:** {what class of objects this applies to}
   - **Keywords:** {comma-separated trigger words}
   - **Core approach:** {1-2 sentences}
   - **Key code pattern:** {the critical code block}
   - **Pitfalls:** {what went wrong during iteration}

   ## Proposed agent.md Addition
   {a complete ### Technique: section ready to paste into agent.md, following the existing format}

   ## New Visual Failures
   {any new rows for the visual failure table in section 2, if discovered}

   ## Decision Tree Update
   {any new rows needed in the section 1 classification table}
   ```

## Rules

- **You do NOT score yourself.** The external scorer scores you. Trust its score.
- **STOP when the scorer gives >= 8.** Do not do another iteration.
- **STOP when stuck.** If you get the same score 3 times in a row, STOP. Example: 7→7→7 = STOP.
- **Max 10 iterations.** Hard cap.
- **Max 2 scorer failures.** If 3+ parse failures, stop and flag SCORER_BROKEN.
- ALWAYS write summary.md when done.
- Track the best score and best code. Never build on a regression.
- Keep iteration code changes minimal — fix ONE thing at a time.
- Do not hallucinate OpenSCAD functions.
- The goal is to discover a **generalizable technique** for agent.md.
