import React, { useState } from 'react'
import { Box } from 'ink'
import { StartupBlock } from './StartupBlock.js'
import { CardReview } from './CardReview.js'
import { FailureBlock } from './FailureBlock.js'
import { CloseBlock } from './CloseBlock.js'
import type {
  CandidateKnowledgeItem,
  ApprovedKnowledgeItem,
  FailedKnowledgeItem,
} from '../schema/knowledge-item.js'

// Four sequential modes:
// startup → review → failure (only if failures exist) → close
type Mode = 'startup' | 'review' | 'failure' | 'close'

interface AppProps {
  transcriptPath: string
  candidates: CandidateKnowledgeItem[]
  failures: FailedKnowledgeItem[]
  warnings: string[]
}

export function App({ transcriptPath: _transcriptPath, candidates, failures, warnings }: AppProps) {
  const [mode, setMode] = useState<Mode>('startup')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [approvedCards, setApprovedCards] = useState<ApprovedKnowledgeItem[]>([])

  function handleReady() {
    if (candidates.length > 0) {
      setMode('review')
    } else if (failures.length > 0) {
      setMode('failure')
    } else {
      setMode('close')
    }
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
      // Review done — go to failure mode if there are failures, else close
      if (failures.length > 0) {
        setMode('failure')
      } else {
        setMode('close')
      }
    } else {
      setCurrentCardIndex(nextIndex)
    }
  }

  function handleFailuresDone() {
    setMode('close')
  }

  return (
    <Box flexDirection="column">
      {mode === 'startup' && (
        <StartupBlock
          transcriptPath={_transcriptPath}
          candidateCount={candidates.length}
          failureCount={failures.length}
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

      {mode === 'failure' && failures.length > 0 && (
        <FailureBlock
          failures={failures}
          onDone={handleFailuresDone}
        />
      )}

      {mode === 'close' && (
        <CloseBlock approvedCards={approvedCards} />
      )}
    </Box>
  )
}
