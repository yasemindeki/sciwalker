import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { CandidateKnowledgeItem, ApprovedKnowledgeItem } from '../schema/knowledge-item.js'

// Classification flag colours — matches PRD intent:
// supports = green, insufficient = yellow, potential_contradiction = red
const CLASSIFICATION_COLORS: Record<string, string> = {
  supports: 'green',
  insufficient: 'yellow',
  potential_contradiction: 'red',
}

interface CardReviewProps {
  card: CandidateKnowledgeItem
  cardIndex: number   // 0-based
  totalCards: number
  warnings: string[]
  onApprove: (card: ApprovedKnowledgeItem) => void
  onReject: () => void
}

export function CardReview({
  card,
  cardIndex,
  totalCards,
  warnings,
  onApprove,
  onReject,
}: CardReviewProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [decided, setDecided] = useState(false)

  useInput((input, _key) => {
    if (decided) return

    if (input === 'a') {
      const approved: ApprovedKnowledgeItem = { ...card, status: 'approved' }
      setFeedback(`Approved: ${card.id}`)
      setDecided(true)
      // Small delay so the researcher sees the feedback before the next card
      setTimeout(() => onApprove(approved), 300)
    } else if (input === 'r') {
      setFeedback(`Rejected: ${card.id} (not written to output)`)
      setDecided(true)
      setTimeout(() => onReject(), 300)
    }
  })

  const DIVIDER = '─'.repeat(64)
  const classificationColor = CLASSIFICATION_COLORS[card.classification] ?? 'white'

  // Format definition with word-wrap indent
  const definition = card.concept.definition.text
  const scopeNote = card.concept.scope_note?.text

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Validation warnings from extraction (shown above the card) */}
      {warnings.map((w, i) => (
        <Box key={i}>
          <Text color="yellow">{w}</Text>
        </Box>
      ))}

      {/* Card header */}
      <Box>
        <Text color="cyan" bold>
          {'--- Card '}
          {cardIndex + 1}
          {' of '}
          {totalCards}
          {' '}
          {DIVIDER.slice(0, 40)}
        </Text>
      </Box>

      {/* ── AI-generated fields ─────────────────────────────── */}
      <Box>
        <Text color="white">{'id:             '}</Text>
        <Text color="white" bold>{card.id}</Text>
      </Box>

      <Box>
        <Text color="white">{'type:           '}</Text>
        <Text color="white">{card.type}</Text>
      </Box>

      <Box>
        <Text color="white">{'pref_label:     '}</Text>
        <Text color="green" bold>{card.concept.pref_label.text}</Text>
      </Box>

      {card.concept.alt_labels.length > 0 && (
        <Box>
          <Text color="white">{'alt_labels:     '}</Text>
          <Text color="white">{card.concept.alt_labels.map((l) => l.text).join(', ')}</Text>
        </Box>
      )}

      <Box flexDirection="column">
        <Box>
          <Text color="white">{'definition:     '}</Text>
          <Text color="white">{definition}</Text>
        </Box>
      </Box>

      {scopeNote && (
        <Box>
          <Text color="white">{'scope_note:     '}</Text>
          <Text color="white">{scopeNote}</Text>
        </Box>
      )}

      <Box>
        <Text color="white">{'classification: '}</Text>
        <Text color={classificationColor} bold>{card.classification}</Text>
      </Box>

      {/* ── Visual separator: AI-generated above / source below ── */}
      <Box>
        <Text color="gray">{DIVIDER}</Text>
      </Box>

      {/* ── Source fields (verbatim from transcript) ─────────── */}
      <Box>
        <Text color="white">{'Source:         '}</Text>
        <Text color="white">{card.source.transcript_path}</Text>
      </Box>

      <Box>
        <Text color="white">{'Segment:        '}</Text>
        <Text color="white">
          [{card.source.segment.start_time} - {card.source.segment.end_time}]
        </Text>
      </Box>

      <Box>
        <Text color="white">{'Quote:          '}</Text>
        <Text color="yellow">"{card.source.quote.text}"</Text>
      </Box>

      {card.source.speaker && (
        <Box>
          <Text color="white">{'Speaker:        '}</Text>
          <Text color="white">{card.source.speaker}</Text>
        </Box>
      )}

      {/* Card footer */}
      <Box>
        <Text color="cyan">{DIVIDER}</Text>
      </Box>

      {/* Decision prompt or feedback */}
      {feedback ? (
        <Box marginTop={1}>
          <Text color={feedback.startsWith('Approved') ? 'green' : 'red'} bold>
            {feedback}
          </Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="white">{'Decision: '}</Text>
          <Text color="green" bold>{'[a]pprove'}</Text>
          <Text color="white">{'  '}</Text>
          <Text color="red" bold>{'[r]eject'}</Text>
          <Text color="white">{' >'}</Text>
        </Box>
      )}
    </Box>
  )
}
