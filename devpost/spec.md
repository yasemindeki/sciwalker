---
status: approved
---

# Technical Specification: sciwalker

## How This Works, In Plain Language

`sciwalker` is a Node.js CLI you run from your terminal with a transcript file path
as the argument. Here is what happens in order:

1. **Startup** — `sciwalker` reads the transcript file from disk and sends its full
   text to an AI agent (powered by Amazon Bedrock via the Strands Agents SDK). The
   agent extracts every concept it can find and returns them as a structured list.

2. **Validation** — each extracted concept is validated against a Zod schema. Candidates
   that fail validation are dropped with a warning and never shown to the researcher.

3. **Review** — the terminal (built with Ink) shows one card at a time. The researcher
   reads the card — including the AI-proposed `classification` flag — and presses `[a]`
   to approve or `[r]` to reject. Nothing is written until a card is approved.

4. **Persist** — after the last decision, all approved cards are written together to
   `output/approved-knowledge-cards.json`. The `output/` directory is created
   automatically if it does not exist.

The Strands agent is called once per run (not once per card). It returns the full list
of candidate cards in a single structured response. The review loop is handled entirely
in the CLI layer — the agent is not involved in the approve/reject decision.

---

## Where It Runs and How to Try It

**Runtime:** Node.js 22+
**Package manager:** npm

```bash
# Install dependencies
npm install

# Run sciwalker
npx tsx src/index.ts audio/transcript.txt
```

Runs locally on macOS, Linux, or Windows. No deployment required for the proof of
concept. A local run is sufficient for the demo video.

---

## AWS and Bedrock Setup

Implements: `prd.md > Mode 1 — Startup` (agent invocation)

This section must be followed before `sciwalker` can call the AI model.

### 1. Enable Bedrock model access

