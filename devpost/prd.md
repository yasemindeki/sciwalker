---
status: approved
---

# Product Requirements Document: sciwalker

## What It Is

`sciwalker` is a CLI tool that reads a timestamped academic transcript, extracts
concept `KnowledgeItem` cards using an AI agent, and lets a research assistant
approve or reject each card one at a time in the terminal. Approved cards are
persisted as validated JSON. Every card is traceable to the exact segment and
verbatim quote in the source transcript.

Develops: `scope.md > The idea`, `scope.md > The Core Loop`

---

## The User

**Research Assistant** — a researcher, scientist, university student, or seminar
participant who needs to turn raw transcripts into citable, structured knowledge
quickly. They run `sciwalker` from the command line in their project folder.

---

## The Single Surface: Terminal (TUI)

There is one interface: the terminal. It is a full-screen TUI with colour-coded
boxes and a progress spinner. The terminal moves through three sequential modes
in a single run — Startup, Review, Close — and exits on its own after the last
decision. There is no interactive session to quit and no state kept between runs.

---

## Mode 1 — Startup

### Invocation

```bash
sciwalker audio/transcript.txt
```

### Startup block

The first thing on screen is a short block that answers three questions before
any card appears: which file is being read, what `sciwalker` is doing with it,
and that the cards are candidates the researcher decides on — not findings.

```
sciwalker — source-grounded concept cards

Input:   audio/transcript.txt
Status:  Reading transcript...
Status:  Preparing concept candidates...

The following cards are candidates extracted from the transcript.
Nothing is saved until you approve it.

Press Enter to review the first card.
```

Lines appear as each step completes. The researcher presses Enter once to begin
review; after that, cards advance automatically without an extra keypress.

### Error: no argument given

```
Usage: sciwalker <path-to-transcript.txt>
No cards were created.
```

Exits immediately. No startup block, no review loop, no output file.

### Error: transcript path does not exist or is unreadable

```
Error: cannot read transcript file: audio/transcript.txt
Reason: file not found

Run sciwalker with an existing .txt transcript file.
No cards were created.
```

Exits immediately. No startup block, no review loop, no output file.

### Error: transcript exists but is empty or near-empty

```
Error: transcript file has no readable content: audio/transcript.txt
No cards were created.
```

Exits immediately.

### No candidates extracted

```
Status:  Reading transcript...
Status:  Prepared 0 candidate concepts

No concept candidates were found in this transcript, so there is nothing
to review. No cards were created.
```

Exits after the startup block. No review loop, no output file.

---

## Mode 2 — Review

One card at a time. The researcher reads and makes a binary decision on each card
before the next one appears.

### Card display

The following is an illustrative example only — field values are not fixtures:

```
--- Card 1 of N ------------------------------------------------
id:             KI-0001
type:           concept
pref_label:     Gradient descent
definition:     An iterative optimization method that updates parameters in the
                direction opposite to the gradient of an objective function.
scope_note:     This card refers to the parameter-update method,
                not to a specific optimizer variant such as momentum or Adam.
classification: supports

Source:         audio/transcript.txt
Segment:        [00:12:40 - 00:13:15] Panelist 2
Quote:          "Gradient descent updates weights in the direction that reduces error."
Speaker:        Panelist 2
----------------------------------------------------------------
Decision: [a]pprove  [r]eject >
```

Every field the decision depends on is visible:
`id`, `type`, `pref_label`, `definition`, `scope_note`, `classification`,
`transcript_path`, `segment` (start/end time), `quote`, `speaker`.

The `classification` field is proposed by `sciwalker` and informs the decision;
it is not interactive. The researcher reads it as evidence and acts with `[a]`
or `[r]`.

The source block is visually separated from the generated fields so the
researcher can always tell which part came from the transcript and which came
from the AI model.

The verbatim `quote` is the literal text from the transcript — never a paraphrase.

The card state begins as `candidate`. It becomes `approved` when the researcher
presses `[a]`.

### Classification flag values

