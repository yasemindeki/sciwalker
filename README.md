# sciwalker

`sciwalker` is a terminal CLI application (TUI) that processes audio transcription text from academic lectures or interviews, extracts candidate concept cards using an AI agent powered by Amazon Bedrock, validates each card against strict schemas, and provides an interactive terminal review workflow (`[a]` to approve, `[r]` to reject) before persisting approved knowledge cards to disk.

---

## Features

- **Automated LLM Extraction**: Leverages the Strands Agents SDK and Amazon Bedrock models to extract candidate knowledge concepts.
- **Strict Validation**: Validates extracted cards with Zod schemas (`KnowledgeItem` specification) to filter out malformed items.
- **Interactive Terminal UI (TUI)**: Clean Ink-powered interface providing card-by-card human review.
- **Structured Output**: Saves approved knowledge cards into `output/approved-knowledge-cards.json`.

---

## Dependencies

- **Runtime**: Node.js 22+ & npm
- **Core Dependencies**:
  - `@strands-agents/sdk`: AI agent orchestration and Amazon Bedrock integration
  - `ink`: React-based CLI / Terminal UI rendering
  - `ink-spinner`: Terminal loading spinner component
  - `react`: Ink UI component layer
  - `zod`: Schema declaration and runtime validation
  - `dotenv`: Environment variable management
- **Development Dependencies**:
  - `tsx`: TypeScript execution engine
  - `typescript`: Type checker and compiler
  - `@types/node`, `@types/react`: TypeScript definitions

---

## AWS & Bedrock Setup

Before running `sciwalker`, configure access to Amazon Bedrock models:

### 1. Enable Bedrock Model Access
1. [Create Bedrock API key](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1).
2. Note your API key.

### 2. Setup Environment File
Create a `.env` file from the template:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
AWS_BEARER_TOKEN_BEDROCK="your_bedrock_api_key"
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6
```

---

## Setup & Installation Instructions

1. Clone or download the repository.
2. Install the project dependencies:
```bash
npm install
```

---

## Sample Transcription Files

The repository includes a sample transcription file for testing and demonstration:

- `audio/transcription.txt`

You can use this sample file directly or place your own academic transcriptions in the `audio/` directory.

---

## Test Infrastructure

To run the TypeScript typecheck and validation test suite:

```bash
npm run typecheck
```

Or run `tsc` directly:
```bash
npx tsc --noEmit
```

---

## Run sciwalker CLI

To run `sciwalker` against a transcription file:

```bash
npm start -- <path-to-transcription-file>
```

Examples using the included sample transcription:
```bash
# Run with sample transcription file:
npx tsx src/index.tsx audio/transcription.txt

# Using npm script:
npm start -- audio/transcription.txt
```

### Review Controls
- Press `[a]` to approve a concept card.
- Press `[r]` to reject a candidate card.
- Upon completion, approved cards are saved to `output/approved-knowledge-cards.json`.
