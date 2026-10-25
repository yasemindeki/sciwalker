import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { render } from 'ink'
import { App } from './tui/App.js'
import { extractConcepts } from './agent/extractor.js'
import type { CandidateKnowledgeItem, FailedKnowledgeItem } from './schema/knowledge-item.js'

const transcriptPath = process.argv[2]

// ── Error: no argument given ────────────────────────────────────────────────
if (!transcriptPath) {
  console.error('Usage: sciwalker <path-to-transcript.txt>')
  console.error('No cards were created.')
  process.exit(1)
}

// ── Error: transcript path does not exist or is unreadable ──────────────────
let transcriptText = ''
try {
  transcriptText = fs.readFileSync(transcriptPath, 'utf-8')
} catch (err: unknown) {
  const reason =
    err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT'
      ? 'file not found'
      : err instanceof Error
        ? err.message
        : 'unknown error'

  console.error(`Error: cannot read transcript file: ${transcriptPath}`)
  console.error(`Reason: ${reason}`)
  console.error()
  console.error('Run sciwalker with an existing .txt transcript file.')
  console.error('No cards were created.')
  process.exit(1)
}

// ── Error: transcript exists but is empty or near-empty ─────────────────────
const MIN_CONTENT_LENGTH = 50
if (transcriptText.trim().length < MIN_CONTENT_LENGTH) {
  console.error(
    `Error: transcript file has no readable content: ${transcriptPath}`
  )
  console.error('No cards were created.')
  process.exit(1)
}

const absoluteTranscriptPath = path.resolve(transcriptPath)

// ── Startup block (plain console — before Ink mounts) ───────────────────────
// Ink is not mounted yet; these lines stay on screen permanently above the TUI.
process.stdout.write('\nsciwalker — source-grounded concept cards\n\n')
process.stdout.write(`Input:   ${transcriptPath}\n`)
process.stdout.write('Status:  Reading transcript...\n')
process.stdout.write('Status:  Preparing concept candidates...\n')

// ── Run extraction ───────────────────────────────────────────────────────────
let candidates: CandidateKnowledgeItem[] = []
let failures: FailedKnowledgeItem[] = []
let warnings: string[] = []

try {
  const result = await extractConcepts(transcriptText, absoluteTranscriptPath)
  candidates = result.candidates
  failures = result.failures
  warnings = result.warnings
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`\nError: extraction failed — ${message}`)
  console.error('No cards were created.')
  process.exit(1)
}

// ── No candidates found ──────────────────────────────────────────────────────
if (candidates.length === 0) {
  process.stdout.write('\nNo concept candidates were found in this transcript, so there is nothing\n')
  process.stdout.write('to review. No cards were created.\n\n')
  process.exit(0)
}

// ── Surface any extraction warnings ─────────────────────────────────────────
for (const w of warnings) {
  process.stdout.write(`${w}\n`)
}

// ── Mount Ink TUI now that we have real candidates ───────────────────────────
// Ink takes over the terminal from this point forward.
render(
  <App
    transcriptPath={transcriptPath}
    candidates={candidates}
    failures={failures}
    warnings={[]}
  />
)
