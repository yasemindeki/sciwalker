import React from 'react'
import { Box, Text, useInput } from 'ink'

interface StartupBlockProps {
  transcriptPath: string
  candidateCount: number
  failureCount: number
  warnings: string[]
  onReady: () => void
}

export function StartupBlock({
  transcriptPath: _transcriptPath,
  candidateCount,
  failureCount,
  warnings,
  onReady,
}: StartupBlockProps) {
  useInput((_input, key) => {
    if (key.return) {
      onReady()
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Extraction warnings */}
      {warnings.map((w, i) => (
        <Box key={i}>
          <Text color="yellow">{w}</Text>
        </Box>
      ))}

      {/* Candidate count */}
      <Box>
        <Text color="green">
          Status:  Prepared {candidateCount} concept candidate{candidateCount !== 1 ? 's' : ''}
          {failureCount > 0 ? ` (${failureCount} failed validation — shown after review)` : ''}
        </Text>
      </Box>

      {/* Intro + Enter prompt */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="white">
          The following cards are candidates extracted from the transcript.
        </Text>
        <Text color="white">Nothing is saved until you approve it.</Text>
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Press Enter to review the first card.
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
