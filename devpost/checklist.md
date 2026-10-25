---
status: approved
build_mode: learn
---

# Build Checklist: sciwalker

## Slices

- [ ] **1. Project scaffold + arg validation + error exits**
  - Becomes usable: `npx tsx src/index.ts` runs and responds correctly to missing args, bad paths, and empty files — exactly as the PRD specifies.
  - Why now: bootstrapping lives in slice 1; every later slice depends on a working entry point and project config.
  - PRD ref: `prd.md > Mode 1 — Startup` (Invocation, all error states)
  - Spec ref: `spec.md > src/index.ts — Entry point`, `spec.md > Stack and Dependencies`, `spec.md > File Structure`
  - Build: initialise `package.json` with `type: module`; install `tsx`, `typescript`, `@types/node`, `dotenv`, `ink`, `react`, `@types/react`, `@strands-agents/sdk`, `zod`; write `tsconfig.json`; write `src/index.ts` with arg parsing and all error exits; create `.env.example`; create `audio/` directory; copy `transcription.txt` into `audio/`.
  - Verify (mechanical): run `npx tsx src/index.ts` (no args) → usage line; run `npx tsx src/index.ts audio/missing.txt` → named error; run `npx tsx src/index.ts audio/empty.txt` (create empty file first) → content error.
  - Learner check: open a terminal in the project folder and run each of the three commands above. You should see the exact error messages from the PRD.
  - Commit: `feat: scaffold project, arg validation, and error exits`

- [ ] **2. Zod KnowledgeItem schema**
  - Becomes usable: `src/schema/knowledge-item.ts` exports `CandidateKnowledgeItemSchema` and `ApprovedKnowledgeItemSchema`; TypeScript compiles without errors.
  - Why now: the schema is the contract both the agent (slice 3) and the TUI (slice 4) depend on; building it in isolation keeps it clean and testable.
  - PRD ref: `prd.md > Output`, `prd.md > Mode 2 — Review > Classification flag values`
  - Spec ref: `spec.md > src/schema/knowledge-item.ts — Zod schema`, `spec.md > KnowledgeItem ID Rule`
  - Build: write `src/schema/knowledge-item.ts` with `CandidateKnowledgeItemSchema` (status: "candidate") and `ApprovedKnowledgeItemSchema` (status: "approved"); export both; run `tsc --noEmit` to confirm types.
  - Verify (mechanical): `npx tsc --noEmit` exits with no errors.
  - Learner check: open `src/schema/knowledge-item.ts` and read the shape — confirm all fields from the PRD's Output section are present: `id`, `type`, `status`, `concept` block, `source` block, `classification`.
  - Commit: `feat: Zod KnowledgeItem schema (candidate + approved)`

- [ ] **3. Strands agent extraction**
  - Becomes usable: running `npx tsx src/agent/extractor.ts audio/transcription.txt` (or a quick test script) calls Bedrock and prints raw candidate cards to stdout.
  - Why now: this is the unique kernel and the highest-risk slice — first real AI API call. If Bedrock credentials or model access have a problem, we find it here before building TUI around it.
  - PRD ref: `prd.md > Mode 1 — Startup` (extraction), `prd.md > Mode 2 — Invalid card`
  - Spec ref: `spec.md > src/agent/extractor.ts — Strands agent`, `spec.md > AWS and Bedrock Setup`
  - Build: write `src/agent/extractor.ts`; create Strands `Agent` with Bedrock default provider; define a custom `tool` with a Zod `inputSchema` that accepts the full transcript text and returns an array of raw `KnowledgeItem` candidates; write system prompt enforcing: literal quotes, `KI-0001` ID format, `status: "candidate"`, classification flag constraint, no definitive contradiction; load `.env` with `dotenv`; export `extractConcepts(transcriptText, transcriptPath)`.
  - Verify (mechanical): run `npx tsx src/agent/extractor.ts` with a real transcript and print raw output; confirm at least one card is returned with `id`, `pref_label`, `quote`, and `classification` fields present.
  - Learner check: copy your `.env.example` to `.env`, fill in your AWS credentials and `BEDROCK_MODEL_ID`, then run the extractor. Read the raw JSON output — does it look like real concepts extracted from the transcript, with verbatim quotes?
  - Commit: `feat: Strands agent transcript extraction via Bedrock`

