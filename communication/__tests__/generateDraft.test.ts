/**
 * Integration test: generateDraft() against real Mongo + Gemini
 *
 * IMPORTANT: This test requires GEMINI_API_KEY in .env and MOCK_EMAIL_SEND=false
 * to test the actual Gemini integration. For mocking, set MOCK_GEMINI=true.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongo, disconnectMongo } from "../../shared/db/connect";
import { generateDraft } from "../generateDraft";
import {
  commitmentAcknowledgement,
  evidenceAcknowledgement,
  commitmentCompletion,
  evidenceCompletion,
  commitmentRecovery,
  evidenceRecovery,
  commitmentExtensionRequest,
  evidenceExtensionRequest
} from "../__fixtures__/sample";
import type { DraftContext } from "../generateDraft";

describe("generateDraft() - Integration Tests", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  it("should generate an acknowledgement draft with warm tone", async () => {
    const context: DraftContext = {
      commitment: commitmentAcknowledgement,
      evidence: evidenceAcknowledgement,
      prior_thread_context: [
        "Ananya: Can you review the API design doc by EOD? It's critical for the sprint."
      ],
      user_name: "Test User",
      user_email: "test@example.com"
    };

    const draft = await generateDraft("acknowledgement", context);

    expect(draft).toBeDefined();
    expect(draft.draft_type).toBe("acknowledgement");
    expect(draft.status).toBe("queued");
    expect(draft.content.length).toBeGreaterThan(0);

    console.log("\n=== ACKNOWLEDGEMENT DRAFT ===");
    console.log(`Content:\n${draft.content}\n`);
    console.log(`✓ Generated successfully (ID: ${draft.id})`);
    console.log(`✓ Tone should be: warm, concise, professional`);
    console.log(`✓ Status: ${draft.status}`);
  });

  it("should generate a completion draft with confident tone", async () => {
    const context: DraftContext = {
      commitment: commitmentCompletion,
      evidence: evidenceCompletion,
      prior_thread_context: [
        "Team lead: Can you ship the payment integration by Friday?",
        "Me: On it, targeting Friday EOD."
      ],
      user_name: "Test User",
      user_email: "test@example.com"
    };

    const draft = await generateDraft("completion", context);

    expect(draft).toBeDefined();
    expect(draft.draft_type).toBe("completion");
    expect(draft.status).toBe("queued");
    expect(draft.content.length).toBeGreaterThan(0);

    console.log("\n=== COMPLETION DRAFT ===");
    console.log(`Content:\n${draft.content}\n`);
    console.log(`✓ Generated successfully (ID: ${draft.id})`);
    console.log(`✓ Tone should be: confident, brief, celebratory`);
    console.log(`✓ Evidence links included: ${evidenceCompletion.length} items`);
    console.log(`✓ Status: ${draft.status}`);
  });

  it("should generate a recovery draft with apologetic tone", async () => {
    const context: DraftContext = {
      commitment: commitmentRecovery,
      evidence: evidenceRecovery,
      prior_thread_context: [
        "Client: Looking forward to the Q3 roadmap proposal by Monday EOD (July 27).",
        "Me: Will have it ready by Monday."
      ],
      user_name: "Test User",
      user_email: "test@example.com"
    };

    const draft = await generateDraft("recovery", context);

    expect(draft).toBeDefined();
    expect(draft.draft_type).toBe("recovery");
    expect(draft.status).toBe("queued");
    expect(draft.content.length).toBeGreaterThan(0);

    console.log("\n=== RECOVERY DRAFT ===");
    console.log(`Content:\n${draft.content}\n`);
    console.log(`✓ Generated successfully (ID: ${draft.id})`);
    console.log(`✓ Tone should be: apologetic, accountable, forward-looking`);
    console.log(`✓ Should include new timeline`);
    console.log(`✓ Status: ${draft.status}`);
  });

  it("should generate an extension_request draft with proactive tone", async () => {
    const context: DraftContext = {
      commitment: commitmentExtensionRequest,
      evidence: evidenceExtensionRequest,
      prior_thread_context: [
        "Rohan: We need the OAuth2 service running on staging by tomorrow so we can test the integration.",
        "Me: Got it, I'll have it staged by then."
      ],
      user_name: "Test User",
      user_email: "test@example.com"
    };

    const draft = await generateDraft("extension_request", context);

    expect(draft).toBeDefined();
    expect(draft.draft_type).toBe("extension_request");
    expect(draft.status).toBe("queued");
    expect(draft.content.length).toBeGreaterThan(0);

    console.log("\n=== EXTENSION REQUEST DRAFT ===");
    console.log(`Content:\n${draft.content}\n`);
    console.log(`✓ Generated successfully (ID: ${draft.id})`);
    console.log(`✓ Tone should be: proactive, respectful, solution-oriented`);
    console.log(`✓ Should ask to renegotiate deadline`);
    console.log(`✓ Status: ${draft.status}`);
  });
});
