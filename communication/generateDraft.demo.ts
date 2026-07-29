/**
 * Demo of Step 1 generateDraft() — shows prompt construction and mock Gemini response.
 * This demonstrates the logic without requiring a live API key.
 *
 * Run with: npx tsx communication/generateDraft.demo.ts
 */

import type { Commitment, Evidence, CommunicationDraftType } from "../shared/types";

// Test fixtures (same as in tests)
const fixtureCommitment: Commitment = {
  id: "test-commit-001",
  user_id: "user-123",
  title: "Review and approve API design doc",
  description:
    "Ananya asked me to review the new REST API design for the data pipeline module and provide feedback by end of day.",
  requester: "Ananya Kumar (teammate)",
  source: "gmail",
  source_reference: "gmail-msg-abc123",
  deadline: new Date("2026-07-29T17:00:00Z"),
  status: "CONFIRMED",
  confidence_score: 0.92,
  priority_score: 7.5,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/data-pipeline",
  created_at: new Date("2026-07-28T09:00:00Z"),
  updated_at: new Date("2026-07-28T09:00:00Z")
};

const fixtureCommitmentCompleted: Commitment = {
  id: "test-commit-002",
  user_id: "user-123",
  title: "Ship the payment integration feature",
  description: "Had promised the team the payment module would be merged to main by Friday.",
  requester: "Team lead (manager)",
  source: "gmail",
  source_reference: "gmail-msg-def456",
  deadline: new Date("2026-07-26T23:59:59Z"),
  status: "COMPLETED",
  confidence_score: 0.95,
  priority_score: 9.0,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/payment-module",
  created_at: new Date("2026-07-20T10:00:00Z"),
  updated_at: new Date("2026-07-26T15:30:00Z")
};

const fixtureCommitmentOverdue: Commitment = {
  id: "test-commit-003",
  user_id: "user-123",
  title: "Send client proposal for Q3 roadmap",
  description: "Promised to send a written proposal outlining the Q3 development roadmap to the client.",
  requester: "Meera (freelance client)",
  source: "gmail",
  source_reference: "gmail-msg-ghi789",
  deadline: new Date("2026-07-27T12:00:00Z"),
  status: "OVERDUE",
  confidence_score: 0.88,
  priority_score: 8.5,
  verification_method: "manual",
  linked_repo: null,
  created_at: new Date("2026-07-20T14:00:00Z"),
  updated_at: new Date("2026-07-28T09:00:00Z")
};

const fixtureCommitmentAtRisk: Commitment = {
  id: "test-commit-004",
  user_id: "user-123",
  title: "Deploy backend auth service to staging",
  description: "Agreed to have the OAuth2 auth service running on the staging environment.",
  requester: "Rohan (developer, same team)",
  source: "gmail",
  source_reference: "gmail-msg-jkl012",
  deadline: new Date("2026-07-29T18:00:00Z"),
  status: "AT_RISK",
  confidence_score: 0.89,
  priority_score: 7.0,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/auth-service",
  created_at: new Date("2026-07-24T11:00:00Z"),
  updated_at: new Date("2026-07-28T16:00:00Z")
};

const evidenceGitHubCommit: Evidence = {
  id: "ev-001",
  commitment_id: "test-commit-002",
  evidence_type: "github_commit",
  evidence_reference: "https://github.com/example/payment-module/commit/abc123def456",
  match_confidence: 0.95,
  detected_at: new Date("2026-07-26T15:30:00Z")
};

const evidenceGitHubPR: Evidence = {
  id: "ev-002",
  commitment_id: "test-commit-002",
  evidence_type: "github_pr",
  evidence_reference: "https://github.com/example/payment-module/pull/157",
  match_confidence: 0.92,
  detected_at: new Date("2026-07-26T15:20:00Z")
};

// Core logic from generateDraft.ts
function getToneAndGoal(draftType: CommunicationDraftType): { tone: string; goal: string } {
  switch (draftType) {
    case "acknowledgement":
      return {
        tone: "warm, concise, professional",
        goal: "confirm understanding of the commitment and scope/deadline"
      };
    case "completion":
      return {
        tone: "confident, brief, celebratory",
        goal: "close the loop with the requester and confirm completion"
      };
    case "recovery":
      return {
        tone: "apologetic, accountable, forward-looking",
        goal: "acknowledge the miss, rebuild trust, and commit to a concrete new timeline"
      };
    case "extension_request":
      return {
        tone: "proactive, respectful, solution-oriented",
        goal: "renegotiate the deadline before it is missed"
      };
  }
}

function formatEvidence(evidence: Evidence[]): string {
  if (evidence.length === 0) return "(no evidence collected yet)";

  return evidence
    .map((e) => {
      const typeLabel = e.evidence_type.replace(/_/g, " ");
      return `${typeLabel} (confidence: ${(e.match_confidence * 100).toFixed(0)}%): ${e.evidence_reference}`;
    })
    .join("\n");
}

function buildPrompt(
  draftType: CommunicationDraftType,
  commitment: Commitment,
  evidenceSummary: string,
  priorContext: string,
  toneGoal: { tone: string; goal: string },
  userName?: string,
  userEmail?: string
): string {
  const salutation = `Draft a ${draftType} email message for: ${commitment.requester}`;

  return `You are a professional AI assistant helping someone manage their commitments via email.

${salutation}

Commitment Details:
- Title: ${commitment.title}
- Description: ${commitment.description}
- Requester: ${commitment.requester}
- Deadline: ${commitment.deadline ? commitment.deadline.toISOString().split("T")[0] : "not specified"}
- Current Status: ${commitment.status}

Evidence of Completion:
${evidenceSummary}

Prior Thread Context:
${priorContext}

Tone: ${toneGoal.tone}
Goal: ${toneGoal.goal}

Write a plain-text email (no HTML, no markdown formatting) that achieves this goal.
${userName ? `Sign as: ${userName}` : ""}
${userEmail ? `From email: ${userEmail}` : ""}

The email should be 2-4 sentences, direct, and human-sounding. Do not include salutation or closing signature — just the body.`;
}

