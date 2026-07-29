/**
 * Test fixtures and manual tests for generateDraft() Step 1.
 * Run with: npx ts-node communication/generateDraft.test.ts
 */

import { generateDraft, type DraftContext } from "./generateDraft";
import type { Commitment, Evidence, CommunicationDraftType } from "../shared/types";

// Fixture: a Gmail-sourced commitment with a deadline
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

// Fixture: a completed commitment with evidence
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

// Fixture: an overdue commitment
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

// Fixture: commitment approaching deadline (at-risk)
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

// Evidence fixtures
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

async function testAcknowledgementDraft() {
  console.log("\n=== TEST 1: Acknowledgement Draft ===");
  console.log("Context: New commitment just confirmed, no evidence yet.");

  const context: DraftContext = {
    commitment: fixtureCommitment,
    evidence: [],
    prior_thread_context: ["Ananya: Can you review the API design doc by EOD? It's critical for the sprint."],
    user_name: "Karun Wadhwa",
    user_email: "karunwadhwa044@gmail.com"
  };

  try {
    const draft = await generateDraft("acknowledgement", context);
    console.log("\n✓ Draft generated successfully");
    console.log(`Draft ID: ${draft.id}`);
    console.log(`Status: ${draft.status}`);
    console.log(`Created: ${draft.created_at.toISOString()}`);
    console.log("\n--- Generated Content (plain text) ---");
    console.log(draft.content);
    console.log("--- End ---\n");

    console.log("HUMAN JUDGMENT: Does this sound warm, concise, and confirm the scope/deadline?");
    return true;
  } catch (err) {
    console.error("✗ Test failed:", err);
    return false;
  }
}

async function testCompletionDraft() {
  console.log("\n=== TEST 2: Completion Draft ===");
  console.log("Context: Feature completed with GitHub evidence.");

  const context: DraftContext = {
    commitment: fixtureCommitmentCompleted,
    evidence: [evidenceGitHubPR, evidenceGitHubCommit],
    prior_thread_context: [
      "Team lead: Can you ship the payment integration by Friday?",
      "Me: On it, targeting Friday EOD."
    ],
    user_name: "Karun Wadhwa",
    user_email: "karunwadhwa044@gmail.com"
  };

  try {
    const draft = await generateDraft("completion", context);
    console.log("\n✓ Draft generated successfully");
    console.log(`Draft ID: ${draft.id}`);
    console.log(`Status: ${draft.status}`);
    console.log("\n--- Generated Content (plain text) ---");
    console.log(draft.content);
    console.log("--- End ---\n");

    console.log("HUMAN JUDGMENT: Does this sound confident, brief, and close the loop?");
    return true;
  } catch (err) {
    console.error("✗ Test failed:", err);
    return false;
  }
}

async function testRecoveryDraft() {
  console.log("\n=== TEST 3: Recovery Draft (OVERDUE) ===");
  console.log("Context: Deadline passed, need to recover trust.");

  const context: DraftContext = {
    commitment: fixtureCommitmentOverdue,
    evidence: [],
    prior_thread_context: [
      "Client: Looking forward to the Q3 roadmap proposal by Monday EOD (July 27).",
      "Me: Will have it ready by Monday."
    ],
    user_name: "Karun Wadhwa",
    user_email: "karunwadhwa044@gmail.com"
  };

  try {
    const draft = await generateDraft("recovery", context);
    console.log("\n✓ Draft generated successfully");
    console.log(`Draft ID: ${draft.id}`);
    console.log(`Status: ${draft.status}`);
    console.log("\n--- Generated Content (plain text) ---");
    console.log(draft.content);
    console.log("--- End ---\n");

    console.log("HUMAN JUDGMENT: Does this sound apologetic, accountable, and include a new timeline?");
    return true;
  } catch (err) {
    console.error("✗ Test failed:", err);
    return false;
  }
}

async function testExtensionRequestDraft() {
  console.log("\n=== TEST 4: Extension Request Draft (AT_RISK) ===");
  console.log("Context: Deadline approaching, no evidence yet, proactively asking for extension.");

  const context: DraftContext = {
    commitment: fixtureCommitmentAtRisk,
    evidence: [],
    prior_thread_context: [
      "Rohan: We need the OAuth2 service running on staging by tomorrow so we can test the integration.",
      "Me: Got it, I'll have it staged by then."
    ],
    user_name: "Karun Wadhwa",
    user_email: "karunwadhwa044@gmail.com"
  };

  try {
    const draft = await generateDraft("extension_request", context);
    console.log("\n✓ Draft generated successfully");
    console.log(`Draft ID: ${draft.id}`);
    console.log(`Status: ${draft.status}`);
    console.log("\n--- Generated Content (plain text) ---");
    console.log(draft.content);
    console.log("--- End ---\n");

    console.log("HUMAN JUDGMENT: Does this sound proactive, respectful, and ask to renegotiate?");
    return true;
  } catch (err) {
    console.error("✗ Test failed:", err);
    return false;
  }
}

async function runAllTests() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║          Step 1: generateDraft() — Fixture Tests              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  const results: boolean[] = [];

  results.push(await testAcknowledgementDraft());
  results.push(await testCompletionDraft());
  results.push(await testRecoveryDraft());
  results.push(await testExtensionRequestDraft());

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log(`║ Results: ${passed}/${total} test scenarios completed                        ║`);
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (passed === total) {
    console.log("\n✓ All tests ran without errors. Review the generated content above.");
    console.log("\nNext: Verify that each draft matches its tone/goal before proceeding to Step 2.");
    process.exit(0);
  } else {
    console.log("\n✗ Some tests failed. Check error messages above.");
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test suite crashed:", err);
  process.exit(1);
});
