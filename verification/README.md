# Verification

Owns GitHub evidence matching, Google Calendar attendance matching, manual verification handling, and risk detection. This module decides whether real evidence supports a commitment and whether an open commitment should become `AT_RISK`, `OVERDUE`, or `COMPLETED` through the shared state machine.

Reads from `shared/types/` for commitments and evidence, and uses `shared/db/` models plus `transitionCommitmentStatus` for persistence.

Must never fabricate API responses, infer completion from elapsed time alone, generate outbound communication drafts directly, define local schemas, or write `status` fields outside the shared state-machine helper.
