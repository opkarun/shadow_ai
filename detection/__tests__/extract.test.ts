import { extractCommitments } from "../extract";
import type { NormalizedGmailMessage } from "../prefilter";
import * as geminiModule from "../gemini";

// Mock the Gemini module
vi.mock("../gemini", () => ({
  callGeminiExtraction: vi.fn(),
}));

describe("Extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createMessage = (
    overrides: Partial<NormalizedGmailMessage> = {}
  ): NormalizedGmailMessage => ({
    id: `msg_${Math.random()}`,
    thread_id: "thread_1",
    from: "manager@example.com",
    to: ["user@example.com"],
    subject: "Task Request",
    body: "Can you send the report by Friday?",
    received_at: new Date(),
    ...overrides,
  });

  const mockGeminiResponse = (commitments: unknown[] = []): string => {
    return JSON.stringify({
      commitments,
      parseErrors: [],
    });
  };

  // ========================================================================
  // BASIC EXTRACTION
  // ========================================================================

  describe("basic extraction", () => {
    it("extracts a single commitment from one message", async () => {
      const msg = createMessage({
        from: "alice@example.com",
        subject: "Report needed",
        body: "Can you send the quarterly report by Friday?",
      });

      const mockCommitment = {
        owner: "alice@example.com",
        task: "Send quarterly report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning:
          "Explicit deadline and clear action verb (send)",
        source: "gmail" as const,
        description: "Alice requests quarterly report by Friday",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      const result = await extractCommitments([msg]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCommitment);
    });

    it("extracts multiple commitments from one message", async () => {
      const msg = createMessage({
        body: "Can you send the report by Friday and review the PR by tomorrow?",
      });

      const mockCommitments = [
        {
          owner: "user@example.com",
          task: "Send report",
          deadline: "2026-08-01",
          priority: 4,
          confidenceReasoning: "Explicit deadline",
          source: "gmail" as const,
          description: "Send report",
          verificationMethod: "manual",
        },
        {
          owner: "user@example.com",
          task: "Review PR",
          deadline: "2026-07-30",
          priority: 4,
          confidenceReasoning: "Explicit deadline (tomorrow)",
          source: "gmail" as const,
          description: "Review pull request",
          verificationMethod: "github_pr",
        },
      ];

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse(mockCommitments)
      );

      const result = await extractCommitments([msg]);

      expect(result).toHaveLength(2);
      expect(result[0].task).toBe("Send report");
      expect(result[1].task).toBe("Review PR");
    });
  });

  // ========================================================================
  // BATCHING
  // ========================================================================

  describe("batching", () => {
    it("batches messages for efficiency", async () => {
      const messages = Array.from({ length: 12 }, (_, i) =>
        createMessage({ id: `msg_${i}` })
      );

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([])
      );

      await extractCommitments(messages);

      // With batch size 5, should make 3 calls: (5, 5, 2)
      expect(geminiModule.callGeminiExtraction).toHaveBeenCalledTimes(3);
    });

    it("respects configured batch size", async () => {
      const messages = Array.from({ length: 7 }, (_, i) =>
        createMessage({ id: `msg_${i}` })
      );

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([])
      );

      await extractCommitments(messages);

      // Should batch into calls (5, 2)
      expect(geminiModule.callGeminiExtraction).toHaveBeenCalledTimes(2);
    });

    it("collects results from all batches", async () => {
      const messages = Array.from({ length: 6 }, (_, i) =>
        createMessage({ id: `msg_${i}` })
      );

      const batch1Commitment = {
        owner: "alice@example.com",
        task: "Task 1",
        deadline: "2026-08-01",
        priority: 3,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "Test",
        verificationMethod: "manual",
      };

      const batch2Commitment = {
        owner: "bob@example.com",
        task: "Task 2",
        deadline: "2026-08-02",
        priority: 3,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "Test",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction)
        .mockResolvedValueOnce(mockGeminiResponse([batch1Commitment]))
        .mockResolvedValueOnce(
          mockGeminiResponse([batch2Commitment])
        );

      const result = await extractCommitments(messages);

      expect(result).toHaveLength(2);
      expect(result[0].owner).toBe("alice@example.com");
      expect(result[1].owner).toBe("bob@example.com");
    });
  });

  // ========================================================================
  // RESPONSE PARSING
  // ========================================================================

  describe("response parsing", () => {
    it("parses valid JSON responses", async () => {
      const msg = createMessage();

      const validCommitment = {
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "test",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([validCommitment])
      );

      const result = await extractCommitments([msg]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validCommitment);
    });

    it("handles empty commitments array", async () => {
      const msg = createMessage();

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([])
      );

      const result = await extractCommitments([msg]);

      expect(result).toHaveLength(0);
    });

    it("skips invalid commitments in array", async () => {
      const msg = createMessage();

      const validCommitment = {
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "test",
        verificationMethod: "manual",
      };

      const invalidCommitment = {
        owner: "bob@example.com",
        // Missing required fields: task, description, source, verificationMethod
      };

      const response = JSON.stringify({
        commitments: [validCommitment, invalidCommitment, validCommitment],
        parseErrors: [],
      });

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        response
      );

      const result = await extractCommitments([msg]);

      // Only valid commitments should be included
      expect(result).toHaveLength(2);
      expect(result[0].owner).toBe("alice@example.com");
      expect(result[1].owner).toBe("alice@example.com");
    });

    it("handles malformed JSON gracefully", async () => {
      const msg = createMessage();

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        "This is not valid JSON"
      );

      const result = await extractCommitments([msg]);

      expect(result).toHaveLength(0);
    });

    it("handles missing commitments array", async () => {
      const msg = createMessage();

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        JSON.stringify({ someOtherField: [] })
      );

      const result = await extractCommitments([msg]);

      expect(result).toHaveLength(0);
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe("error handling", () => {
    it("continues with next batch if one fails", async () => {
      const messages = Array.from({ length: 6 }, (_, i) =>
        createMessage({ id: `msg_${i}` })
      );

      const validCommitment = {
        owner: "alice@example.com",
        task: "Task",
        deadline: "2026-08-01",
        priority: 3,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "test",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction)
        .mockRejectedValueOnce(new Error("API error"))
        .mockResolvedValueOnce(mockGeminiResponse([validCommitment]));

      const result = await extractCommitments(messages);

      // First batch fails, second batch succeeds
      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe("alice@example.com");
    });

    it("handles empty message array", async () => {
      const result = await extractCommitments([]);

      expect(result).toHaveLength(0);
      expect(geminiModule.callGeminiExtraction).not.toHaveBeenCalled();
    });

    it("includes optional fields when present", async () => {
      const msg = createMessage();

      const commitmentWithOptional = {
        owner: "alice@example.com",
        task: "Fix bug in repo",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "test",
        verificationMethod: "github_commit",
        linkedRepo: "my-project",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([commitmentWithOptional])
      );

      const result = await extractCommitments([msg]);

      expect(result[0].linkedRepo).toBe("my-project");
    });
  });

  // ========================================================================
  // FIELD VALIDATION
  // ========================================================================

  describe("field validation", () => {
    it("preserves all extracted fields", async () => {
      const msg = createMessage();

      const fullCommitment = {
        owner: "Manager Name",
        task: "Deliver project",
        deadline: "2026-08-15",
        priority: 5,
        confidenceReasoning:
          "Explicit deadline, clear requester, urgent tone",
        source: "gmail" as const,
        description: "Manager requesting project delivery with specific deadline",
        verificationMethod: "github_release",
        linkedRepo: "main-project",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([fullCommitment])
      );

      const result = await extractCommitments([msg]);

      expect(result[0]).toEqual(fullCommitment);
    });

    it("handles null deadline", async () => {
      const msg = createMessage();

      const commitmentWithoutDeadline = {
        owner: "alice@example.com",
        task: "Review proposal",
        deadline: null,
        priority: 2,
        confidenceReasoning: "Clear task but no explicit deadline",
        source: "gmail" as const,
        description: "Review proposal",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([commitmentWithoutDeadline])
      );

      const result = await extractCommitments([msg]);

      expect(result[0].deadline).toBeNull();
    });
  });

  // ========================================================================
  // INTEGRATION
  // ========================================================================

  describe("integration", () => {
    it("processes realistic multi-message batch", async () => {
      const messages = [
        createMessage({
          from: "alice@example.com",
          subject: "Report",
          body: "Can you send the report by Friday?",
        }),
        createMessage({
          from: "bob@example.com",
          subject: "Code Review",
          body: "Please review the PR before merging. It needs to go out tomorrow.",
        }),
        createMessage({
          from: "charlie@example.com",
          subject: "Meeting",
          body: "Are you available for the team sync next week?",
        }),
      ];

      const extractedCommitments = [
        {
          owner: "alice@example.com",
          task: "Send report",
          deadline: "2026-08-01",
          priority: 4,
          confidenceReasoning: "Explicit deadline",
          source: "gmail" as const,
          description: "Report needed",
          verificationMethod: "manual",
        },
        {
          owner: "bob@example.com",
          task: "Review PR and merge",
          deadline: "2026-07-30",
          priority: 4,
          confidenceReasoning: "Urgent deadline (tomorrow)",
          source: "gmail" as const,
          description: "Code review for PR",
          verificationMethod: "github_pr",
        },
      ];

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse(extractedCommitments)
      );

      const result = await extractCommitments(messages);

      expect(result).toHaveLength(2);
      expect(result[0].task).toBe("Send report");
      expect(result[1].task).toBe("Review PR and merge");
    });
  });
});
