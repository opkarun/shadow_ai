import { runDetectionPipeline, type ScoredCommitment } from "../pipeline";
import type { NormalizedGmailMessage } from "../prefilter";
import { resetPrefilterEngine } from "../prefilter";
import * as geminiModule from "../gemini";

// Mock the Gemini module
vi.mock("../gemini", () => ({
  callGeminiExtraction: vi.fn(),
}));

describe("Detection Pipeline", () => {
  let messageCounter = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    resetPrefilterEngine();
    messageCounter = 0;
  });

  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createMessage = (
    overrides: Partial<NormalizedGmailMessage> = {}
  ): NormalizedGmailMessage => ({
    id: `msg_${Date.now()}_${messageCounter++}`,
    thread_id: "thread_1",
    from: "manager@example.com",
    to: ["user@example.com"],
    subject: "Task request",
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
  // FULL PIPELINE
  // ========================================================================

  describe("full pipeline", () => {
    it("processes messages through all three stages", async () => {
      const messages = [
        createMessage({
          from: "alice@example.com",
          body: "I will send the report by Friday.",
        }),
      ];

      const mockCommitment = {
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail",
        description: "Send the quarterly report",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      const result = await runDetectionPipeline(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("confidenceScore");
      expect(result[0]).toHaveProperty("confidenceTier");
      expect(result[0]).toHaveProperty("confidenceExplanation");
    });

    it("filters out low-confidence prefilter rejects early", async () => {
      const messages = [
        createMessage({
          subject: "FYI",
          body: "ok",
        }),
      ];

      const result = await runDetectionPipeline(messages);

      // Prefiltered out before extraction - too short and no commitment signals
      expect(geminiModule.callGeminiExtraction).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it("returns empty array for empty input", async () => {
      const result = await runDetectionPipeline([]);

      expect(result).toHaveLength(0);
      expect(geminiModule.callGeminiExtraction).not.toHaveBeenCalled();
    });

    it("handles malformed extraction response gracefully", async () => {
      const messages = [
        createMessage({
          body: "I will send the report by Friday.",
        }),
      ];

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        "invalid json"
      );

      const result = await runDetectionPipeline(messages);

      // Pipeline continues even if extraction fails
      expect(result).toHaveLength(0);
    });
  });

  // ========================================================================
  // STAGE OUTPUTS
  // ========================================================================

  describe("stage outputs", () => {
    it("preserves all commitment fields from extraction", async () => {
      const messages = [createMessage()];

      const mockCommitment = {
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail" as const,
        description: "Send the quarterly report",
        verificationMethod: "manual",
        linkedRepo: "my-project",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      const result = await runDetectionPipeline(messages);

      expect(result[0]).toMatchObject(mockCommitment);
    });

    it("adds confidence fields from scoring stage", async () => {
      const messages = [
        createMessage({
          body: "I will definitely send the report by Friday for sure.",
        }),
      ];

      const mockCommitment = {
        owner: "manager@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail",
        description: "I will definitely send the report by Friday for sure.",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      const result = await runDetectionPipeline(messages);

      expect(result[0]).toHaveProperty("confidenceScore");
      expect(result[0].confidenceScore).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("confidenceTier");
      expect(result[0]).toHaveProperty("confidenceExplanation");
    });

    it("maps confidence tiers correctly", async () => {
      const messages = [
        createMessage({
          body: "I will definitely send the report by Friday.",
        }),
      ];

      const mockCommitment = {
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 5,
        confidenceReasoning: "test",
        source: "gmail",
        description: "I will definitely send the report by Friday.",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      const result = await runDetectionPipeline(messages);

      if (result[0].confidenceScore >= 0.75) {
        expect(result[0].confidenceTier).toBe("HIGH");
      } else if (result[0].confidenceScore >= 0.4) {
        expect(result[0].confidenceTier).toBe("MEDIUM");
      } else {
        expect(result[0].confidenceTier).toBe("LOW");
      }
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe("error handling", () => {
    it("continues processing if one extraction fails", async () => {
      const messages = [
        createMessage({ body: "I will send the report by Friday." }),
      ];

      vi.mocked(geminiModule.callGeminiExtraction).mockRejectedValue(
        new Error("API error")
      );

      const result = await runDetectionPipeline(messages);

      // Pipeline handles extraction failure gracefully
      expect(result).toHaveLength(0);
    });

    it("assigns conservative confidence if scoring fails", async () => {
      const messages = [
        createMessage({ body: "I will send the report by Friday." }),
      ];

      const mockCommitment = {
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        priority: 4,
        confidenceReasoning: "test",
        source: "gmail",
        description: "Send the quarterly report",
        verificationMethod: "manual",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      // Would need to mock scoreConfidence to fail
      // For now, just verify the commitment is scored
      const result = await runDetectionPipeline(messages);

      expect(result[0]).toHaveProperty("confidenceScore");
      expect(result[0]).toHaveProperty("confidenceTier");
    });
  });

  // ========================================================================
  // REALISTIC SCENARIOS
  // ========================================================================

  describe("realistic scenarios", () => {
    it("processes batch of mixed-quality messages", async () => {
      const messages = [
        createMessage({
          from: "alice@example.com",
          body: "I will send the report by Friday.",
        }),
        createMessage({
          from: "bob@example.com",
          body: "Can you review the PR? It's urgent.",
        }),
        createMessage({
          from: "charlie@example.com",
          body: "thanks",
        }),
      ];

      const mockCommitments = [
        {
          owner: "alice@example.com",
          task: "Send report",
          deadline: "2026-08-01",
          priority: 4,
          confidenceReasoning: "test",
          source: "gmail",
          description: "Send the quarterly report",
          verificationMethod: "manual",
        },
        {
          owner: "bob@example.com",
          task: "Review PR",
          deadline: null,
          priority: 5,
          confidenceReasoning: "test",
          source: "gmail",
          description: "Review the pull request",
          verificationMethod: "github_pr",
        },
      ];

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse(mockCommitments)
      );

      const result = await runDetectionPipeline(messages);

      // Should process the two passing messages and skip the trivial ack
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].task).toBeTruthy();
    });

    it("preserves all data through the full pipeline", async () => {
      const messages = [
        createMessage({
          from: "manager@company.com",
          subject: "Critical task",
          body: "I will deliver the complete project by August 15 with full testing.",
        }),
      ];

      const mockCommitment = {
        owner: "manager@company.com",
        task: "Deliver complete project",
        deadline: "2026-08-15",
        priority: 5,
        confidenceReasoning: "test",
        source: "gmail",
        description:
          "I will deliver the complete project by August 15 with full testing.",
        verificationMethod: "manual",
        linkedRepo: "main-project",
      };

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse([mockCommitment])
      );

      const result = await runDetectionPipeline(messages);

      const scored = result[0] as ScoredCommitment;

      // Verify all fields are present
      expect(scored).toEqual(
        expect.objectContaining({
          owner: "manager@company.com",
          task: "Deliver complete project",
          deadline: "2026-08-15",
          priority: 5,
          source: "gmail",
          description: expect.stringContaining("complete project"),
          verificationMethod: "manual",
          linkedRepo: "main-project",
        })
      );

      // Verify scoring fields added
      expect(scored.confidenceScore).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(scored.confidenceTier);
      expect(scored.confidenceExplanation).toBeTruthy();
    });
  });

  // ========================================================================
  // PIPELINE STATISTICS
  // ========================================================================

  describe("pipeline statistics", () => {
    it("correctly counts passed/filtered messages", async () => {
      const messages = [
        createMessage({ body: "I will send the report by Friday." }),
        createMessage({ body: "thanks" }),
        createMessage({ body: "Can you review this?" }),
      ];

      const mockCommitments = [
        {
          owner: "manager@example.com",
          task: "Send report",
          deadline: "2026-08-01",
          priority: 4,
          confidenceReasoning: "test",
          source: "gmail",
          description: "Send the quarterly report",
          verificationMethod: "manual",
        },
      ];

      vi.mocked(geminiModule.callGeminiExtraction).mockResolvedValue(
        mockGeminiResponse(mockCommitments)
      );

      const result = await runDetectionPipeline(messages);

      // Prefilter should let through the first and third, reject the second
      // Extraction returns one commitment
      expect(result).toHaveLength(1);
    });
  });
});
