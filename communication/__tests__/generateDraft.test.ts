/**
 * Tests for generateDraft.ts
 *
 * Tests draft generation orchestration, Gemini integration, database persistence,
 * and all four draft types.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateDraft, DraftContext } from "../generateDraft";
import * as geminiModule from "../geminiIntegration";
import type { Commitment, Evidence } from "../../shared/types";

// Mock Gemini integration
vi.mock("../geminiIntegration");

describe("generateDraft", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createCommitment = (
    overrides: Partial<Commitment> = {}
  ): Commitment => ({
    id: "commit_1",
    user_id: "user_1",
    title: "Send report",
    description: "Send the quarterly report",
    requester: "manager@example.com",
    source: "gmail",
    source_reference: "msg_123",
    deadline: new Date("2026-08-01"),
    status: "CONFIRMED",
    confidence_score: 0.85,
    priority_score: 4,
    verification_method: "manual",
    linked_repo: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const createContext = (
    overrides: Partial<DraftContext> = {}
  ): DraftContext => ({
    commitment: createCommitment(),
    evidence: [],
    prior_thread_context: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(geminiModule.generateDraftContent).mockClear();
  });

  // ========================================================================
  // INPUT VALIDATION
  // ========================================================================

  describe("input validation", () => {
    it("rejects missing commitment", async () => {
      const context = createContext();
      context.commitment = undefined as any;

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Commitment is required"
      );
    });

    it("rejects commitment without id", async () => {
      const context = createContext({
        commitment: createCommitment({ id: "" }),
      });

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Commitment must have an ID"
      );
    });

    it("rejects commitment without user_id", async () => {
      const context = createContext({
        commitment: createCommitment({ user_id: "" }),
      });

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Commitment must have a user_id"
      );
    });

    it("rejects commitment without title", async () => {
      const context = createContext({
        commitment: createCommitment({ title: "" }),
      });

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Commitment must have a title"
      );
    });

    it("rejects commitment without description", async () => {
      const context = createContext({
        commitment: createCommitment({ description: "" }),
      });

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Commitment must have a description"
      );
    });

    it("rejects commitment without requester", async () => {
      const context = createContext({
        commitment: createCommitment({ requester: "" }),
      });

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Commitment must have a requester"
      );
    });

    it("rejects non-array evidence", async () => {
      const context = createContext();
      context.evidence = "not an array" as any;

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Evidence must be an array"
      );
    });

    it("rejects non-array prior thread context", async () => {
      const context = createContext();
      context.prior_thread_context = "not an array" as any;

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Prior thread context must be an array"
      );
    });

    it("rejects invalid draft type", async () => {
      const context = createContext();

      await expect(
        generateDraft("invalid_type" as any, context)
      ).rejects.toThrow("Invalid draft type");
    });
  });

  // ========================================================================
  // SUCCESSFUL DRAFT GENERATION - ALL FOUR TYPES
  // ========================================================================

  describe("successful draft generation", () => {
    beforeEach(() => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This is a generated draft message that is long enough to pass validation requirements.",
      });
    });

    it("generates acknowledgement draft", async () => {
      const context = createContext();

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
      expect(draft.id).toBeTruthy();
      expect(draft.commitment_id).toBe("commit_1");
      expect(draft.draft_type).toBe("acknowledgement");
      expect(draft.content).toBe(
        "This is a generated draft message that is long enough to pass validation requirements."
      );
      expect(draft.status).toBe("queued");
      expect(draft.created_at).toBeDefined();
      expect(draft.sent_at).toBeNull();
      expect(draft.final_sent_content).toBeNull();
    });

    it("generates completion draft", async () => {
      const context = createContext();

      const draft = await generateDraft("completion", context);

      expect(draft.draft_type).toBe("completion");
      expect(draft.status).toBe("queued");
    });

    it("generates recovery draft", async () => {
      const context = createContext();

      const draft = await generateDraft("recovery", context);

      expect(draft.draft_type).toBe("recovery");
      expect(draft.status).toBe("queued");
    });

    it("generates extension_request draft", async () => {
      const context = createContext();

      const draft = await generateDraft("extension_request", context);

      expect(draft.draft_type).toBe("extension_request");
      expect(draft.status).toBe("queued");
    });

    it("includes evidence in context when present", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This is a completion draft with evidence included and is long enough to pass validation.",
      });

      const evidence: Evidence[] = [
        {
          id: "ev_1",
          commitment_id: "commit_1",
          evidence_type: "github_commit",
          evidence_reference: "abc123def456",
          match_confidence: 0.95,
          detected_at: new Date(),
        },
      ];

      const context = createContext({ evidence });

      const draft = await generateDraft("completion", context);

      expect(draft).toBeDefined();
      expect(draft.status).toBe("queued");
    });

    it("includes prior thread context when present", async () => {
      const prior = [
        "Manager: Can you send the report?",
        "User: Sure, I'll send it by Friday.",
      ];

      const context = createContext({ prior_thread_context: prior });

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
      expect(draft.status).toBe("queued");
    });
  });

  // ========================================================================
  // GEMINI FAILURE HANDLING
  // ========================================================================

  describe("Gemini API failure handling", () => {
    it("propagates Gemini API errors", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockRejectedValue(
        new Error("Gemini API rate limit exceeded")
      );

      const context = createContext();

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "Gemini API rate limit exceeded"
      );
    });

    it("handles empty Gemini response", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "",
      });

      const context = createContext();

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "non-empty string"
      );
    });

    it("rejects content that is too short", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "x",
      });

      const context = createContext();

      await expect(generateDraft("acknowledgement", context)).rejects.toThrow(
        "too short"
      );
    });

    it("warns but accepts content exceeding max length", async () => {
      const longContent = "x".repeat(2500);
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: longContent,
      });

      const context = createContext();

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
      expect(draft.content.length).toBeGreaterThan(2000);
    });
  });

  // ========================================================================
  // DATABASE PERSISTENCE
  // ========================================================================

  describe("database persistence", () => {
    beforeEach(() => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This is generated draft content that is long enough to pass validation.",
      });
    });

    it("creates a draft record with correct fields", async () => {
      const context = createContext();

      const draft = await generateDraft("acknowledgement", context);

      expect(draft.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      ); // UUID format
      expect(draft.commitment_id).toBe(context.commitment.id);
      expect(draft.draft_type).toBe("acknowledgement");
      expect(draft.status).toBe("queued");
    });

    it("sets created_at to current time", async () => {
      const before = new Date();
      const context = createContext();

      const draft = await generateDraft("acknowledgement", context);

      const after = new Date();
      expect(draft.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(draft.created_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("initializes sent_at as null", async () => {
      const context = createContext();

      const draft = await generateDraft("acknowledgement", context);

      expect(draft.sent_at).toBeNull();
    });

    it("initializes final_sent_content as null", async () => {
      const context = createContext();

      const draft = await generateDraft("acknowledgement", context);

      expect(draft.final_sent_content).toBeNull();
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe("edge cases", () => {
    it("handles commitment with null deadline", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "Draft for commitment with no deadline specified in the system.",
      });

      const context = createContext({
        commitment: createCommitment({ deadline: null }),
      });

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
      expect(draft.status).toBe("queued");
    });

    it("handles very long commitment title", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This draft handles a very long commitment title and is long enough.",
      });

      const longTitle = "x".repeat(500);
      const context = createContext({
        commitment: createCommitment({ title: longTitle }),
      });

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
    });

    it("handles special characters in requester name", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This draft handles special characters in the requester name properly.",
      });

      const context = createContext({
        commitment: createCommitment({
          requester: "manager+tag@example.com (John O'Brien)",
        }),
      });

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
    });

    it("handles empty evidence array", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This completion draft was created without any evidence present.",
      });

      const context = createContext({
        evidence: [],
      });

      const draft = await generateDraft("completion", context);

      expect(draft).toBeDefined();
    });

    it("handles empty prior thread context", async () => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This draft was created without any prior thread context information.",
      });

      const context = createContext({
        prior_thread_context: [],
      });

      const draft = await generateDraft("acknowledgement", context);

      expect(draft).toBeDefined();
    });
  });

  // ========================================================================
  // DRAFT TYPES
  // ========================================================================

  describe("draft type specifics", () => {
    beforeEach(() => {
      vi.mocked(geminiModule.generateDraftContent).mockResolvedValue({
        content: "This is type-specific draft content that is long enough to pass validation.",
      });
    });

    const draftTypes = [
      "acknowledgement",
      "completion",
      "recovery",
      "extension_request",
    ] as const;

    draftTypes.forEach((draftType) => {
      it(`${draftType} draft has correct type`, async () => {
        const context = createContext();

        const draft = await generateDraft(draftType, context);

        expect(draft.draft_type).toBe(draftType);
      });
    });
  });
});
