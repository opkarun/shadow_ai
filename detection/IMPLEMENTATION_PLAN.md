# Detection Module Implementation Plan

**Scope:** Pre-filter → Extract → Score Confidence pipeline  
**Owner:** Detection branch  
**Timeline:** Tasks grouped by dependency chains; can be parallelized within each phase

---

## Phase 1: Setup & Shared Contracts

These tasks establish the foundation. All later tasks depend on at least one of them.

### Task 1.1: Verify and Extend Shared Types
**Objective:** Ensure `shared/types/` has all needed types for detection; add any missing.

**Checklist:**
- [ ] Read `shared/types/index.ts` to confirm `Commitment`, `Evidence`, `CommitmentSource`, `CommitmentStatus` exist
- [ ] Confirm `Commitment` interface matches ARCHITECTURE.md Section 20 spec exactly
- [ ] Check if `GmailMessage` or similar normalized message type exists in shared
  - If not, create `GmailMessage` type with: `id`, `subject`, `body`, `from`, `to`, `threadId`, `timestamp`, `labels`
  - This is the shape all detection code will normalize Gmail API responses into
- [ ] Verify the interface for extraction output (candidate commitment) — should be a subset of `Commitment` (no `id`, `created_at`, etc., those are added on persist)
  - Consider naming: `ExtractedCommitment` or `CommitmentCandidate`?
- [ ] Check if constants for confidence thresholds (HIGH/MEDIUM/LOW numeric ranges) are defined
  - If not, create `detection/config.ts` with placeholders: `CONFIDENCE_HIGH_THRESHOLD`, `CONFIDENCE_MEDIUM_THRESHOLD`
- [ ] No code changes yet, just audit and list what's missing

**Output:** Checklist of what exists vs. what needs to be added to shared types

**Dependencies:** None

---

### Task 1.2: Define Detection Configuration Constants
**Objective:** Create a single source of truth for all tunable detection parameters.

**File:** `detection/config.ts`

**Checklist:**
- [ ] Define confidence score thresholds (numeric ranges)
  - `CONFIDENCE_HIGH_THRESHOLD` (e.g., >= 0.75 for HIGH tier)
  - `CONFIDENCE_MEDIUM_THRESHOLD` (e.g., 0.4 to < 0.75 for MEDIUM tier)
  - Anything below is LOW
- [ ] Pre-filter keyword/pattern lists (as arrays or objects)
  - Request patterns: `['can you', 'could you', 'would you', ...]`
  - Promise patterns: `['i\'ll', 'i will', 'on it', 'will do', ...]`
  - Action verbs: `['send', 'review', 'publish', 'upload', 'finish', 'submit', 'ship', 'deploy', 'fix', 'merge', ...]`
  - Deadline language: `['by friday', 'tomorrow', 'tonight', 'eod', 'end of day', 'before lunch', ...]`
  - Weekday names as a regex pattern
  - Time-of-day pattern for `\d{1,2}\s?(am|pm)` matching
- [ ] Pre-filter auto-fail sender patterns
  - Regex for no-reply/automated addresses: `noreply|notifications|no-reply|automated|bot|do-not-reply|no_reply`
- [ ] Pre-filter message length threshold
  - Minimum word count to skip trivial acks (e.g., 3 words)
- [ ] Gemini model ID (should be "gemini-1.5-flash" per PRODUCT_SPEC Section 29)
- [ ] Extraction batch size (how many messages to batch into one LLM call, e.g., 5–10)
- [ ] Error retry logic parameters (max retries, backoff strategy)

**Output:** `detection/config.ts` with all constants as exportable named constants (no hardcoding elsewhere)

**Dependencies:** Task 1.1 (needs to know exact threshold values for confidence tiers)

---

### Task 1.3: Set Up Gemini Client and Utilities
**Objective:** Initialize and wrap the Gemini API client so extract.ts and scoreConfidence.ts can use it.

**File:** `detection/gemini.ts`

**Checklist:**
- [ ] Import `@google/generative-ai` library (should already be in package.json)
- [ ] Create a function `initGeminiClient()` that:
  - Reads `process.env.GOOGLE_GEMINI_API_KEY`
  - Initializes the `GoogleGenerativeAI` client
  - Returns the initialized client (or a singleton pattern if called multiple times)
  - Throws a clear error if the API key is missing
