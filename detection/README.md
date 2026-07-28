# Detection

Owns the Gmail pre-filter, Gemini extraction pipeline, and confidence scoring. This module is responsible for deciding whether incoming Gmail messages should reach the LLM, extracting candidate commitments, and assigning the confidence behavior tier described in PRODUCT_SPEC.md Sections 8, 16, and 27.

Reads from `shared/types/` for commitment shapes and imports `shared/db/` only when persisting candidates through the shared contract.

Must never define local copies of shared entities, open its own Mongo connection, verify completion evidence, generate or send communication drafts, or write commitment status directly instead of using the shared state-machine helper.
