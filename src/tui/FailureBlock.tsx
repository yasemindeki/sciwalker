import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { FailedKnowledgeItem } from '../schema/knowledge-item.js'

interface FailureBlockProps {
  failures: FailedKnowledgeItem[]
  onDone: () => void
}

/**
 * Failure mode — shown between Review and Close when one or more candidates
 * failed Zod schema validation. The researcher sees what was dropped and why.
 * No decision is required — press [n]ext to advance, or [n] on the last card
 * to proceed to Close.
 *
 * PRD ref: nothing silently lost — validation failures are always surfaced.
 */
export function FailureBlock({ failures, onDone }: FailureBlockProps) {
  const [index, setIndex] = useState(0)

  const current = failures[index]
  const isLast = index === failures.length - 1
  const DIVIDER = '─'.repeat(64)

  useInput((input) => {
    if (input === 'n') {
      if (isLast) {
        onDone()
      } else {
        setIndex((i) => i + 1)
      }
    }
  })

  // Render raw data as a readable JSON excerpt (truncated for display)
  const rawJson = JSON.stringify(current.rawData, null, 2)
  const lines = rawJson.split('\n').slice(0, 20)
  const truncated = lines.length < rawJson.split('\n').length
  const displayJson = lines.join('\n') + (truncated ? '\n  … (truncated)' : '')

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="red" bold>
          {'⚠  Validation failure '}
          {index + 1}
          {' of '}
          {failures.length}
          {' — this card was not added to the review queue'}
        </Text>
      </Box>

      {/* Card header */}
      <Box>
        <Text color="red">
          {'--- Failed card '}
          {DIVIDER.slice(0, 44)}
        </Text>
      </Box>

      {/* ID */}
      <Box>
        <Text color="white">{'id:               '}</Text>
        <Text color="white" bold>{current.id}</Text>
      </Box>

      {/* Validation error */}
      <Box flexDirection="column">
        <Box>
          <Text color="white">{'validation error: '}</Text>
          <Text color="red">{current.validationError}</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box>
        <Text color="gray">{DIVIDER}</Text>
      </Box>

      {/* Raw data */}
      <Box flexDirection="column">
        <Text color="white" dimColor>Raw data from model:</Text>
        <Text color="white" dimColor>{displayJson}</Text>
      </Box>

      {/* Footer */}
      <Box>
        <Text color="gray">{DIVIDER}</Text>
      </Box>

      {/* Navigation */}
      <Box marginTop={1}>
        <Text color="cyan" bold>
          {isLast
            ? '[n] Continue to summary'
            : `[n] Next failed card (${index + 2} of ${failures.length})`}
        </Text>
      </Box>
    </Box>
  )
}