- [ ] Create a helper function `callGeminiExtraction(prompt, batchSize)` that:
  - Takes a system prompt and array of messages
  - Batches them (up to `batchSize` per call) if needed
  - Calls Gemini Flash model with the batched request
  - Handles potential errors (timeout, rate limit, malformed response) with a retry strategy
  - Returns raw Gemini response(s)
  - NOTE: Do NOT parse the response yet — just return the raw output from Gemini
- [ ] Create a helper function `callGeminiScoring(prompt, candidateText)` that:
  - Similar to extraction but for single candidate scoring
  - Calls Gemini with confidence-scoring-specific prompt
  - Returns raw Gemini response
- [ ] Error handling wrapper: if Gemini calls fail after retries, throw a descriptive error (include API error code, message)
- [ ] Log each API call (model used, token counts if available, batch size, timestamp) to stdout or logger

**Output:** `detection/gemini.ts` with `initGeminiClient()`, `callGeminiExtraction()`, `callGeminiScoring()`, and error handling

**Dependencies:** Task 1.1 (needs Gemini model ID from config)

---

## Phase 2: Pre-Filter Implementation

### Task 2.1: Implement Pre-Filter Core Logic
**Objective:** Build the noise gate that decides if a message deserves an LLM call.

**File:** `detection/prefilter.ts`

**Checklist:**
- [ ] Create function `prefilter(message: GmailMessage): { passes: boolean; message: GmailMessage; reason?: string }`
- [ ] **Auto-fail checks (return `{ passes: false }` immediately if ANY match):**
  - [ ] Dedup by message ID: check if `message.id` has been processed before (needs a simple cache — in-memory Set for MVP, or check shared DB)
  - [ ] Sender is automated: check if `message.from` matches auto-fail sender patterns
  - [ ] System notification: check if message `labels` or subject contain system-notification keywords (e.g., "calendar", "notification", "automated")
- [ ] **Commitment-signal checks (pass if ANY match — logical OR):**
  - [ ] Combine subject + body text, lowercase it, tokenize into words
  - [ ] Check for commitment-phrasing patterns (request + promise + action verbs)
  - [ ] Check for deadline-language patterns (explicit dates, days, times, "EOD", "ASAP")
  - [ ] Check for imperative-structure pattern (starts with an action verb, no question mark, addressed to user)
  - [ ] Check message length (word count > threshold from config)
- [ ] Return `{ passes: true, message }` if any signal matches, `{ passes: false, message, reason: "..." }` otherwise
- [ ] Add `reason` field (optional) for debugging: why did it fail/pass?

**Testing (unit tests, see Phase 5):**
- [ ] Trivial acks should fail: `thanks`, `ok`, `👍`, `sounds good`
- [ ] Automation/bot emails should fail: noreply@github.com, notifications@jira.atlassian.net
- [ ] Real commitments should pass: "can you send the presentation by Friday?", "I'll review the PR tonight"
- [ ] Ambiguous but passing should be high-recall: "let me know your thoughts" (should NOT pass — no action verb + no deadline)

**Output:** `detection/prefilter.ts` with `prefilter()` function

**Dependencies:** Task 1.1, Task 1.2 (needs config patterns and thresholds)

---

### Task 2.2: Add Deduplication Logic
**Objective:** Ensure we don't re-process the same Gmail message twice.

**Checklist:**
- [ ] Decide on dedup strategy:
  - Option A: In-memory Set of processed message IDs (MVP, fine for single-instance, cleared on restart)
  - Option B: Query `shared/db` to check if a commitment with this `source_reference` already exists (safer for distributed/restart scenarios)
  - Recommend: Option B for robustness
- [ ] Create a function `isMessageProcessed(messageId: string): Promise<boolean>` that:
  - Queries `shared/db` for any `Commitment` with `source_reference === messageId` and `source === 'gmail'`
  - Returns true if found, false otherwise
- [ ] Call this function in pre-filter before any other checks
- [ ] Log dedup hits (useful for debugging batch re-ingestion)

**Output:** Dedup logic integrated into prefilter.ts, possibly a new `detection/dedup.ts` helper if it's substantial

**Dependencies:** Task 2.1 (pre-filter), Task 1.1 (shared/db access)

---

## Phase 3: Extraction Implementation

### Task 3.1: Design Gemini Extraction Prompt
**Objective:** Write the system prompt that tells Gemini what to extract from a Gmail message.

