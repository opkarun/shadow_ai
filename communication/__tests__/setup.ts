/**
 * Test setup for Communication module tests
 * Mocks database operations and MongoDB connection
 */

import { vi } from "vitest";

// Mock the shared/db modules
vi.mock("../../shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../shared/db/models", () => {
  const createDraft = (data: any) => Promise.resolve(data);
  const createAuditLog = (data: any) => Promise.resolve(data);

  // Create a factory that returns a mutable draft object with smart behavior
  const createMockDraft = (draftId: string) => {
    // For specific test draft IDs, return different mock behaviors
    if (draftId === "nonexistent_draft") {
      return null; // Draft not found
    }

    if (draftId === "draft_already_sent") {
      return {
        id: draftId,
        commitment_id: "commit_1",
        draft_type: "acknowledgement",
        content: "Already sent content",
        status: "approved_sent", // Not queued
        created_at: new Date(),
        sent_at: new Date(),
        final_sent_content: "Already sent content",
      };
    }

    // For all other draft IDs, return a normal queued draft
    const draft: any = {
      id: draftId || "draft_1",
      commitment_id: "commit_1",
      draft_type: "acknowledgement",
      content: "Original content",
      status: "queued",
      created_at: new Date(),
      sent_at: null,
      final_sent_content: null,
    };

    // Add a save method that updates the draft's state
    draft.save = vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve({
        ...this,
        sent_at: new Date(),
      });
    });

    return draft;
  };

  return {
    CommunicationDraftModel: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            id: "draft_1",
            commitment_id: "commit_1",
            draft_type: "acknowledgement",
            content: "This is a queued draft.",
            status: "queued",
            created_at: new Date(),
            sent_at: null,
            final_sent_content: null,
          },
        ]),
      }),
      findOne: vi.fn().mockImplementation((filter: any) => {
        // Extract draft ID from filter
        const draftId = filter?.id || "draft_1";
        return Promise.resolve(createMockDraft(draftId));
      }),
      create: vi.fn(createDraft),
    },
    CommitmentModel: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { id: "commit_1", user_id: "user_1" },
          { id: "commit_2", user_id: "user_1" },
        ]),
      }),
    },
    AuditLogEntryModel: {
      create: vi.fn(createAuditLog),
    },
  };
});

// Mock Gemini integration
vi.mock("../geminiIntegration", () => ({
  generateDraftContent: vi.fn().mockResolvedValue({
    content: "This is a generated draft message that is long enough to pass validation.",
  }),
}));
