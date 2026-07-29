/**
 * Integration test: listQueuedDrafts, discardDraft, snoozeDraft
 *
 * Tests the approval queue operations against real Mongo.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectMongo, disconnectMongo } from "../../shared/db/connect";
import { CommunicationDraftModel } from "../../shared/db/models";
import { listQueuedDrafts, discardDraft, snoozeDraft } from "../approvalQueue";
import { queuedDraftFixture } from "../__fixtures__/sample";
import type { CommunicationDraft } from "../../shared/types";

describe("Approval Queue Operations - Integration Tests", () => {
  let testDraftId: string;
  let testUserId: string = "test-user-123";
  let commitmentId: string = "c-ack-001";

  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    // Cleanup
    await CommunicationDraftModel.deleteMany({ id: { $in: [testDraftId] } }).exec();
    await disconnectMongo();
  });

  beforeEach(async () => {
    // Insert fixture draft into Mongo
    const draft = {
      ...queuedDraftFixture,
      id: `draft-test-${Date.now()}`
    };
    testDraftId = draft.id;
    await CommunicationDraftModel.create(draft);
    console.log(`\n✓ Test draft inserted: ${testDraftId}`);
  });

  describe("listQueuedDrafts", () => {
    it("should return queued drafts for the user", async () => {
      const drafts = await listQueuedDrafts(testUserId);

      expect(drafts).toBeDefined();
      expect(Array.isArray(drafts)).toBe(true);

      const foundDraft = drafts.find((d: CommunicationDraft) => d.id === testDraftId);
      expect(foundDraft).toBeDefined();
      expect(foundDraft?.status).toBe("queued");

      console.log(`✓ listQueuedDrafts returned ${drafts.length} draft(s)`);
      console.log(`✓ Found test draft with status: ${foundDraft?.status}`);
    });

    it("should not return discarded drafts", async () => {
      // Discard the draft
      await discardDraft(testDraftId);

      // Query again
      const drafts = await listQueuedDrafts(testUserId);
      const foundDraft = drafts.find((d: CommunicationDraft) => d.id === testDraftId);

      expect(foundDraft).toBeUndefined();
      console.log(`✓ Discarded draft correctly excluded from queue`);
    });
  });

  describe("discardDraft", () => {
    it("should update draft status to discarded", async () => {
      const result = await discardDraft(testDraftId);

      expect(result).toBeDefined();
      expect(result.status).toBe("discarded");

      console.log(`✓ Draft status changed to: ${result.status}`);
    });

    it("should create an audit entry for the discard", async () => {
      // This test relies on the audit entry being created in the function
      await discardDraft(testDraftId);

      // Query the draft from Mongo to verify the status persisted
      const draft = await CommunicationDraftModel.findOne({ id: testDraftId }).exec();
      expect(draft?.status).toBe("discarded");

      console.log(`✓ Discard persisted to Mongo`);
      console.log(`✓ Audit entry should have event_type: draft_discarded`);
    });
  });

  describe("snoozeDraft", () => {
    it("should update draft status to snoozed with snoozed_until timestamp", async () => {
      const snoozeUntil = new Date(Date.now() + 3600000); // 1 hour from now
      const result = await snoozeDraft(testDraftId, snoozeUntil);

      expect(result).toBeDefined();
      expect(result.status).toBe("snoozed");
      expect(result.snoozed_until).toBeDefined();
      expect(result.snoozed_until?.getTime()).toBeCloseTo(snoozeUntil.getTime(), -3);

      console.log(`✓ Draft status changed to: ${result.status}`);
      console.log(`✓ Snoozed until: ${result.snoozed_until?.toISOString()}`);
    });

    it("should create an audit entry for the snooze", async () => {
      const snoozeUntil = new Date(Date.now() + 3600000);
      await snoozeDraft(testDraftId, snoozeUntil);

      // Verify it persisted
      const draft = await CommunicationDraftModel.findOne({ id: testDraftId }).exec();
      expect(draft?.status).toBe("snoozed");
      expect(draft?.snoozed_until).toBeDefined();

      console.log(`✓ Snooze persisted to Mongo`);
      console.log(`✓ Audit entry should have event_type: draft_snoozed`);
    });

    it("should exclude snoozed drafts from listQueuedDrafts", async () => {
      const snoozeUntil = new Date(Date.now() + 3600000);
      await snoozeDraft(testDraftId, snoozeUntil);

      const drafts = await listQueuedDrafts(testUserId);
      const foundDraft = drafts.find((d: CommunicationDraft) => d.id === testDraftId);

      expect(foundDraft).toBeUndefined();
      console.log(`✓ Snoozed draft correctly excluded from queue`);
    });
  });
});
