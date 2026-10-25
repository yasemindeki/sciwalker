import React, { useState } from 'react'
import { Box } from 'ink'
import { StartupBlock } from './StartupBlock.js'
import { CardReview } from './CardReview.js'
import { CloseBlock } from './CloseBlock.js'
import type { CandidateKnowledgeItem, ApprovedKnowledgeItem } from '../schema/knowledge-item.js'

type Mode = 'startup' | 'review' | 'close'

interface AppProps {
  transcriptPath: string
  /** null = extraction still in progress, array = extraction complete */
  candidates: CandidateKnowledgeItem[] | null
  warnings: string[]
}

export function App({ transcriptPath, candidates, warnings }: AppProps) {
  const [mode, setMode] = useState<Mode>('startup')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [approvedCards, setApprovedCards] = useState<ApprovedKnowledgeItem[]>([])

  // Startup → Review transition
  function handleReady() {
    if (candidates && candidates.length > 0) {
      setMode('review')
    }
  }

  // Approve current card, advance to next or close
  function handleApprove(card: ApprovedKnowledgeItem) {
    const updated = [...approvedCards, card]
    setApprovedCards(updated)
    advanceCard()
  }

  // Reject current card, advance to next or close
  function handleReject() {
    advanceCard()
  }

  function advanceCard() {
    const nextIndex = currentCardIndex + 1
    if (!candidates || nextIndex >= candidates.length) {
      setMode('close')
    } else {
      setCurrentCardIndex(nextIndex)
    }
  }

  return (
    <Box flexDirection="column">
      {mode === 'startup' && (
        <StartupBlock
          transcriptPath={transcriptPath}
          onReady={handleReady}
          candidateCount={candidates === null ? null : candidates.length}
          warnings={warnings}
        />
      )}

      {mode === 'review' && candidates && (
        <CardReview
          key={currentCardIndex}
          card={candidates[currentCardIndex]}
          cardIndex={currentCardIndex}
          totalCards={candidates.length}
          warnings={[]}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {mode === 'close' && (
        <CloseBlock approvedCards={approvedCards} />
      )}
    </Box>
  )
}
