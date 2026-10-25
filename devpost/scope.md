---
status: approved
---

# Scope: sciwalker

## The idea

Researchers spend a lot of time revisiting long academic transcripts to find important
concepts and preserve where exactly those concepts appeared. `sciwalker` is a CLI agent
that reads a timestamped transcript, extracts concepts as structured `KnowledgeItem`
cards, and lets the researcher approve or skip each one — so they leave with a
validated, source-grounded JSON record they can actually use.

## The user

**Research Assistant** — a researcher, scientist, university student, or seminar
participant who needs to turn raw transcripts into citable, structured knowledge quickly.

## The core loop

1. Researcher places a transcript file in the project folder.
2. `sciwalker` reads the transcript and extracts concept `KnowledgeItem` cards.
3. For each card, `sciwalker` proposes a confidence flag (`supports`, `insufficient`,
   or `potential_contradiction`) and presents it in the CLI.
4. Researcher types `y` to approve or skips the card.
5. `sciwalker` validates the approved card with a Zod schema and persists it as JSON.
6. Every saved card preserves the exact transcript segment (start/end time) and
   verbatim quote as provenance.

## What "working" looks like

The researcher drops in a transcript, runs `sciwalker`, reviews the extracted cards
one by one in the terminal, approves the ones that are useful, and ends up with a
JSON file of validated `KnowledgeItem` cards — each one traceable back to a precise
moment in the source transcript.

## Now (proof of concept)

- Transcript file as input (timestamped `[HH:MM.S - HH:MM.S] text` format)
- Extract `concept`-type `KnowledgeItem` cards via the AWS Strands TypeScript Agent SDK
- Auto-increment card IDs (`KI-0001`, `KI-0002`, …)
- `sciwalker` proposes a classification flag; researcher reads it as evidence to inform `[a]` or `[r]`
- CLI review: `[a]` to approve, `[r]` to reject
- Zod schema validation before persist
- JSON output file of approved cards
- Source provenance: segment ID, start/end time, verbatim quote, transcript path

## Out of Scope / Later

- Semantic Scholar integration
- Literature retrieval
- Full-text evidence
- Web UI
- Additional KnowledgeItem types: `claim`, `equation`, `method`, `algorithm`
- YAML or JSON-LD persistence
- Edit a card's fields inline before saving
- Speaker extraction from transcript metadata
- Audio file processing

## Cut (hardcoded constraints)

- Audio processing (agent works from transcript text only)
- Speaker extraction (provided as metadata externally, not extracted)
- In-CLI field editing (deferred due to deadline)
- Definitive contradiction flag (`potential_contradiction` is the strongest
  negative classification the agent is allowed to propose)
