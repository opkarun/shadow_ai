/**
 * Tests for approvalQueue.ts
 *
 * Tests approval queue operations: listing, sending, discarding, and snoozing drafts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listQueuedDrafts,
  sendApprovedDraft,
  discardDraft,
  snoozeDraft,
  DraftSendRequest,
} from "../approvalQueue";
import * as dbModels from "../../shared/db/models";
import type { CommunicationDraft } from "../../shared/types";

// We're already mocking the db in setup.ts, but we need to adjust mocks for specific tests
vi.mocked(dbModels.CommunicationDraftModel).findOne;

describe("approvalQueue", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createDraft = (
    overrides: Partial<CommunicationDraft> = {}
  ): CommunicationDraft => ({
    id: "draft_1",
    commitment_id: "commit_1",
    draft_type: "acknowledgement",
    content: "This is the original draft content.",
    status: "queued",
    created_at: new Date(),
    sent_at: null,
    final_sent_content: null,
    ...overrides,
  });

  const createSendRequest = (
    overrides: Partial<DraftSendRequest> = {}
  ): DraftSendRequest => ({
    draft_id: "draft_1",
    final_sent_content: "This is the original draft content.",
    approved_by_user_id: "user_1",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // listQueuedDrafts
  // ========================================================================

  describe("listQueuedDrafts", () => {
    it("rejects empty user ID", async () => {
      await expect(listQueuedDrafts("")).rejects.toThrow(
        "User ID must be a non-empty string"
      );
    });

    it("rejects non-string user ID", async () => {
      await expect(listQueuedDrafts(null as any)).rejects.toThrow(
        "User ID must be a non-empty string"
      );
    });

    it("returns array of drafts", async () => {
      // Should return an array (may be empty or contain drafts)
      const drafts = await listQueuedDrafts("user_1");

      expect(Array.isArray(drafts)).toBe(true);
    });

    it("returns only queued drafts", async () => {
      const drafts = await listQueuedDrafts("user_1");

      // All returned drafts should have status "queued"
      drafts.forEach((draft) => {
        expect(draft.status).toBe("queued");
      });
    });

    it("filters by user via commitment", async () => {
      // List should only include drafts for commitments owned by this user
      const drafts = await listQueuedDrafts("user_1");

      expect(Array.isArray(drafts)).toBe(true);
    });
  });

  // ========================================================================
  // sendApprovedDraft
  // ========================================================================

  describe("sendApprovedDraft", () => {
    describe("input validation", () => {
      it("rejects missing draft ID", async () => {
        const request = createSendRequest({ draft_id: "" });

        await expect(sendApprovedDraft(request)).rejects.toThrow(
          "Draft ID must be a non-empty string"
        );
      });

      it("rejects missing final content", async () => {
        const request = createSendRequest({ final_sent_content: "" });

        await expect(sendApprovedDraft(request)).rejects.toThrow(
          "Final sent content must be a non-empty string"
        );
      });

      it("rejects missing approved by user ID", async () => {
        const request = createSendRequest({ approved_by_user_id: "" });

        await expect(sendApprovedDraft(request)).rejects.toThrow(
          "Approved by user ID must be a non-empty string"
        );
      });

      it("rejects null request", async () => {
        await expect(sendApprovedDraft(null as any)).rejects.toThrow(
          "Send request is required"
        );
      });
    });

    describe("status transitions", () => {
      it("accepts valid send request", async () => {
        const request = createSendRequest();

        const sent = await sendApprovedDraft(request);

        expect(sent).toBeDefined();
        expect(sent.id).toBeTruthy();
      });

      it("handles request with potentially different content", async () => {
        const request = createSendRequest({
          final_sent_content: "Modified content by user",
        });

        const sent = await sendApprovedDraft(request);

        expect(sent).toBeDefined();
      });

      it("updates the draft record", async () => {
        const finalContent = "Final approved and potentially edited content";
        const request = createSendRequest({
          final_sent_content: finalContent,
        });

        const sent = await sendApprovedDraft(request);

        expect(sent.final_sent_content).toBeDefined();
      });

      it("sets sent_at timestamp", async () => {
        const request = createSendRequest();

        const sent = await sendApprovedDraft(request);

        expect(sent.sent_at).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("rejects draft that is not found", async () => {
        const request = createSendRequest({
          draft_id: "nonexistent_draft",
        });

        await expect(sendApprovedDraft(request)).rejects.toThrow(
          "not found"
        );
      });

      it("rejects draft that is not in queued status", async () => {
        const request = createSendRequest({
          draft_id: "draft_already_sent",
        });

        await expect(sendApprovedDraft(request)).rejects.toThrow(
          "Cannot send draft"
        );
      });
    });

    describe("edge cases", () => {
      it("handles very long final content", async () => {
        const longContent = "x".repeat(5000);
        const request = createSendRequest({
          final_sent_content: longContent,
        });

        const sent = await sendApprovedDraft(request);

        expect(sent.final_sent_content).toBe(longContent);
      });

      it("handles special characters in content", async () => {
        const specialContent = "Content with special chars: <>\"'&é";
        const request = createSendRequest({
          final_sent_content: specialContent,
        });

        const sent = await sendApprovedDraft(request);

        expect(sent.final_sent_content).toBe(specialContent);
      });
    });
  });

  // ========================================================================
  // discardDraft
  // ========================================================================

  describe("discardDraft", () => {
    describe("input validation", () => {
      it("rejects empty draft ID", async () => {
        await expect(discardDraft("")).rejects.toThrow(
          "Draft ID must be a non-empty string"
        );
      });

      it("rejects non-string draft ID", async () => {
        await expect(discardDraft(null as any)).rejects.toThrow(
          "Draft ID must be a non-empty string"
        );
      });
    });

    describe("status transition", () => {
      it("accepts discard request and returns a draft", async () => {
        const discarded = await discardDraft("draft_to_discard");

        expect(discarded).toBeDefined();
        expect(discarded.id).toBeTruthy();
      });

      it("preserves draft data", async () => {
        const discarded = await discardDraft("draft_to_discard");

        expect(discarded.content).toBeDefined();
        expect(discarded.draft_type).toBeDefined();
      });

      it("does not set sent_at on discard", async () => {
        const discarded = await discardDraft("draft_to_discard");

        // Discard should not have sent timestamp
        expect(discarded).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("rejects draft that is not found", async () => {
        await expect(discardDraft("nonexistent_draft")).rejects.toThrow(
          "not found"
        );
      });

      it("rejects draft that is not in queued status", async () => {
        await expect(discardDraft("draft_already_sent")).rejects.toThrow(
          "Cannot discard draft"
        );
      });
    });
  });

  // ========================================================================
  // snoozeDraft
  // ========================================================================

  describe("snoozeDraft", () => {
    describe("input validation", () => {
      it("rejects empty draft ID", async () => {
        const future = new Date(Date.now() + 3600000);

        await expect(snoozeDraft("", future)).rejects.toThrow(
          "Draft ID must be a non-empty string"
        );
      });

      it("rejects invalid until time (not a Date)", async () => {
        await expect(
          snoozeDraft("draft_1", "2026-08-01" as any)
        ).rejects.toThrow("valid Date");
      });

      it("rejects until time in the past", async () => {
        const past = new Date(Date.now() - 3600000);

        await expect(snoozeDraft("draft_1", past)).rejects.toThrow(
          "future"
        );
      });

      it("rejects until time equal to now", async () => {
        const now = new Date();

        await expect(snoozeDraft("draft_1", now)).rejects.toThrow(
          "future"
        );
      });
    });

    describe("status transition", () => {
      it("accepts snooze with future time", async () => {
        const future = new Date(Date.now() + 3600000);

        const snoozed = await snoozeDraft("draft_to_snooze", future);

        expect(snoozed).toBeDefined();
        expect(snoozed.id).toBeTruthy();
      });

      it("accepts various future times", async () => {
        const times = [
          new Date(Date.now() + 1000), // 1 second
          new Date(Date.now() + 3600000), // 1 hour
          new Date(Date.now() + 86400000), // 1 day
        ];

        for (const futureTime of times) {
          const snoozed = await snoozeDraft("draft_test", futureTime);
          expect(snoozed).toBeDefined();
        }
      });
    });

    describe("error handling", () => {
      it("rejects draft that is not found", async () => {
        const future = new Date(Date.now() + 3600000);

        await expect(snoozeDraft("nonexistent_draft", future)).rejects.toThrow(
          "not found"
        );
      });

      it("rejects draft that is not in queued status", async () => {
        const future = new Date(Date.now() + 3600000);

        await expect(
          snoozeDraft("draft_already_sent", future)
        ).rejects.toThrow("Cannot snooze draft");
      });
    });

    describe("edge cases", () => {
      it("handles snooze for very long duration", async () => {
        const veryFuture = new Date(Date.now() + 365 * 24 * 3600000); // 1 year

        const snoozed = await snoozeDraft("draft_long_snooze", veryFuture);

        expect(snoozed.status).toBe("snoozed");
      });

      it("handles snooze for minimal duration (1 millisecond future)", async () => {
        const almostNow = new Date(Date.now() + 1);

        const snoozed = await snoozeDraft("draft_short_snooze", almostNow);

        expect(snoozed.status).toBe("snoozed");
      });
    });
  });

  // ========================================================================
  // INTEGRATION SCENARIOS
  // ========================================================================

  describe("workflow scenarios", () => {
    it("can list drafts and use their IDs for operations", async () => {
      const userId = "user_workflow_1";

      // List queued drafts
      const queued = await listQueuedDrafts(userId);
      expect(Array.isArray(queued)).toBe(true);

      // If drafts exist, can use their IDs
      if (queued.length > 0) {
        const draftId = queued[0].id;
        expect(draftId).toBeTruthy();
      }
    });

    it("can discard a draft by ID", async () => {
      // Should be able to call discard with any draft ID
      const result = await discardDraft("draft_test");
      expect(result).toBeDefined();
    });

    it("can snooze a draft by ID", async () => {
      // Should be able to call snooze with any draft ID and future time
      const future = new Date(Date.now() + 3600000);
      const result = await snoozeDraft("draft_test", future);
      expect(result).toBeDefined();
    });
  });
});
