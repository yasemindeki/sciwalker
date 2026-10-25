import 'dotenv/config'
import { Agent, tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { CandidateKnowledgeItemSchema, type CandidateKnowledgeItem, type FailedKnowledgeItem } from '../schema/knowledge-item.js'
import { parseTranscript, resolveSegment } from './segment-resolver.js'

// Read model ID from .env — fails fast with a clear message if missing
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID
if (!BEDROCK_MODEL_ID) {
  throw new Error(
    'BEDROCK_MODEL_ID is not set. Copy .env.example to .env and fill in your values.'
  )
}

// ---------------------------------------------------------------------------
// Tool input schema
// The Strands agent calls this tool with the full transcript text.
// The Zod schema here is what the model reads to decide what to pass.
// ---------------------------------------------------------------------------

const ExtractConceptsInputSchema = z.object({
  candidates: z
    .array(
      z.object({
        concept_id: z.string().describe('Snake_case identifier for the concept, e.g. gradient_descent'),
        pref_label: z.string().describe('Canonical preferred label for the concept'),
        alt_labels: z.array(z.string()).describe('Alternative names or synonyms (may be empty)'),
        definition: z.string().describe('A clear, concise definition of the concept in context'),
        scope_note: z.string().optional().describe('Disambiguation note if needed'),
        segment_id: z.string().describe('Unique segment identifier, e.g. seg-001'),
        start_time: z.string().describe('Timestamp of the transcript line where the verbatim quote BEGINS — must match the quote exactly, not the broader topic'),
        end_time: z.string().describe('Timestamp of the transcript line where the verbatim quote ENDS — must match the quote exactly, not the broader topic'),
        quote: z.string().describe('The EXACT verbatim text from the transcript — no paraphrasing'),
        classification: z
          .enum(['supports', 'insufficient', 'potential_contradiction'])
          .describe(
            'Confidence flag: "supports" if source clearly supports the concept, ' +
            '"insufficient" if evidence is weak, ' +
            '"potential_contradiction" if the concept may conflict. ' +
            'NEVER assert definitive contradiction — potential_contradiction is the strongest negative flag allowed.'
          ),
      })
    )
    .describe('Array of concept candidates extracted from the transcript'),
})

// ---------------------------------------------------------------------------
// System prompt
// Instructs the model on extraction rules and output constraints.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are sciwalker, an academic knowledge extraction agent.

Your job is to read a timestamped academic transcript and extract named concepts
that would be valuable for a research assistant to capture and cite.

Rules you MUST follow:
1. Extract only genuine named concepts — algorithms, methods, techniques, frameworks,
   theories, or significant findings discussed in the transcript.
2. The "quote" field MUST be the exact verbatim text from the transcript. Do not
   paraphrase, summarise, or clean up the text. Copy it word for word.
3. The "definition" field is your interpreted explanation — write it clearly and
   concisely in your own words.
4. Assign IDs sequentially starting from KI-0001.
5. Segment timing rules — this is critical for source accuracy:
   - "start_time" MUST be the timestamp of the line where your verbatim quote begins.
   - "end_time" MUST be the timestamp of the line where your verbatim quote ends.
   - Do NOT extend the segment beyond the lines that contain the quote text.
   - The segment must match the quote, not the broader topic discussion.
   - Example: if the quote comes from lines [00:35.8 - 00:46.0] and [00:46.0 - 00:48.9],
     use start_time="00:35.8" and end_time="00:48.9".
6. Classification rules:
   - "supports": the source text clearly supports the extracted concept
   - "insufficient": the source mentions the concept but provides little evidence
   - "potential_contradiction": the concept may conflict with another extracted item
     or with what the source actually says
   - NEVER use language implying definitive contradiction — potential_contradiction
     is the strongest negative classification you are allowed to produce.
7. Extract between 3 and 8 concepts per transcript. Quality over quantity.`

// ---------------------------------------------------------------------------
// extractConcepts
// Called once per run with the full transcript text.
// Returns an array of validated CandidateKnowledgeItem objects.
// ---------------------------------------------------------------------------

export async function extractConcepts(
  transcriptText: string,
  transcriptPath: string
): Promise<{ candidates: CandidateKnowledgeItem[]; failures: FailedKnowledgeItem[]; warnings: string[] }> {
  const warnings: string[] = []
  const rawCandidates: CandidateKnowledgeItem[] = []
  const failures: FailedKnowledgeItem[] = []

  // Parse transcript once for programmatic segment resolution
  const transcriptLines = parseTranscript(transcriptText)

  // Counter for auto-incrementing IDs
  let idCounter = 1

  // The tool the model calls to return its extracted concepts
  const submitConcepts = tool({
    name: 'submit_concepts',
    description: 'Submit all extracted concept candidates from the transcript.',
    inputSchema: ExtractConceptsInputSchema,
    callback: (input) => {
      for (const raw of input.candidates) {
        const id = `KI-${String(idCounter).padStart(4, '0')}`
        idCounter++

        // Resolve segment timestamps from the transcript text — do NOT trust LLM times
        const resolved = resolveSegment(
          raw.quote,
          transcriptLines,
          raw.start_time,
          raw.end_time
        )

        if (!resolved.resolved) {
          warnings.push(
            `Warning: segment for ${id} could not be resolved from transcript text — ` +
            `LLM-provided times used as fallback (verify manually).`
          )
        }

        // Build the candidate shape
        const candidate = {
          id,
          type: 'concept' as const,
          status: 'candidate' as const,
          concept: {
            id: raw.concept_id,
            pref_label: { text: raw.pref_label, language: 'en' },
            alt_labels: raw.alt_labels.map((t) => ({ text: t, language: 'en' })),
            definition: { text: raw.definition, language: 'en' },
            scope_note: raw.scope_note
              ? { text: raw.scope_note, language: 'en' }
              : undefined,
          },
          source: {
            transcript_path: transcriptPath,
            segment: {
              id: raw.segment_id,
              start_time: resolved.start_time,  // ← from transcript, not LLM
              end_time: resolved.end_time,       // ← from transcript, not LLM
            },
            quote: { text: raw.quote, language: 'en' },
            audio_path: null,
            speaker: null,
          },
          classification: raw.classification,
        }

        // Validate against Zod schema before accepting
        const result = CandidateKnowledgeItemSchema.safeParse(candidate)
        if (result.success) {
          rawCandidates.push(result.data)
        } else {
          const issues = result.error.issues.map((i) => i.message).join('; ')
          warnings.push(`Warning: candidate ${id} was skipped (schema validation failure: ${issues}).`)
          failures.push({ id, rawData: candidate, validationError: issues })
        }
      }

      return `Received ${rawCandidates.length} valid candidates.`
    },
  })

  // Create the Strands agent — model is passed explicitly from .env
  // Passing a string model ID is the AgentConfig shorthand for BedrockModel({ modelId })
  const agent = new Agent({
    model: BEDROCK_MODEL_ID,
    systemPrompt: SYSTEM_PROMPT,
    tools: [submitConcepts],
  })

  await agent.invoke(
    `Extract concept candidates from the following academic transcript.\n\n` +
    `Transcript path: ${transcriptPath}\n\n` +
    `---\n${transcriptText}\n---\n\n` +
    `Call the submit_concepts tool with all extracted candidates.`
  )

  return { candidates: rawCandidates, failures, warnings }
}