- [ ] **4. Ink TUI: startup block + card review loop**
  - Becomes usable: running `npx tsx src/index.ts audio/transcription.txt` shows the full startup block, then card-by-card review with `[a]`/`[r]` keybindings, exactly as the PRD specifies.
  - Why now: all data is available from slices 1–3; the TUI is the last piece before persistence.
  - PRD ref: `prd.md > Mode 1 — Startup > Startup block`, `prd.md > Mode 2 — Review`, `prd.md > The Single Surface: Terminal (TUI)`
  - Spec ref: `spec.md > src/tui/App.tsx`, `spec.md > src/tui/StartupBlock.tsx`, `spec.md > src/tui/CardReview.tsx`
  - Build: write `src/tui/App.tsx` managing `startup | review | close` state; write `src/tui/StartupBlock.tsx` (file path, status lines, spinner, Enter to begin); write `src/tui/CardReview.tsx` (all card fields, visual separator between AI-generated and source fields, `[a]`/`[r]` via `useInput`, `Approved: KI-0001` / `Rejected: KI-0001 (not written to output)` feedback lines, schema validation warning for invalid cards); wire `src/index.ts` to mount `App` with candidate cards; skip `CloseBlock` for now (just unmount after last card).
  - Verify (mechanical): run `npx tsx src/index.ts audio/transcription.txt`; confirm startup block appears, first card renders with all fields including `classification` and the source separator, `a` prints Approved, `r` prints Rejected, next card advances automatically.
  - Learner check: run the full command and work through all the cards. Press `a` on some, `r` on others. Does the card display match what the PRD describes? Is the source block visually distinct from the generated fields?
  - Commit: `feat: Ink TUI startup block and card review loop`

- [ ] **5. Persistence: write approved cards + Close block**
  - Becomes usable: a complete end-to-end run — transcript in, approved `KnowledgeItem` JSON out.
  - Why now: last slice; persistence is only meaningful once the review loop is verified.
  - PRD ref: `prd.md > Mode 3 — Close`, `prd.md > Output`
  - Spec ref: `spec.md > src/output/writer.ts — Persistence`, `spec.md > src/tui/CloseBlock.tsx — Close mode`
  - Build: write `src/output/writer.ts` (auto-create `output/` with `fs.mkdirSync({ recursive: true })`; write pretty-printed JSON array; validate each card against `ApprovedKnowledgeItemSchema` before writing); write `src/tui/CloseBlock.tsx` (summary line with count and path, or "no cards approved" message, then `process.exit(0)`); wire `App.tsx` to call `writer.ts` and transition to `CloseBlock` after last decision.
  - Verify (mechanical): run a full end-to-end pass, approve at least one card; confirm `output/approved-knowledge-cards.json` exists and contains valid JSON with the approved card(s) and full provenance fields; run a pass rejecting all cards and confirm no output file is written.
  - Learner check: open `output/approved-knowledge-cards.json` in your editor. Find the `source.segment` and `source.quote` fields on one of the cards and cross-check the quote against the original transcript. Does it match verbatim?
  - Commit: `feat: persistence, writer, and Close block — end-to-end complete`

## Hands-on Checkpoints

- [ ] **Early checkpoint** — after slice 3 (agent extraction): learner runs extractor directly and confirms real concept cards come back from Bedrock before TUI is built around it.
- [ ] **Final review** — after slice 5: full end-to-end run, kick the tires, revisions.

## Final Review

- [ ] Full end-to-end run verified (transcript in → approved JSON out)
- [ ] All PRD acceptance criteria checked
- [ ] Revisions agreed, implemented, and re-verified
- [ ] Learner confirms PoC is ready

## Code Tour and App Map

- [ ] Learning wrap-up complete
- [ ] `devpost/app-map.html` created

## Revisions

<!-- Recorded during the build as things change from the plan -->