**Checklist:**
- [ ] Define the prompt structure:
  - **System instruction:** "You are an AI assistant that extracts commitments from email messages..."
  - **Extraction contract:** "Return a JSON object with these fields: title (string), description (string), requester (string), deadline (ISO 8601 date or null), verification_method (string: 'github_commit' | 'github_pr' | 'manual' | 'calendar'), action_verb (string)"
  - **Guidelines:**
    - Extract the most likely deadline, even if ambiguous (e.g., "by Friday next week" → infer the date)
    - If timezone is unclear, use the sender's inferred timezone or note the ambiguity
    - Identify the requester by name and email if available
    - Suggest a verification method based on the nature of the commitment (code tasks → GitHub, meetings → Calendar, etc.)
    - Be concise in description; don't repeat title
  - **Tone:** "Be conservative — if the commitment is ambiguous, set confidence to low (captured in a separate scoring step)"
- [ ] Create prompt-building function `buildExtractionPrompt(batchSize: number, messages: GmailMessage[]): string` that:
  - Formats the system instruction
  - Includes 1–2 examples of email → extracted commitment (hand-written)
  - Formats the batch of messages for extraction
  - Returns the full prompt text

**Output:** Prompt template (can be in `detection/prompts.ts` or inline in extract.ts with comments)

**Dependencies:** Task 1.2, Task 1.3 (Gemini model understanding)

---

### Task 3.2: Implement Extraction Function
**Objective:** Parse pre-filtered messages and extract commitment structure.

**File:** `detection/extract.ts`

**Checklist:**
- [ ] Create function `extractCandidates(messages: GmailMessage[]): Promise<ExtractedCommitment[]>`
- [ ] **Batching logic:**
  - [ ] Split input messages into batches (batch size from config)
  - [ ] For each batch, build extraction prompt (Task 3.1)
  - [ ] Call `gemini.callGeminiExtraction(prompt, messages)` (Task 1.3)
  - [ ] Collect results from all batches