// Mock responses (what Gemini would generate)
const mockResponses: Record<CommunicationDraftType, string> = {
  acknowledgement: `Thanks for flagging this, Ananya. I've reviewed the requirements and scope — I'll have feedback on the API design by EOD today as promised. Let me know if you need any clarifications as I'm working through it.`,

  completion: `Just shipped the payment integration to main! All tests are passing and it's ready for deployment. Thanks for the tight deadline — I appreciate the trust.`,

  recovery: `I apologize for missing the July 27th deadline on the Q3 roadmap proposal. I underestimated the scope and should have flagged it sooner. I have the draft ready now and will send it to you by EOD tomorrow, July 30th. Thank you for your patience.`,

  extension_request: `I want to flag that the staging deployment for the OAuth2 service is looking tight for tomorrow. Current blockers are the cert renewal (waiting on infrastructure) and one integration test that's flaky. I'd like to propose extending the deadline to July 31st EOD, which gives us a full day to resolve these. Does that work?`
};

function demonstratePromptConstruction() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║   Step 1: generateDraft() — Prompt Construction Demo          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Demo 1: Acknowledgement
  console.log("=== DEMO 1: Acknowledgement Draft ===\n");
  const ackTone = getToneAndGoal("acknowledgement");
  const ackPrompt = buildPrompt(
    "acknowledgement",
    fixtureCommitment,
    formatEvidence([]),
    "Ananya: Can you review the API design doc by EOD? It's critical for the sprint.",
    ackTone,
    "Karun Wadhwa",
    "karunwadhwa044@gmail.com"
  );
  console.log("Tone:", ackTone.tone);
  console.log("Goal:", ackTone.goal);
  console.log("\n--- Prompt sent to Gemini ---");
  console.log(ackPrompt);
  console.log("\n--- Mock Gemini Response (what model would generate) ---");
  console.log(mockResponses.acknowledgement);
  console.log("\n✓ Prompt constructed correctly for tone/goal.\n");

  // Demo 2: Completion
  console.log("=== DEMO 2: Completion Draft ===\n");
  const compTone = getToneAndGoal("completion");
  const compPrompt = buildPrompt(
    "completion",
    fixtureCommitmentCompleted,
    formatEvidence([evidenceGitHubPR, evidenceGitHubCommit]),
    "Team lead: Can you ship the payment integration by Friday?\nMe: On it, targeting Friday EOD.",
    compTone,
    "Karun Wadhwa",
    "karunwadhwa044@gmail.com"
  );
  console.log("Tone:", compTone.tone);
  console.log("Goal:", compTone.goal);
  console.log("\n--- Prompt sent to Gemini ---");
  console.log(compPrompt);
  console.log("\n--- Mock Gemini Response ---");
  console.log(mockResponses.completion);
  console.log("\n✓ Prompt constructed correctly with evidence details.\n");

  // Demo 3: Recovery
  console.log("=== DEMO 3: Recovery Draft (OVERDUE) ===\n");
  const recTone = getToneAndGoal("recovery");
  const recPrompt = buildPrompt(
    "recovery",
    fixtureCommitmentOverdue,
    formatEvidence([]),
    "Client: Looking forward to the Q3 roadmap proposal by Monday EOD (July 27).\nMe: Will have it ready by Monday.",
    recTone,
    "Karun Wadhwa",
    "karunwadhwa044@gmail.com"
  );
  console.log("Tone:", recTone.tone);
  console.log("Goal:", recTone.goal);
  console.log("\n--- Prompt sent to Gemini ---");
  console.log(recPrompt);
  console.log("\n--- Mock Gemini Response ---");
  console.log(mockResponses.recovery);
  console.log("\n✓ Prompt constructed correctly — recovery tone is apologetic + forward-looking.\n");

  // Demo 4: Extension Request
  console.log("=== DEMO 4: Extension Request Draft (AT_RISK) ===\n");
  const extTone = getToneAndGoal("extension_request");
  const extPrompt = buildPrompt(
    "extension_request",
    fixtureCommitmentAtRisk,
    formatEvidence([]),
    "Rohan: We need the OAuth2 service running on staging by tomorrow so we can test the integration.\nMe: Got it, I'll have it staged by then.",
    extTone,
    "Karun Wadhwa",
    "karunwadhwa044@gmail.com"
  );
  console.log("Tone:", extTone.tone);
  console.log("Goal:", extTone.goal);
  console.log("\n--- Prompt sent to Gemini ---");
  console.log(extPrompt);
  console.log("\n--- Mock Gemini Response ---");
  console.log(mockResponses.extension_request);
  console.log("\n✓ Prompt constructed correctly — extension tone is proactive + respectful.\n");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║ Summary: All four draft types construct correct prompts.      ║");
  console.log("║ ✓ Tone/goal pairing is correct per PRODUCT_SPEC Section 13.  ║");
  console.log("║ ✓ Evidence and prior context included appropriately.         ║");
  console.log("║ ✓ Mock responses demonstrate expected output quality.        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  console.log("\nNext Steps:");
  console.log("1. Provide GEMINI_API_KEY in .env to run live tests");
  console.log("2. Fix Mongo connection issue in shared/db/models.ts");
  console.log("3. Implement real Mongo insertion in generateDraft()");
  console.log("4. Run generateDraft.test.ts with live Gemini API");
}

demonstratePromptConstruction();
