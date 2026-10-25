import React, { useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import { writeApprovedCards } from '../output/writer.js'
import type { ApprovedKnowledgeItem } from '../schema/knowledge-item.js'

const OUTPUT_PATH = 'output/approved-knowledge-cards.json'

interface CloseBlockProps {
  approvedCards: ApprovedKnowledgeItem[]
}

export function CloseBlock({ approvedCards }: CloseBlockProps) {
  const { exit } = useApp()

  useEffect(() => {
    if (approvedCards.length > 0) {
      writeApprovedCards(approvedCards, OUTPUT_PATH)
    }
    // Give Ink time to render the final message before exiting
    const timer = setTimeout(() => exit(), 300)
    return () => clearTimeout(timer)
  }, [approvedCards, exit])

  if (approvedCards.length === 0) {
    return (
      <Box paddingX={1} marginTop={1}>
        <Text color="yellow">
          No cards were approved. No output file was written.
        </Text>
      </Box>
    )
  }

  return (
    <Box paddingX={1} marginTop={1}>
      <Text color="green" bold>
        Wrote {approvedCards.length} card{approvedCards.length !== 1 ? 's' : ''} to{' '}
        {OUTPUT_PATH}.
      </Text>
    </Box>
  )
}
