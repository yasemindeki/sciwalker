import { z } from 'zod'

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

/** A language-tagged text value — used for labels, definitions, quotes, etc. */
const LangStringSchema = z.object({
  text: z.string().min(1),
  language: z.string().min(2).max(10).default('en'),
})

// ---------------------------------------------------------------------------
// Classification flag
// Spec ref: prd.md > Mode 2 — Review > Classification flag values
// Constraint: "potential_contradiction" is the strongest negative flag allowed.
// The agent NEVER asserts definitive contradiction.
// ---------------------------------------------------------------------------

export const ClassificationSchema = z.enum([
  'supports',
  'insufficient',
  'potential_contradiction',
])

export type Classification = z.infer<typeof ClassificationSchema>

// ---------------------------------------------------------------------------
// Source block
// Spec ref: prd.md > Output — preserves exact transcript provenance
// ---------------------------------------------------------------------------

const SegmentSchema = z.object({
  id: z.string().min(1),
  start_time: z.string().min(1), // e.g. "00:14:23.500"
  end_time: z.string().min(1),
})

const SourceSchema = z.object({
  transcript_path: z.string().min(1),
  segment: SegmentSchema,
  quote: LangStringSchema, // verbatim text from the transcript — never a paraphrase
  // audio_path and speaker are in the schema but not populated by the agent (PoC scope)
  audio_path: z.string().nullable().optional(),
  speaker: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// Concept block
// Spec ref: prd.md > Output — SKOS-aligned concept representation
// ---------------------------------------------------------------------------

const ConceptSchema = z.object({
  id: z.string().min(1),                          // e.g. "gradient_descent"
  pref_label: LangStringSchema,                   // canonical label
  alt_labels: z.array(LangStringSchema).default([]), // synonyms / alternate names
  definition: LangStringSchema,                   // interpreted explanation
  scope_note: LangStringSchema.optional(),        // disambiguation note
})

// ---------------------------------------------------------------------------
// KnowledgeItem ID rule
// Spec ref: spec.md > KnowledgeItem ID Rule
// Format: KI-0001, KI-0002, … (uppercase, 4-digit zero-padded)
// ---------------------------------------------------------------------------

const KnowledgeItemIdSchema = z
  .string()
  .regex(/^KI-\d{4}$/, 'ID must be in format KI-NNNN (e.g. KI-0001)')

// ---------------------------------------------------------------------------
// Candidate KnowledgeItem — produced by the agent, not yet approved
// ---------------------------------------------------------------------------

export const CandidateKnowledgeItemSchema = z.object({
  id: KnowledgeItemIdSchema,
  type: z.literal('concept'),
  status: z.literal('candidate'),
  concept: ConceptSchema,
  source: SourceSchema,
  classification: ClassificationSchema,
})

export type CandidateKnowledgeItem = z.infer<typeof CandidateKnowledgeItemSchema>

// ---------------------------------------------------------------------------
// Approved KnowledgeItem — status set to "approved" after researcher review
// ---------------------------------------------------------------------------

export const ApprovedKnowledgeItemSchema = CandidateKnowledgeItemSchema.extend({
  status: z.literal('approved'),
})

export type ApprovedKnowledgeItem = z.infer<typeof ApprovedKnowledgeItemSchema>
