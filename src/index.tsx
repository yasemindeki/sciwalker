import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { render } from 'ink'
import { App } from './tui/App.js'
import { extractConcepts } from './agent/extractor.js'
import type { CandidateKnowledgeItem } from './schema/knowledge-item.js'

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

// ── Mount Ink app immediately with null candidates (startup/spinner state) ──
// Extraction runs async in the background; the App reacts when it resolves.
let resolvedCandidates: CandidateKnowledgeItem[] | null = null
let resolvedWarnings: string[] = []

const { rerender } = render(
  <App
    transcriptPath={transcriptPath}
    candidates={null}
    warnings={[]}
  />
)

// ── Run extraction, then re-render with results ──────────────────────────────
try {
  const { candidates, warnings } = await extractConcepts(
    transcriptText,
    absoluteTranscriptPath
  )
  resolvedCandidates = candidates
  resolvedWarnings = warnings
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`\nError: extraction failed — ${message}`)
  console.error('No cards were created.')
  process.exit(1)
}

rerender(
  <App
    transcriptPath={transcriptPath}
    candidates={resolvedCandidates}
    warnings={resolvedWarnings}
  />
)
