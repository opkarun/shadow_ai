# Prefilter Design & Implementation

## Overview

The prefilter is the first stage of the Detection module's commitment discovery pipeline. It implements the noise-reduction layer from PRODUCT_SPEC.md Section 27, filtering out obvious non-commitments before sending messages to the LLM extraction pipeline.

**Core principle:** Recall-biased, fail-open design. The goal is to avoid sending every message to the LLM (cost/latency), while ensuring no real commitment is silently dropped. An unnecessary LLM call is cheaper than losing a commitment.

---

## Architecture

### PrefilterEngine Class

The core logic is encapsulated in a `PrefilterEngine` class with the following design:

**Patterns compiled once** (in constructor) for efficiency:
- All patterns are compiled into case-insensitive regexes and reused across all filter calls
- Regex compilation happens once; filtering happens many times

**Separate concerns:**
- `checkAutoFail()` - Rejects based on sender, dedup, system notifications
- `checkSignals()` - Accepts if ANY commitment signal matches (logical OR)
- `checkImperativeStructure()` - Specialized check for direct commands

**Error handling:**
- All operations wrapped in try/catch
- On any error, fail open (pass the message through)
- Errors logged for debugging

### Public API

```typescript
prefilterMessage(message: NormalizedGmailMessage): PrefilterResult
```

Returns `{ passes_prefilter: boolean; message: NormalizedGmailMessage; reason?: string }`

The original message is always returned unmodified; the prefilter never mutates it.

---

## Filter Logic

### Auto-Fail Checks (run first, highest precision)

Reject immediately if ANY of these match:

1. **Deduplication**: Message ID already processed (in-memory Set for MVP)
2. **Automated sender**: `noreply@`, `notifications@`, `bot@`, `system@`, etc.
3. **System notification**: Keywords like "calendar reminder", "joined the channel", "was removed"

### Signal Checks (run if auto-fail passed, recall-biased)

Pass the message if ANY signal matches:

1. **Commitment phrasing**: "can you", "could you", "would you", "please", "I'll", "I will", "on it", "will do"
2. **Action verbs**: "send", "review", "publish", "upload", "finish", "submit", "ship", "deploy", "fix", "merge", "create", "build", "write", "update", "implement", "setup", "configure", "check", "verify", "test", "approve", "sign", "complete", "deliver", "provide", "share"
3. **Deadline language**: "by Friday", "tomorrow", "tonight", "EOD", "end of day", "before lunch", time patterns (3pm, 15:00), weekday names, "ASAP", "urgent"
4. **Imperative structure**: Sentences starting with action verbs, addressed to user ("you", "your", "the"), not rhetorical

### Message Length Filter

Messages with < 3 words are rejected as trivial acks ("thanks", "ok", "👍").

---

## Tunable Configuration

All patterns and thresholds are defined in `detection/config.ts`:

- `PREFILTER_PATTERNS` - Keywords and patterns for signals
- `PREFILTER_AUTO_FAIL_PATTERNS` - Automated sender addresses and system notification keywords
- `PREFILTER_MIN_WORD_COUNT` - Word count threshold (default: 3)

This allows tuning behavior without code changes. Environment variables or config files can override defaults in production.

---

## Testing

### Test Coverage

55 unit tests covering:

- **Auto-fail checks**: Dedup, automated senders, system notifications
- **Signal detection**: Request patterns, promise patterns, action verbs, deadline language, imperative structure
- **Edge cases**: Case insensitivity, whitespace handling, mixed signals, empty fields
- **Recall-oriented behavior**: Logical OR (pass if ANY signal matches)
- **Error handling**: Fail-open on exceptions, message preservation

### Test Isolation

- `beforeEach()` resets the dedup cache to ensure test independence
- Unique message IDs generated for each test to avoid cross-contamination
- `resetPrefilterEngine()` exported for testing purposes (not for production use)

---

## Deduplication Strategy

**Current (MVP):** In-memory `Set<messageId>` in the PrefilterEngine singleton

**Rationale:**
- Keeps the prefilter cheap (no DB calls)
- Sufficient for single-instance deployments
- Lost on restart (acceptable for MVP; real messages will be re-ingested if needed)

**Future upgrade path:**
- Query `shared/db` to check if a commitment with this `source_reference` already exists
- Enables distributed deployments and persistence across restarts
- Trade-off: adds latency to prefilter (justified when needed)

---

## Integration with Later Stages

The prefilter **gates** traffic to the extraction pipeline:

```
Gmail Messages
     ↓
[PREFILTER] ← filters out 70–80% of messages (notifications, acks, etc.)
     ↓
[EXTRACTION] ← LLM extraction (only for messages that passed prefilter)
     ↓
[SCORING] ← Confidence scoring (determines automation tier)
```

**No prefilter rejection means no LLM call.** This is the cost saving.

---

## Known Limitations & Design Decisions

1. **Sarcasm detection not in prefilter**: Sarcasm detection (e.g., "Sure, I'll get right on that 😅") is not a prefilter concern. Per PRODUCT_SPEC, it's a confidence-scoring problem. We let sarcastic messages through to the LLM.

2. **Action verb false positives**: Words like "update" (in "Project update" as a noun) match the action verb pattern. This is a recall-bias trade-off: accepting false positives in the prefilter keeps the LLM scoring simpler and the pipeline more robust.

3. **No context-awareness**: The prefilter doesn't analyze the email thread or conversation context (e.g., whether the sender is a manager, or if a deadline was already discussed). Contextual signals are the LLM's job.

4. **Case-insensitive matching**: All patterns are lowercased and matched case-insensitively. This is correct for flexibility but means "SEND" and "send" and "Send" all match. Capitalization is not a signal.

---

## Performance Characteristics

- **Latency per message:** ~1–5ms (regex matching, no I/O)
- **Memory:** O(1) regex objects compiled once; O(n) dedup cache where n = messages seen in current session
- **Throughput:** ~10,000+ messages/sec on modern hardware (limited by ingestion/LLM pipeline, not prefilter)

---

## Error Handling Strategy

All errors in the prefilter are logged and result in **fail-open** (pass through):

```
try {
  // filter logic
} catch (error) {
  logger.warn("Prefilter error, failing open", { messageId, error });
  return { passes_prefilter: true, ... };
}
```

**Rationale:** A malformed message object or unexpected edge case should not cause a commitment to be silently lost. The LLM is the safety net.

---

## Logging

Structured JSON logging at key decision points:

- **PASSED**: `logger.info("Message passed prefilter", { messageId })`
- **FAILED**: `logger.info("Message rejected by auto-fail check", { messageId, reason })`
- **ERRORS**: `logger.warn("Prefilter error, failing open", { messageId, error })`

Useful for:
- Monitoring filter performance and tuning signal effectiveness
- Debugging false positives (why did a noise message pass?)
- Observability (what % of messages pass the prefilter?)

---

## Future Enhancements

1. **Metrics collection**: Track pass/fail rates by signal type to tune effectiveness
2. **ML-based patterns**: Train a lightweight classifier to replace regex patterns
3. **Async dedup**: Query DB in background while checking other signals in parallel
4. **Batch prioritization**: Send high-signal batches to extraction first (SLA optimization)
5. **Thread context**: Incorporate email thread history for conversation-aware filtering

