# Communication

Owns AI draft generation for acknowledgement, completion, recovery, and extension-request messages, plus the approval queue flow. This module may create drafts proactively, but every send path must require explicit user approval.

Reads from `shared/types/` for `Commitment`, `Evidence`, and `CommunicationDraft`, and uses `shared/db/` for draft records and audit history.

Must never auto-send communication, decide verification status, mutate commitment status directly, create local schemas, or touch detection and verification internals.