- [ ] **Parse Gemini response:**
  - [ ] Validate that response is valid JSON with expected fields
  - [ ] For each extracted candidate, validate:
    - [ ] `title` is non-empty string (< 200 chars)
    - [ ] `requester` is non-empty string
    - [ ] `deadline` is null or valid ISO 8601 date
    - [ ] `verification_method` is one of the allowed values
    - [ ] If any field is invalid, log the error and skip that candidate (don't crash)
  - [ ] Return array of validated `ExtractedCommitment` objects
- [ ] **Error handling:**
  - [ ] If Gemini call fails entirely, throw error with context
  - [ ] If partial batch fails (e.g., some messages in a batch parsed, others didn't), keep valid ones, log invalids
- [ ] **Logging:**
  - [ ] Log extraction results: how many candidates extracted, any parse failures
  - [ ] Include message IDs and extracted titles for traceability

**Testing (unit tests, Phase 5):**
- [ ] Simple extraction: "Can you send the report by Friday?" should extract title ~ "Send report", deadline ~ Friday, requester recognized
- [ ] Batching: 12 messages should result in 2 Gemini calls (if batch size is 6)
- [ ] Malformed Gemini response should not crash; invalid candidates skipped
- [ ] Deadline ambiguity ("by Friday") should be parsed with a reasonable inference

**Output:** `detection/extract.ts` with `extractCandidates()` function

**Dependencies:** Task 1.1, Task 3.1, Task 1.3 (Gemini client)

---

## Phase 4: Confidence Scoring Implementation

### Task 4.1: Design Confidence Scoring Prompt
**Objective:** Write the prompt that guides Gemini to score commitment confidence.

**Checklist:**
- [ ] Define scoring prompt structure:
  - **System instruction:** "You are an AI evaluator assessing the confidence that a piece of text represents a real, actionable commitment..."
  - **Scoring factors (explicit list for Gemini):**
    - Explicit deadline presence (0–30 points)
    - Clear requester identification (0–20 points)
    - Clear action verb + deliverable (0–20 points)
    - Explicit acceptance language (0–15 points)
    - Direct addressing (0–10 points)
    - Penalties for vagueness, sarcasm, broadcast (-10 to -30 points)
  - **Contract:** "Return a JSON object with: score (number 0–100), tier ('HIGH' | 'MEDIUM' | 'LOW'), factors (object with reasoning for each signal)"
  - **Thresholds:** "HIGH >= 75, MEDIUM 40–74, LOW < 40" (or whatever the team decides in Task 1.2)
  - **Tone:** "Be conservative; if uncertain, lean toward lower confidence"
- [ ] Create function `buildScoringPrompt(candidate: ExtractedCommitment, originalMessage: GmailMessage): string` that:
  - Formats the system instruction
  - Includes 2–3 examples (high/medium/low confidence examples)
  - Includes the extracted candidate + original message for context
  - Returns full prompt

**Output:** Prompt template in `detection/prompts.ts` or inline in scoreConfidence.ts

**Dependencies:** Task 1.1, Task 1.2 (confidence thresholds)

---

### Task 4.2: Implement Confidence Scoring Function
**Objective:** Score extracted candidates to determine automation tier.

**File:** `detection/scoreConfidence.ts`

**Checklist:**
- [ ] Create function `scoreConfidence(candidate: ExtractedCommitment, originalMessage: GmailMessage): Promise<ConfidenceResult>`
- [ ] Where `ConfidenceResult = { score: number; tier: 'HIGH' | 'MEDIUM' | 'LOW'; factors: Record<string, unknown> }`
- [ ] **Call Gemini:**
  - [ ] Build scoring prompt (Task 4.1)
  - [ ] Call `gemini.callGeminiScoring(prompt, candidate)` (Task 1.3)
  - [ ] Parse response: validate JSON, extract `score`, `tier`, `factors`
- [ ] **Validation:**
  - [ ] Ensure score is 0–100
  - [ ] Ensure tier is one of the three allowed values
  - [ ] Ensure `factors` is an object (for explainability)
  - [ ] If response invalid, log error and fall back to a conservative default (e.g., MEDIUM confidence to avoid silent dismissal)
- [ ] **Mapping to automation behavior (per FR-1.4):**
  - [ ] HIGH → will auto-create as CONFIRMED
  - [ ] MEDIUM → will surface for user confirmation
  - [ ] LOW → will discard as DISMISSED
  - [ ] Note: This function just scores; it doesn't create/confirm yet (that's Phase 5 orchestration)
- [ ] **Error handling:**
  - [ ] If Gemini call fails after retries, fall back to conservative MEDIUM tier
  - [ ] Log failures with candidate ID for debugging

**Testing (unit tests, Phase 5):**
- [ ] High-confidence example: "Can you send the presentation by Friday?" should score HIGH
- [ ] Medium-confidence example: "Maybe you could review this sometime?" should score MEDIUM
- [ ] Low-confidence example: "Thoughts on this?" should score LOW
- [ ] Fallback on Gemini error should be MEDIUM (conservative)

**Output:** `detection/scoreConfidence.ts` with `scoreConfidence()` function

**Dependencies:** Task 1.1, Task 1.2, Task 4.1, Task 1.3

---

## Phase 5: Testing & Validation

### Task 5.1: Create Hand-Written Test Data
**Objective:** Build a small, realistic test set of Gmail messages for unit testing.

**File:** `detection/__tests__/fixtures.ts` or `detection/__tests__/data.ts`

**Checklist:**
- [ ] Create 15–20 test email samples covering:
  - [ ] High-confidence commitments (3–4 examples)
    - "Can you send the report by Friday?"
    - "I'll review the PR tonight"
    - "Please merge this feature before EOD"
  - [ ] Medium-confidence commitments (3–4 examples)
    - "Maybe you could look at this sometime"
    - "It would be great if you could help with X"
  - [ ] Low-confidence/noise (3–4 examples)
    - "Thanks", "Ok", "Let me know your thoughts"
  - [ ] Edge cases (3–4 examples)
    - Sarcastic: "Sure, I'll get right on that 😅"
    - Bulk/broadcast: "Everyone please submit timesheets by Friday"
    - Timezone ambiguity: "By tonight" (unclear timezone)
- [ ] For each, create a normalized `GmailMessage` object with realistic field values (id, from, subject, body, threadId, labels)
- [ ] Export as test fixtures for reuse across prefilter, extract, and scoring tests

**Output:** `detection/__tests__/fixtures.ts` with 15–20 test messages + expected outputs

**Dependencies:** Task 1.1 (needs GmailMessage type)

---

### Task 5.2: Unit Tests for Pre-Filter
**Objective:** Test prefilter.ts in isolation with the hand-written fixtures.

**File:** `detection/__tests__/prefilter.test.ts`

**Checklist:**
- [ ] Test passing conditions (positive cases):
  - [ ] Request pattern matches pass
  - [ ] Deadline language matches pass
  - [ ] Action verb matches pass
  - [ ] Direct imperative passes
- [ ] Test failing conditions (negative cases):
  - [ ] Trivial acks fail (thanks, ok, 👍)
  - [ ] Automated senders fail (noreply@, notifications@)
  - [ ] System notifications fail
  - [ ] Very short messages fail
- [ ] Test edge cases:
  - [ ] Dedup returns false for processed IDs
  - [ ] Mixed signals (some pass, some fail) — should pass (logical OR)
  - [ ] Case insensitivity (SEND vs send vs Send)
- [ ] Test reason field is populated for debugging
- [ ] Run tests against fixtures (Task 5.1)

**Output:** `detection/__tests__/prefilter.test.ts` with 10+ test cases, all passing

**Dependencies:** Task 2.1, Task 2.2, Task 5.1

---

### Task 5.3: Unit Tests for Extraction
**Objective:** Test extract.ts with mock Gemini responses.

**File:** `detection/__tests__/extract.test.ts`

**Checklist:**
- [ ] Mock Gemini API to avoid actual API calls during testing
  - [ ] Use `jest.mock()` or similar to stub `gemini.callGeminiExtraction()`
  - [ ] Provide canned Gemini responses (valid JSON with expected fields)
- [ ] Test successful extraction:
  - [ ] Single message extraction returns 1 candidate
  - [ ] Batch extraction (5 messages) returns 5 candidates
  - [ ] Extracted fields are non-empty and valid (title, requester, deadline, verification_method)
- [ ] Test error handling:
  - [ ] Malformed Gemini JSON is skipped, valid ones kept
  - [ ] Missing required fields cause candidate to be skipped
  - [ ] Invalid deadline format is caught and handled
- [ ] Test batching:
  - [ ] 12 messages with batch size 5 results in 3 Gemini calls (or 2 calls + remainder)
  - [ ] Verify batches are correctly split and results merged
- [ ] Run against fixtures (Task 5.1)

**Output:** `detection/__tests__/extract.test.ts` with 10+ test cases, all passing

**Dependencies:** Task 3.2, Task 5.1

---

### Task 5.4: Unit Tests for Confidence Scoring
**Objective:** Test scoreConfidence.ts with mock Gemini responses.

**File:** `detection/__tests__/scoreConfidence.test.ts`

**Checklist:**
- [ ] Mock Gemini API for scoring calls
- [ ] Test tier classification:
  - [ ] Score >= threshold → HIGH
  - [ ] Score in medium range → MEDIUM
  - [ ] Score < low threshold → LOW
- [ ] Test factor extraction:
  - [ ] `factors` object is populated with reasoning
  - [ ] Factors align with the scoring signals (deadline presence, requester clarity, etc.)
- [ ] Test error handling:
  - [ ] Malformed Gemini response falls back to MEDIUM
  - [ ] Missing score field causes fallback
  - [ ] Invalid tier string is caught
- [ ] Test explainability:
  - [ ] Each factor has a human-readable label
  - [ ] Confidence result includes reasoning for the tier

**Output:** `detection/__tests__/scoreConfidence.test.ts` with 8+ test cases, all passing

**Dependencies:** Task 4.2, Task 5.1

---

### Task 5.5: Integration Tests
**Objective:** Test the full pipeline (pre-filter → extract → score) end-to-end.

**File:** `detection/__tests__/pipeline.test.ts`

**Checklist:**
- [ ] Create a test pipeline function that combines all three stages
- [ ] Test full workflows:
  - [ ] High-confidence email flows through all stages, emerges as HIGH-confidence candidate
  - [ ] Low-confidence email is filtered out at pre-filter and never reaches extraction
  - [ ] Malformed response at any stage is handled without crashing
- [ ] Test with 5–10 fixture messages, mix of pass/fail at each stage
- [ ] Verify final output shape: array of candidates with id, title, description, requester, deadline, confidence_tier, confidence_score, factors

**Output:** `detection/__tests__/pipeline.test.ts` with 4–5 integration test cases

**Dependencies:** Task 2.1, Task 3.2, Task 4.2, Task 5.1

---

## Phase 6: Integration & Orchestration

### Task 6.1: Create Pipeline Orchestrator
**Objective:** Wire together pre-filter → extract → score into a single entry point.

**File:** `detection/pipeline.ts`

**Checklist:**
- [ ] Create function `detectAndScoreCommitments(messages: GmailMessage[]): Promise<ScoredCandidate[]>`
- [ ] **Orchestration logic:**
  - [ ] Call `prefilter()` on each message
  - [ ] Collect passing messages
  - [ ] Call `extractCandidates()` on passing messages
  - [ ] For each candidate, call `scoreConfidence()`
  - [ ] Return array of `ScoredCandidate` (candidate + confidence result)
- [ ] **Error handling:**
  - [ ] If pre-filter fails, log and skip message
  - [ ] If extraction fails for a message, log and skip
  - [ ] If scoring fails, use fallback MEDIUM tier (don't lose the candidate)
- [ ] **Logging:**
  - [ ] Log summary: X messages in, Y passed pre-filter, Z extracted, W scored
  - [ ] Log any failures with IDs for debugging
- [ ] This orchestrator is the main entry point for other modules (verification, communication, dashboard)

**Output:** `detection/pipeline.ts` with `detectAndScoreCommitments()` function

**Dependencies:** Task 2.1, Task 3.2, Task 4.2

---

### Task 6.2: Database Persistence Logic
**Objective:** Save detected, extracted, and scored candidates to MongoDB.

**File:** `detection/persist.ts`

**Checklist:**
- [ ] Create function `persistCandidate(userId: string, scoredCandidate: ScoredCandidate): Promise<Commitment>`
- [ ] **Prepare for save:**
  - [ ] Decide on automation tier based on confidence:
    - [ ] HIGH → `status: 'CONFIRMED'`
    - [ ] MEDIUM → `status: 'DETECTED'` (user will confirm)
    - [ ] LOW → `status: 'DISMISSED'` (silently discarded)
  - [ ] Assign `id` (UUID or MongoDB ObjectId)
  - [ ] Set `created_at`, `updated_at` timestamps
  - [ ] Set `source: 'gmail'`, `source_reference: message.id`
  - [ ] Map extracted fields to `Commitment` interface
- [ ] **Call shared DB:**
  - [ ] Import commitment model from `shared/db/`
  - [ ] Use shared state-machine helper to transition from DETECTED/CONFIRMED (per ARCHITECTURE.md)
  - [ ] Never write `status` directly; always use the state machine
- [ ] **Handle duplicates:**
  - [ ] Check if a commitment with this `source_reference` already exists (dedup at DB level)
  - [ ] If yes, log and skip (don't create duplicate)
- [ ] **Error handling:**
  - [ ] If DB write fails, throw error with context
- [ ] **Return saved commitment** for downstream use (verification, communication)

**Output:** `detection/persist.ts` with `persistCandidate()` function

**Dependencies:** Task 1.1 (shared types), shared/db access, Task 6.1 (pipeline output)

---

### Task 6.3: Approval Queue Handler for Medium-Confidence Candidates
**Objective:** Surface medium-confidence candidates for user confirmation.

**File:** `detection/approvalQueue.ts`

**Checklist:**
- [ ] Create function `queueForApproval(candidate: Commitment): Promise<void>`
- [ ] **Behavior:**
  - [ ] Only called for DETECTED-status (medium-confidence) candidates
  - [ ] Create a record in `shared/db` (or a dedicated approval queue collection) with the candidate
  - [ ] Flag it as pending user review
- [ ] **Fields to store:**
  - [ ] Candidate ID, title, description, requester, deadline
  - [ ] Confidence score and factors (for transparency in the UI)
  - [ ] Original message excerpt (for context)
- [ ] **Later workflows** (dashboard approval, communication) will consume this queue
- [ ] No code changes to dashboard yet; just persistence layer

**Output:** `detection/approvalQueue.ts` with `queueForApproval()` function and queue record type

**Dependencies:** Task 1.1 (shared types), Task 6.2 (persistence)

---

## Phase 7: Error Handling & Edge Cases

### Task 7.1: Implement Retry Logic for Gemini API
**Objective:** Handle transient Gemini failures gracefully.

**Checklist:**
- [ ] In `gemini.ts`:
  - [ ] Add retry wrapper: max 3 retries with exponential backoff (1s, 2s, 4s)
  - [ ] Catch `AbortError`, `RateLimitError`, timeout errors; retry
  - [ ] Catch `InvalidInputError`, `PermissionError`, `ApiError` (non-transient); fail immediately with clear error
  - [ ] Log each retry attempt (attempt N/3, backoff delay)
  - [ ] After final failure, throw error with full context (error code, message, failed request)
- [ ] In `pipeline.ts`:
  - [ ] If extraction fails: log error, skip batch, continue with next batch
  - [ ] If scoring fails: fall back to MEDIUM tier (don't lose candidate)

**Output:** Retry logic in `gemini.ts`, error propagation in `pipeline.ts`

**Dependencies:** Task 1.3 (Gemini client), Task 6.1 (pipeline)

---

### Task 7.2: Handle Edge Cases
**Objective:** Address edge cases identified in PRODUCT_SPEC Section 24.

**Checklist:**
- [ ] **Sarcastic/rhetorical commitments:**
  - [ ] Update extraction prompt to recognize sarcasm markers (😅, 😂, "sure, I'll get right on that", etc.)
  - [ ] Lower confidence score for sarcasm-flagged extracts
  - [ ] Test: "Sure, I'll get right on that 😅" should score LOW
- [ ] **Bulk/broadcast messages:**
  - [ ] Detect if message is sent to 5+ recipients (CC/BCC)
  - [ ] Lower confidence for broadcasts (they're requests, not commitments)
  - [ ] Test: "Everyone please submit timesheets by Friday" sent to 50 people should score LOW/MEDIUM
- [ ] **Timezone ambiguity:**
  - [ ] If deadline is relative ("by tonight") and timezone is unclear, flag in extracted candidate
  - [ ] Reduce confidence slightly for ambiguous deadline timezone
  - [ ] Test: "by tonight" without timezone context should score MEDIUM or lower
- [ ] **Multiple people promising same task:**
  - [ ] This is a dedup + clustering problem (Phase 8+); for now, just ensure extraction doesn't duplicate
  - [ ] Each person's commitment is a separate candidate
  - [ ] Log potential duplicates for manual review
- [ ] **Messages with no deadline:**
  - [ ] Allow extraction even without explicit deadline (deadline can be null)
  - [ ] Reduce confidence if no deadline AND no action verb (too vague)
  - [ ] Test: "let me know your thoughts" with no deadline should score LOW

**Output:** Enhanced extraction/scoring prompts, updated tests covering edge cases

**Dependencies:** Task 3.1, Task 4.1, Task 5.1

---

## Phase 8: Performance & Monitoring

### Task 8.1: Add Logging & Observability
**Objective:** Instrument the pipeline for debugging and monitoring.

**Checklist:**
- [ ] Set up structured logging (console or a logger like `pino` if available)
- [ ] Log at key points:
  - [ ] Pre-filter: message ID, pass/fail, reason
  - [ ] Extraction: batch size, number of candidates, any parse failures
  - [ ] Scoring: candidate ID, score, tier, factors summary
  - [ ] Persistence: candidate ID, status, user ID
- [ ] Include contextual data:
  - [ ] Timestamp, module name, function name
  - [ ] Request/batch ID for tracing through the pipeline
- [ ] Log errors with stack traces and context

**Output:** Logging calls throughout `prefilter.ts`, `extract.ts`, `scoreConfidence.ts`, `pipeline.ts`, etc.

**Dependencies:** All prior phases

---

### Task 8.2: Add Performance Metrics
**Objective:** Track execution times and costs.

**Checklist:**
- [ ] Measure latency:
  - [ ] Pre-filter time per message
  - [ ] Extraction time per batch (and per message)
  - [ ] Scoring time per candidate
  - [ ] Total pipeline time
- [ ] Track costs:
  - [ ] Gemini API calls (number, tokens if available)
  - [ ] DB operations (reads, writes)
- [ ] Report aggregates:
  - [ ] Average latency per stage
  - [ ] Tokens spent per message
- [ ] Export metrics (to stdout, or integrate with monitoring service later)

**Output:** Metrics collection in `pipeline.ts`, possibly a new `detection/metrics.ts` file

**Dependencies:** Task 6.1 (pipeline orchestrator)

---

## Phase 9: Documentation & Handoff

### Task 9.1: Document Pipeline Contract
**Objective:** Write clear documentation for how other modules use detection.

**File:** `detection/PIPELINE_CONTRACT.md`

**Checklist:**
- [ ] Document entry point: `detectAndScoreCommitments(messages: GmailMessage[])`
  - [ ] Input shape, output shape, error cases
  - [ ] What happens at each tier (HIGH → auto-create, MEDIUM → queue, LOW → dismiss)
- [ ] Document assumptions:
  - [ ] Messages must be normalized to `GmailMessage` shape
  - [ ] User ID must be passed separately for persistence
  - [ ] Gemini API key must be in `.env`
- [ ] Document dependencies on shared:
  - [ ] Which shared/db models are used
  - [ ] Which shared/types are imported
- [ ] Document known limitations:
  - [ ] Confidence scores are LLM-based, not perfect
  - [ ] Sarcasm detection is heuristic-based
  - [ ] Batch size affects latency/cost tradeoff
- [ ] Include examples:
  - [ ] Sample input (5 Gmail messages)
  - [ ] Sample output (scored candidates)

**Output:** `detection/PIPELINE_CONTRACT.md`

**Dependencies:** All prior phases

---

### Task 9.2: Update detection/README.md
**Objective:** Refresh the README with implementation details.

**Checklist:**
- [ ] Update the README to reflect the actual implementation:
  - [ ] How to run tests: `npm test -- detection/`
  - [ ] How to configure thresholds: edit `detection/config.ts`
  - [ ] How other modules integrate: link to PIPELINE_CONTRACT.md
  - [ ] File-by-file breakdown: what each file does
  - [ ] Known issues and TODOs
- [ ] Add troubleshooting section:
  - [ ] Common Gemini API errors and fixes
  - [ ] How to test with hand-written fixtures
  - [ ] How to enable debug logging

**Output:** Updated `detection/README.md`

**Dependencies:** All prior phases

---

## Dependency Graph

**Phase 1 (Setup):**
- Task 1.1, 1.2 → no deps
- Task 1.3 → depends on 1.1, 1.2

**Phase 2 (Pre-Filter):**
- Task 2.1 → depends on 1.1, 1.2
- Task 2.2 → depends on 2.1, 1.1

**Phase 3 (Extraction):**
- Task 3.1 → depends on 1.2
- Task 3.2 → depends on 1.1, 3.1, 1.3

**Phase 4 (Scoring):**
- Task 4.1 → depends on 1.1, 1.2
- Task 4.2 → depends on 1.1, 1.2, 4.1, 1.3

**Phase 5 (Testing):**
- Task 5.1 → depends on 1.1
- Task 5.2 → depends on 2.1, 2.2, 5.1
- Task 5.3 → depends on 3.2, 5.1
- Task 5.4 → depends on 4.2, 5.1
- Task 5.5 → depends on 2.1, 3.2, 4.2, 5.1

**Phase 6 (Integration):**
- Task 6.1 → depends on 2.1, 3.2, 4.2
- Task 6.2 → depends on 1.1, 6.1
- Task 6.3 → depends on 1.1, 6.2

**Phase 7 (Error Handling):**
- Task 7.1 → depends on 1.3, 6.1
- Task 7.2 → depends on 3.1, 4.1, 5.1

**Phase 8 (Performance):**
- Task 8.1 → depends on all prior (logging needed everywhere)
- Task 8.2 → depends on 6.1 (pipeline)

**Phase 9 (Documentation):**
- Task 9.1 → depends on all prior
- Task 9.2 → depends on 9.1

---

## Parallelization Strategy

**Can be done in parallel within each phase:**
- Phase 1: Tasks 1.1 + 1.2 in parallel; 1.3 after
- Phase 2: Task 2.1 → Task 2.2 (sequential, small task)
- Phase 3: Task 3.1 → Task 3.2 (sequential, prompt informs implementation)
- Phase 4: Task 4.1 → Task 4.2 (sequential, same structure as Phase 3)
- Phase 5: Tasks 5.2, 5.3, 5.4 can be done in parallel once 5.1 is done; 5.5 after all
- Phase 6: Tasks 6.1 → 6.2 → 6.3 (sequential, 6.2 uses 6.1, 6.3 uses 6.2)
- Phase 7: Tasks 7.1, 7.2 can be parallel
- Phase 8: Tasks 8.1, 8.2 can be parallel
- Phase 9: Tasks 9.1, 9.2 can be parallel

---

## Estimated Task Sizes

**Small (1–2 hours):**
- 1.1, 1.2, 2.2, 5.1, 7.2, 8.1, 8.2, 9.2

**Medium (2–4 hours):**
- 1.3, 2.1, 3.1, 3.2, 4.1, 4.2, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 9.1

**Large (4+ hours):**
- 5.5 (integration tests), 8.2 (if metrics are complex)

**Total estimate:** 40–60 hours of work for one developer (spans Phases 1–9, can be parallelized)

---

## Validation Checklist (Before Calling Phase Complete)

- [ ] All unit tests pass (Phase 5)
- [ ] All fixtures cover high/medium/low confidence tiers
- [ ] Pipeline orchestrator successfully processes a batch of 10+ messages
- [ ] Candidates are persisted to MongoDB correctly
- [ ] Medium-confidence candidates are queued for approval
- [ ] Logging and metrics are producing useful output
- [ ] README and PIPELINE_CONTRACT are clear and accurate
- [ ] Code is linted and formatted (run `npm run lint` before merge)
- [ ] No hardcoded values outside of `config.ts`
- [ ] Shared types are not redefined locally
