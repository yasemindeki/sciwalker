import fs from 'fs'
import path from 'path'
import { ApprovedKnowledgeItemSchema, type ApprovedKnowledgeItem } from '../schema/knowledge-item.js'

/**
 * Writes an array of approved KnowledgeItem cards to a JSON file.
 * Creates the output directory automatically if it does not exist.
 * Each card is validated against ApprovedKnowledgeItemSchema before writing.
 *
 * Spec ref: spec.md > src/output/writer.ts — Persistence
 * PRD ref:  prd.md > Output, prd.md > Mode 3 — Close
 */
export function writeApprovedCards(
  cards: ApprovedKnowledgeItem[],
  outputPath: string
): void {
  // Validate each card one final time before writing
  const validated: ApprovedKnowledgeItem[] = []
  for (const card of cards) {
    const result = ApprovedKnowledgeItemSchema.safeParse(card)
    if (result.success) {
      validated.push(result.data)
    } else {
      const issues = result.error.issues.map((i) => i.message).join('; ')
      // Surface as a stderr warning — does not interrupt the write of valid cards
      process.stderr.write(
        `Warning: approved card ${card.id} failed final validation and was not written (${issues}).\n`
      )
    }
  }

  if (validated.length === 0) return

  // Auto-create output directory
  const dir = path.dirname(outputPath)
  fs.mkdirSync(dir, { recursive: true })

  // Write pretty-printed JSON array
  fs.writeFileSync(outputPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8')
}
