/**
 * Mock test for generateDraft() Step 1 — tests Gemini prompt generation
 * without requiring actual Mongo connection.
 *
 * Run with: npx tsx communication/generateDraft.mock-test.ts
 */

import { GoogleGenAI } from "@google/genai";
import { getEnv } from "../shared/utils/env";
import { logger } from "../shared/utils/logger";
import type { Commitment, Evidence, CommunicationDraftType } from "../shared/types";

interface DraftContext {
  commitment: Commitment;
  evidence: Evidence[];
  prior_thread_context: string[];
  user_name?: string;
  user_email?: string;
  requester_importance?: number;
}

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

// Copy of the core logic from generateDraft.ts, but without Mongo insertion
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

async function generateDraftContent(
  draftType: CommunicationDraftType,
  context: DraftContext
): Promise<string> {
  const { commitment, evidence, prior_thread_context, user_name, user_email } = context;

  const toneGoal = getToneAndGoal(draftType);
  const evidenceSummary = formatEvidence(evidence);
  const priorContext = prior_thread_context.join("\n---\n") || "(no prior context)";

  const prompt = buildPrompt(
    draftType,
    commitment,
    evidenceSummary,
    priorContext,
    toneGoal,
    user_name,
    user_email
  );

  const gemini = new GoogleGenAI({
    apiKey: getEnv("GEMINI_API_KEY")
  });
  const response = await gemini.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

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
    const content = await generateDraftContent("acknowledgement", context);
    console.log("\n✓ Draft generated successfully from Gemini");
    console.log("\n--- Generated Content (plain text) ---");
    console.log(content);
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
    const content = await generateDraftContent("completion", context);
    console.log("\n✓ Draft generated successfully from Gemini");
    console.log("\n--- Generated Content (plain text) ---");
    console.log(content);
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
    const content = await generateDraftContent("recovery", context);
    console.log("\n✓ Draft generated successfully from Gemini");
    console.log("\n--- Generated Content (plain text) ---");
    console.log(content);
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
    const content = await generateDraftContent("extension_request", context);
    console.log("\n✓ Draft generated successfully from Gemini");
    console.log("\n--- Generated Content (plain text) ---");
    console.log(content);
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
  console.log("║   Step 1: generateDraft() — Gemini Content Generation Tests    ║");
  console.log("║                    (Mongo insertion mocked)                    ║");
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
    console.log("\n✓ All Gemini draft generations completed without errors.");
    console.log("✓ Next: Review the generated content above for tone/goal alignment.");
    console.log("✓ Then: Implement Mongo insertion in real generateDraft() and proceed to Step 2.");
  } else {
    console.log("\n✗ Some tests failed. Check error messages above.");
  }
}

runAllTests().catch((err) => {
  console.error("Test suite crashed:", err);
  process.exit(1);
});
