/**
 * Programmatic segment resolver.
 *
 * After the LLM extracts a quote, this module finds the verbatim quote text
 * in the transcript and derives start_time / end_time from the transcript's
 * own timestamp markers — not from the LLM's output.
 *
 * This makes segment grounding code-level accurate rather than LLM-level accurate.
 *
 * Transcript line format: [MM:SS.S - MM:SS.S] text
 */

export interface TranscriptLine {
  start_time: string
  end_time: string
  text: string
}

/**
 * Parse a timestamped transcript into structured lines.
 * Handles the format: [HH:MM:SS.S - HH:MM:SS.S] text  or  [MM:SS.S - MM:SS.S] text
 */
export function parseTranscript(transcriptText: string): TranscriptLine[] {
  const lines: TranscriptLine[] = []
  const lineRegex = /^\[(\d[\d:.]+)\s*-\s*(\d[\d:.]+)\]\s*(.+)$/

  for (const raw of transcriptText.split('\n')) {
    const trimmed = raw.trim()
    const match = trimmed.match(lineRegex)
    if (match) {
      lines.push({
        start_time: match[1].trim(),
        end_time: match[2].trim(),
        text: match[3].trim(),
      })
    }
  }

  return lines
}

export interface ResolvedSegment {
  start_time: string
  end_time: string
  /** true if the quote was found in the transcript; false = LLM times kept as fallback */
  resolved: boolean
}

/**
 * Find the transcript lines that contain the verbatim quote and return
 * their start/end timestamps.
 *
 * Strategy:
 * 1. Normalise whitespace in both the quote and each line (spoken transcripts
 *    have filler words, line breaks mid-sentence, etc.).
 * 2. Find the first line whose text appears in the normalised quote.
 * 3. Walk forward to find the last line covered by the quote.
 * 4. Return start_time of the first matching line, end_time of the last.
 *
 * Falls back to the LLM-provided times if no match is found, and sets
 * resolved=false so the caller can surface a warning.
 */
export function resolveSegment(
  quote: string,
  lines: TranscriptLine[],
  fallbackStart: string,
  fallbackEnd: string
): ResolvedSegment {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\u2018\u2019\u201c\u201d]/g, "'") // smart quotes → straight
      .replace(/[^\w\s']/g, ' ')                    // strip punctuation
      .replace(/\s+/g, ' ')
      .trim()

  const normQuote = normalise(quote)

  // Find all lines whose normalised text has meaningful overlap with the quote
  const matchingIndices: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const normLine = normalise(lines[i].text)
    // A line "matches" if a substantial portion of its words appear in the quote
    const lineWords = normLine.split(' ').filter(Boolean)
    if (lineWords.length === 0) continue
    const matchedWords = lineWords.filter((w) => normQuote.includes(w))
    const matchRatio = matchedWords.length / lineWords.length
    if (matchRatio >= 0.6) {
      matchingIndices.push(i)
    }
  }

  if (matchingIndices.length === 0) {
    return { start_time: fallbackStart, end_time: fallbackEnd, resolved: false }
  }

  // Require consecutive (or near-consecutive) lines to avoid false positives
  // from common words. Take the longest consecutive run.
  const runs: number[][] = []
  let currentRun = [matchingIndices[0]]

  for (let j = 1; j < matchingIndices.length; j++) {
    if (matchingIndices[j] - matchingIndices[j - 1] <= 2) {
      currentRun.push(matchingIndices[j])
    } else {
      runs.push(currentRun)
      currentRun = [matchingIndices[j]]
    }
  }
  runs.push(currentRun)

  const bestRun = runs.reduce((a, b) => (a.length >= b.length ? a : b))
  const firstLine = lines[bestRun[0]]
  const lastLine = lines[bestRun[bestRun.length - 1]]

  return {
    start_time: firstLine.start_time,
    end_time: lastLine.end_time,
    resolved: true,
  }
}
