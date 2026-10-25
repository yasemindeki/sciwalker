import React, { useEffect, useState } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import Spinner from 'ink-spinner'

interface StartupBlockProps {
  transcriptPath: string
  /** Called when the researcher presses Enter and is ready to review */
  onReady: () => void
  /** null = still extracting, number = extraction complete */
  candidateCount: number | null
  /** Any extraction warnings to surface */
  warnings: string[]
}

export function StartupBlock({
  transcriptPath,
  onReady,
  candidateCount,
  warnings,
}: StartupBlockProps) {
  const { exit } = useApp()
  const [enterReady, setEnterReady] = useState(false)

  // Show the Enter prompt only once extraction is complete and there are candidates
  useEffect(() => {
    if (candidateCount !== null && candidateCount > 0) {
      setEnterReady(true)
    } else if (candidateCount === 0) {
      // No candidates — print message and exit
      exit()
    }
  }, [candidateCount, exit])

  useInput((_input, key) => {
    if (key.return && enterReady) {
      onReady()
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          sciwalker — source-grounded concept cards
        </Text>
      </Box>

      {/* Input file */}
      <Box>
        <Text color="white">{'Input:   '}</Text>
        <Text color="yellow">{transcriptPath}</Text>
      </Box>

      {/* Status: reading */}
      <Box>
        <Text color="white">{'Status:  '}</Text>
        {candidateCount === null ? (
          <Box>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            <Text color="white"> Reading transcript and preparing concept candidates...</Text>
          </Box>
        ) : (
          <Text color="green">
            Prepared {candidateCount} concept candidate{candidateCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Box>

      {/* Warnings */}
      {warnings.map((w, i) => (
        <Box key={i}>
          <Text color="yellow">{w}</Text>
        </Box>
      ))}

      {/* No candidates message */}
      {candidateCount === 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">
            No concept candidates were found in this transcript, so there is nothing
          </Text>
          <Text color="red">to review. No cards were created.</Text>
        </Box>
      )}

      {/* Candidate intro + Enter prompt */}
      {enterReady && (
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
      )}
    </Box>
  )
}
