import React, { useState } from 'react'
import { Box } from 'ink'
import { StartupBlock } from './StartupBlock.js'
import { CardReview } from './CardReview.js'
import { CloseBlock } from './CloseBlock.js'
import type { CandidateKnowledgeItem, ApprovedKnowledgeItem } from '../schema/knowledge-item.js'

type Mode = 'startup' | 'review' | 'close'

interface AppProps {
  transcriptPath: string
  candidates: CandidateKnowledgeItem[]
  warnings: string[]
}

export function App({ transcriptPath: _transcriptPath, candidates, warnings }: AppProps) {
  const [mode, setMode] = useState<Mode>('startup')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [approvedCards, setApprovedCards] = useState<ApprovedKnowledgeItem[]>([])

  function handleReady() {
    setMode('review')
  }

  function handleApprove(card: ApprovedKnowledgeItem) {
    setApprovedCards((prev) => [...prev, card])
    advanceCard()
  }

  function handleReject() {
    advanceCard()
  }

  function advanceCard() {
    const nextIndex = currentCardIndex + 1
    if (nextIndex >= candidates.length) {
      setMode('close')
    } else {
      setCurrentCardIndex(nextIndex)
    }
  }

  return (
    <Box flexDirection="column">
      {mode === 'startup' && (
        <StartupBlock
          transcriptPath={_transcriptPath}
          candidateCount={candidates.length}
          warnings={warnings}
          onReady={handleReady}
        />
      )}

      {mode === 'review' && (
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