`sciwalker` proposes one of three flags per card:

| Flag | Meaning |
|------|---------|
| `supports` | The source text supports the extracted concept |
| `insufficient` | The source text does not provide enough evidence |
| `potential_contradiction` | The concept may conflict with another card or the source |

`potential_contradiction` is the strongest negative flag allowed. `sciwalker`
never asserts definitive contradiction.

### Decision: approve

The researcher presses `a`.

```
Approved: KI-0001
```

The card is queued for output. Its `status` field is set to `approved`.

### Decision: reject

The researcher presses `r`.

```
Rejected: KI-0001 (not written to output)
```

The card is dropped. Nothing about a rejected card reaches the output file.

### Invalid card (schema validation failure)

A candidate that fails Zod schema validation is reported and silently dropped.
It is never displayed as a card and never offered as a decision.

```
Warning: candidate KI-0002 was skipped (schema validation failure: missing quote).
```

---

## Mode 3 — Close

After the last card decision, a single closing line names the output file and
the count of approved cards:

```
Wrote 3 cards to output/approved-knowledge-cards.json.
```

If every card was rejected, the output file is not written and the line reads:

```
No cards were approved. No output file was written.
```

The run ends. No prompt, no session to quit.

---

## Output

**File:** `output/approved-knowledge-cards.json`

A JSON array of approved `KnowledgeItem` cards. Each card contains:

- `id` — auto-incremented by `sciwalker` (`KI-0001`, `KI-0002`, …)
- `type` — always `"concept"` for this proof of concept
- `status` — `"approved"`
- `concept` block — `id`, `pref_label`, `alt_labels`, `definition`, `scope_note`
  (each label/text field carries `text` and `language`)
- `source` block — `transcript_path`, `segment` (`id`, `start_time`, `end_time`),
  `quote` (`text`, `language`)
- `classification` — the flag proposed by `sciwalker` (`supports`, `insufficient`,
  or `potential_contradiction`)

`audio_path` and `speaker` are present in the schema but not populated by the
agent for this proof of concept.

Every card is validated against the Zod schema before being written. A card that
fails validation is dropped with a warning (see Mode 2 — Invalid card).

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Running `sciwalker audio/transcript.txt` with a valid file enters the Startup block and then Review mode |
| 2 | Running with no argument prints the usage line and exits with no output file |
| 3 | Running with a missing or unreadable path prints the named error and exits with no output file |
| 4 | Running with an empty transcript prints the content error and exits with no output file |
| 5 | Each card shows all required fields including `classification` before the decision prompt |
| 6 | The verbatim `quote` field contains literal transcript text, not a paraphrase |
| 7 | Pressing `a` prints `Approved: <id>` and queues the card |
| 8 | Pressing `r` prints `Rejected: <id> (not written to output)` and drops the card |
| 9 | A card that fails Zod schema validation is skipped with a warning and never shown |
| 10 | The Close line names the output file and the count of approved cards |
| 11 | `output/approved-knowledge-cards.json` contains only approved cards, each with full provenance |
| 12 | A run where every card is rejected writes no output file |
| 13 | Card IDs are auto-incremented (`KI-0001`, `KI-0002`, …) |
| 14 | `potential_contradiction` is the strongest negative `classification` value the agent produces |

---

## Product Decisions

- One card type only: `concept` (deadline constraint)
- JSON output only; no YAML or JSON-LD
- No in-CLI field editing before saving (deferred)
- No audio processing; agent works from transcript text only
- No speaker extraction; speaker metadata is not populated by the agent
- `sciwalker` never asserts definitive contradiction
- Output path is fixed: `output/approved-knowledge-cards.json`
- Run is stateless: no session persistence between runs

---

## Deferred

- Inline field editing before saving
- Additional KnowledgeItem types: `claim`, `equation`, `method`, `algorithm`
- YAML or JSON-LD persistence
- Semantic Scholar integration / literature retrieval
- Full-text evidence
- Web UI
- Speaker extraction
- Audio file processing
