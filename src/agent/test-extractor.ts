/**
 * Quick smoke test for the extractor — not part of the final app.
 * Run with: node node_modules/.bin/tsx src/agent/test-extractor.ts
 */
import 'dotenv/config'
import fs from 'fs'
import { extractConcepts } from './extractor.js'

const transcriptPath = 'audio/transcription.txt'
const transcriptText = fs.readFileSync(transcriptPath, 'utf-8')

console.log('Calling Bedrock via Strands agent...\n')

const { candidates, warnings } = await extractConcepts(transcriptText, transcriptPath)

if (warnings.length > 0) {
  console.log('Warnings:')
  warnings.forEach((w) => console.log(' ', w))
  console.log()
}

console.log(`Extracted ${candidates.length} candidate(s):\n`)
console.log(JSON.stringify(candidates, null, 2))