1. Log in to the [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **Amazon Bedrock → Model access**
3. Request access to **Claude Sonnet** (the default Strands model is
   `us.amazon.nova-pro-v1:0` but Claude Sonnet 4.x on Bedrock is recommended for
   structured extraction quality)
4. Note your AWS region (e.g. `us-east-1`)

### 2. Configure credentials locally

The Strands SDK reads standard AWS credential sources. The simplest local option is:

```bash
aws configure
# AWS Access Key ID:     <your key>
# AWS Secret Access Key: <your secret>
# Default region name:   us-east-1   (or your Bedrock-enabled region)
# Default output format: json
```

Alternatively, set environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

Or use a Bedrock API key (quickest for local dev):

```bash
export AWS_BEARER_TOKEN_BEDROCK=your_bedrock_api_key
```

### 3. Environment file

The project uses a `.env` file for runtime configuration. Copy `.env.example` and
fill in your values:

```bash
cp .env.example .env
```

`.env.example` contents (committed to the repo; `.env` is gitignored):

```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5
```

The coding agent must use `dotenv` to load these at startup.

---

## Stack and Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@strands-agents/sdk` | latest | AI agent loop + Bedrock model provider |
| `zod` | latest | KnowledgeItem schema validation |
| `ink` | latest | Terminal UI (boxes, spinner, keymap) |
| `react` | latest | Ink peer dependency |
| `dotenv` | latest | Load `.env` at startup |
| `tsx` | latest (dev) | Run TypeScript directly with Node.js |
| `typescript` | latest (dev) | Type checking |
| `@types/node` | latest (dev) | Node.js type definitions |
| `@types/react` | latest (dev) | React type definitions for Ink |

**Doc links:**
- Strands Agents TypeScript SDK: https://strandsagents.com/docs/user-guide/sdk/quickstart/typescript/
- Strands SDK GitHub: https://github.com/strands-agents/sdk-typescript
- Ink: https://github.com/vadimdemedes/ink
- Zod: https://zod.dev

---

## File Structure

```
sciwalker/
├── src/
│   ├── index.ts              # Entry point — parses args, orchestrates the run
│   ├── agent/
│   │   └── extractor.ts      # Strands agent: reads transcript, returns candidate cards
│   ├── schema/
│   │   └── knowledge-item.ts # Zod schema for KnowledgeItem
│   ├── tui/
│   │   ├── App.tsx           # Root Ink component — manages mode (Startup/Review/Close)
│   │   ├── StartupBlock.tsx  # Startup mode: file path, status lines, Enter prompt
│   │   ├── CardReview.tsx    # Review mode: card display + [a]/[r] decision prompt
│   │   └── CloseBlock.tsx    # Close mode: final summary line
│   └── output/
│       └── writer.ts         # Writes approved cards to output/approved-knowledge-cards.json
├── audio/
│   └── transcript.txt        # Researcher places their transcript here
├── output/                   # Created automatically by sciwalker if absent
│   └── approved-knowledge-cards.json
├── .env                      # Local credentials and config (gitignored)
├── .env.example              # Committed template for .env
├── .gitignore
├── package.json
├── tsconfig.json
└── devpost/                  # Planning docs (this file lives here)
```

---

## Component Breakdown

### `src/index.ts` — Entry point

Implements: `prd.md > Mode 1 — Startup` (arg validation and error exits)

- Reads `process.argv[2]` for the transcript path
- If missing: prints usage line and exits (no Ink, no file I/O)
- If path unreadable or missing: prints named error and exits
- If file empty/near-empty: prints content error and exits
- Otherwise: reads file content, calls `extractor.ts`, then mounts the Ink `App`

### `src/agent/extractor.ts` — Strands agent

Implements: `prd.md > Mode 1 — Startup` (extraction), `prd.md > Mode 2 — Invalid card`

- Creates a Strands `Agent` using the Bedrock default provider
- Defines one custom `tool` with a Zod `inputSchema` — the tool accepts the full
  transcript text and returns an array of raw `KnowledgeItem` candidates
- The system prompt instructs the agent to:
  - Extract named concepts from the transcript
  - Ground each concept to a specific segment (start_time, end_time, verbatim quote)
  - Propose one classification flag per card (`supports`, `insufficient`, or
    `potential_contradiction`) — never assert definitive contradiction
  - Auto-increment IDs as `KI-0001`, `KI-0002`, …
  - Set `status: "candidate"` on every card
  - Never paraphrase the quote — use literal transcript text only
- Returns raw candidates; validation happens in the caller

### `src/schema/knowledge-item.ts` — Zod schema

Implements: `prd.md > Output`, `prd.md > Mode 2 — Invalid card`

Defines and exports two schemas:

**`CandidateKnowledgeItemSchema`** — used to validate agent output before display:

```typescript
// Shape only — coding agent fills in exact field definitions
{
  id: string,            // KI-0001 format
  type: "concept",
  status: "candidate",
  concept: {
    id: string,
    pref_label: { text: string, language: string },
    alt_labels: Array<{ text: string, language: string }>,
    definition: { text: string, language: string },
    scope_note: { text: string, language: string },
  },
  source: {
    transcript_path: string,
    segment: { id: string, start_time: string, end_time: string },
    quote: { text: string, language: string },
  },
  classification: "supports" | "insufficient" | "potential_contradiction",
}
```

**`ApprovedKnowledgeItemSchema`** — same shape with `status: "approved"`, used
before writing to disk.

### `src/tui/App.tsx` — Root Ink component

Implements: `prd.md > The Single Surface: Terminal (TUI)`

- Manages the three sequential modes as React state: `startup | review | close`
- Receives the candidate card array as a prop
- Passes control to `StartupBlock`, `CardReview`, and `CloseBlock` in sequence
- Tracks the list of approved cards across the review loop

### `src/tui/StartupBlock.tsx` — Startup mode

Implements: `prd.md > Mode 1 — Startup > Startup block`

- Displays the startup block lines (file path, status lines, candidate count)
- Shows a spinner during extraction (if extraction is async)
- Waits for Enter keypress before yielding to Review mode
- Uses Ink's `Box`, `Text`, `Spinner` components and `useInput` for Enter detection

### `src/tui/CardReview.tsx` — Review mode

Implements: `prd.md > Mode 2 — Review`

- Receives the current card and its index (`Card N of M`)
- Renders all fields: `id`, `type`, `pref_label`, `definition`, `scope_note`,
  `classification`, `source` block (transcript_path, segment, quote, speaker)
- Visual separation between AI-generated fields and source fields (a horizontal
  divider line between `classification` and `Source:`)
- Uses `useInput` to capture `a` (approve) and `r` (reject)
- On approve: prints `Approved: KI-0001`, adds card to approved list with
  `status: "approved"`, advances to next card
- On reject: prints `Rejected: KI-0001 (not written to output)`, advances to
  next card
- When all cards are exhausted: transitions App to Close mode

### `src/tui/CloseBlock.tsx` — Close mode

Implements: `prd.md > Mode 3 — Close`

- Receives approved card count and output file path
- If count > 0: prints `Wrote N cards to output/approved-knowledge-cards.json.`
- If count = 0: prints `No cards were approved. No output file was written.`
- Calls `process.exit(0)` after rendering

### `src/output/writer.ts` — Persistence

Implements: `prd.md > Output`, `prd.md > Mode 3 — Close`

- Accepts the array of approved `KnowledgeItem` objects
- Creates `output/` directory with `fs.mkdirSync({ recursive: true })` if absent
- Writes `output/approved-knowledge-cards.json` as a pretty-printed JSON array
- Called once, after the review loop ends, before `CloseBlock` renders

---

## KnowledgeItem ID Rule

IDs are uppercase, `KI-` prefix, four-digit zero-padded integer:
`KI-0001`, `KI-0002`, `KI-0003`, …

The agent generates IDs sequentially starting from `KI-0001` within each run.
There is no cross-run ID persistence — each run starts from `KI-0001`.

---

## Data Flow

```
transcript.txt
      │
      ▼
  index.ts ──── arg validation / error exits
      │
      ▼
  extractor.ts  (Strands Agent → Bedrock)
      │  returns raw candidate array
      ▼
  Zod validation (CandidateKnowledgeItemSchema)
      │  invalid cards dropped with Warning
      ▼
  Ink App.tsx
      │
      ├── StartupBlock.tsx  (mode: startup)
      │       researcher presses Enter
      ├── CardReview.tsx    (mode: review, one card at a time)
      │       [a] → approved list
      │       [r] → dropped
      └── CloseBlock.tsx    (mode: close)
              │
              ▼
          writer.ts → output/approved-knowledge-cards.json
```

---

## PoC Simplifications

- The Strands agent is called once per run with the full transcript text. No chunking,
  no streaming per card.
- `speaker` field is present in the schema but the agent is not instructed to extract
  it. It will be `null` or omitted.
- `audio_path` field is present in the schema but always `null`.
- No cross-run ID persistence — each run restarts from `KI-0001`.
- Output path is fixed: `output/approved-knowledge-cards.json`.
- No test suite for the PoC (deadline constraint).

---

## Decisions and Open Issues

| Decision | Choice | Reason |
|----------|--------|--------|
| Runtime | Node.js 22+ | Preferred stack; avoids Bun runtime dependency |
| TUI library | Ink | React-style components, Node.js native, stable TypeScript support |
| Agent framework | Strands Agents TypeScript SDK (`@strands-agents/sdk`) | Chosen in scope |
| Model provider | Amazon Bedrock (default Strands provider) | Free trial account available |
| Output format | JSON only | Deadline constraint; no YAML/JSON-LD |
| Output path | Fixed at `output/approved-knowledge-cards.json` | Simplest PoC approach |
| `output/` dir | Auto-created by `writer.ts` | Better UX; no manual step required |
| Classification | Informational only; not interactive | PRD decision |
| ID format | `KI-0001` uppercase, 4-digit zero-padded | Established in learner profile template |
| Agent call strategy | Single call for full transcript | Simplest PoC; no per-card streaming |

**Open issue — Bedrock model selection:** The spec defaults to Claude Sonnet 4.x
on Bedrock for structured extraction quality. The exact `BEDROCK_MODEL_ID` value
should be confirmed against the models enabled in the researcher's AWS account
before the first run. The `.env.example` provides a placeholder.
