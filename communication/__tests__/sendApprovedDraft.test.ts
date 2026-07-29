/**
 * Integration test: sendApprovedDraft() in mock mode
 *
 * Tests that the send flow works correctly, including:
 * - Status update (queued → approved_sent)
 * - Audit entry creation
 * - No actual Gmail send (mock mode)
 *
 * Run with: MOCK_EMAIL_SEND=true npm run test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectMongo, disconnectMongo } from "../../shared/db/connect";
import { CommunicationDraftModel, CommitmentModel, AuditLogEntryModel } from "../../shared/db/models";
import { sendApprovedDraft } from "../approvalQueue";
import { queuedDraftFixture, commitmentAcknowledgement } from "../__fixtures__/sample";
import type { CommunicationDraft, Commitment } from "../../shared/types";

describe("sendApprovedDraft() - Mock Mode Integration Test", () => {
  let testDraftId: string;
  let testCommitmentId: string;
  let testUserId: string = "test-user-123";

  beforeAll(async () => {
    await connectMongo();

    // Insert test commitment
    testCommitmentId = commitmentAcknowledgement.id;
    await CommitmentModel.create(commitmentAcknowledgement);
    console.log(`✓ Test commitment inserted: ${testCommitmentId}`);

    // Verify MOCK_EMAIL_SEND is enabled
    if (process.env.MOCK_EMAIL_SEND !== "true") {
      console.warn("⚠ Warning: MOCK_EMAIL_SEND not set to 'true'. Run with: MOCK_EMAIL_SEND=true");
    } else {
      console.log("✓ Mock email send mode enabled");
    }
  });

  afterAll(async () => {
    // Cleanup
    await CommunicationDraftModel.deleteMany({ id: { $in: [testDraftId] } }).exec();
    await CommitmentModel.deleteOne({ id: testCommitmentId }).exec();
    await AuditLogEntryModel.deleteMany({ commitment_id: testCommitmentId }).exec();
    await disconnectMongo();
  });

  beforeEach(async () => {
    // Insert fixture draft
    const draft = {
      ...queuedDraftFixture,
      id: `draft-send-test-${Date.now()}`,
      commitment_id: testCommitmentId
    };
    testDraftId = draft.id;
    await CommunicationDraftModel.create(draft);
    console.log(`\n✓ Test draft inserted: ${testDraftId}`);
  });

  describe("as-is send (no edits)", () => {
    it("should send draft without modifications and update status to approved_sent", async () => {
      const request = {
        draft_id: testDraftId,
        final_sent_content: queuedDraftFixture.content, // No changes
        approved_by_user_id: testUserId
      };

      const result = await sendApprovedDraft(request);

      expect(result).toBeDefined();
      expect(result.status).toBe("approved_sent");
      expect(result.sent_at).toBeDefined();
      expect(result.final_sent_content).toBe(queuedDraftFixture.content);

      console.log(`✓ Draft sent successfully`);
      console.log(`✓ Status: ${result.status}`);
      console.log(`✓ Sent at: ${result.sent_at?.toISOString()}`);
    });

    it("should create an audit entry with event_type draft_sent", async () => {
      const request = {
        draft_id: testDraftId,
        final_sent_content: queuedDraftFixture.content,
        approved_by_user_id: testUserId
      };

      await sendApprovedDraft(request);

      // Query audit log
      const auditEntries = await AuditLogEntryModel.find({
        commitment_id: testCommitmentId,
        event_type: "draft_sent"
      }).exec();

      expect(auditEntries.length).toBeGreaterThan(0);
      const entry = auditEntries[auditEntries.length - 1]; // Get the most recent

      expect(entry.event_type).toBe("draft_sent");
      expect(entry.before_state).toBeDefined();
      expect(entry.after_state).toBeDefined();
      expect((entry.after_state as any).status).toBe("approved_sent");
      expect((entry.contributing_factors as any).approved_by).toBe(testUserId);
      expect((entry.contributing_factors as any).edited).toBe(false);

      console.log(`✓ Audit entry created`);
      console.log(`✓ Event type: ${entry.event_type}`);
      console.log(`✓ Approved by: ${(entry.contributing_factors as any).approved_by}`);
      console.log(`✓ Edited flag: ${(entry.contributing_factors as any).edited}`);
    });
  });

  describe("edited send", () => {
    it("should send edited draft and update status to edited_sent", async () => {
      const editedContent =
        "Thanks for flagging this, Ananya. I'll review the API design by EOD and get back to you with detailed feedback. Let me know if you have any specific areas you'd like me to focus on.";

      const request = {
        draft_id: testDraftId,
        final_sent_content: editedContent, // Different from original
        approved_by_user_id: testUserId
      };

      const result = await sendApprovedDraft(request);

      expect(result).toBeDefined();
      expect(result.status).toBe("edited_sent");
      expect(result.sent_at).toBeDefined();
      expect(result.final_sent_content).toBe(editedContent);

      console.log(`✓ Edited draft sent successfully`);
      console.log(`✓ Status: ${result.status} (indicates user edited before sending)`);
      console.log(`✓ Original: "${queuedDraftFixture.content.substring(0, 50)}..."`);
      console.log(`✓ Edited:   "${editedContent.substring(0, 50)}..."`);
    });

    it("should flag edited=true in the audit entry", async () => {
      const editedContent = "Different content than original";

      const request = {
        draft_id: testDraftId,
        final_sent_content: editedContent,
        approved_by_user_id: testUserId
      };

      await sendApprovedDraft(request);

      const auditEntries = await AuditLogEntryModel.find({
        commitment_id: testCommitmentId,
        event_type: "draft_sent"
      }).exec();

      const entry = auditEntries[auditEntries.length - 1];
      expect((entry.contributing_factors as any).edited).toBe(true);

      console.log(`✓ Audit entry flags edited=true`);
    });
  });

  describe("audit trail", () => {
    it("should include before_state with original status", async () => {
      const request = {
        draft_id: testDraftId,
        final_sent_content: queuedDraftFixture.content,
        approved_by_user_id: testUserId
      };

      await sendApprovedDraft(request);

      const auditEntries = await AuditLogEntryModel.find({
        commitment_id: testCommitmentId,
        event_type: "draft_sent"
      }).exec();

      const entry = auditEntries[auditEntries.length - 1];
      expect((entry.before_state as any).status).toBe("queued");

      console.log(`✓ Before state: status=${(entry.before_state as any).status}`);
    });

    it("should include after_state with sent status and timestamp", async () => {
      const request = {
        draft_id: testDraftId,
        final_sent_content: queuedDraftFixture.content,
        approved_by_user_id: testUserId
      };

      await sendApprovedDraft(request);

      const auditEntries = await AuditLogEntryModel.find({
        commitment_id: testCommitmentId,
        event_type: "draft_sent"
      }).exec();

      const entry = auditEntries[auditEntries.length - 1];
      expect((entry.after_state as any).status).toBe("approved_sent");
      expect((entry.after_state as any).sent_at).toBeDefined();

      console.log(`✓ After state: status=${(entry.after_state as any).status}`);
      console.log(`✓ After state: sent_at=${(entry.after_state as any).sent_at}`);
    });
  });
});
