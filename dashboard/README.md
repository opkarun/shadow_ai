# Dashboard

Owns the React frontend and any dashboard BFF/API routes needed to support the user interface. This module presents commitments, evidence, drafts, integrations, calendar events, and audit history through the screens listed in PRODUCT_SPEC.md Section 22.

Reads from `shared/types/` for all rendered data contracts and uses `shared/db/` only through dashboard-owned BFF routes.

Must never define alternate shared types, bypass `transitionCommitmentStatus` for manual overrides, auto-send drafts, implement detection/extraction logic, or implement evidence matching logic.
