import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const transcriptPath = process.argv[2]

// Error: no argument given
if (!transcriptPath) {
  console.error('Usage: sciwalker <path-to-transcript.txt>')
  console.error('No cards were created.')
  process.exit(1)
}

// Error: transcript path does not exist or is unreadable
let transcriptText: string
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

// Error: transcript exists but is empty or near-empty
const MIN_CONTENT_LENGTH = 50
if (transcriptText.trim().length < MIN_CONTENT_LENGTH) {
  console.error(
    `Error: transcript file has no readable content: ${transcriptPath}`
  )
  console.error('No cards were created.')
  process.exit(1)
}

// Resolve the absolute path for provenance
const absoluteTranscriptPath = path.resolve(transcriptPath)

// Placeholder: agent extraction + TUI will be wired in slice 3 and 4
console.log(`sciwalker — source-grounded concept cards`)
console.log()
console.log(`Input:   ${transcriptPath}`)
console.log(`Status:  Transcript loaded (${transcriptText.length} chars)`)
console.log()
console.log('Agent extraction and TUI coming in the next slices.')
console.log(`Resolved path: ${absoluteTranscriptPath}`)
