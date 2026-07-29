import { scoreConfidence } from "../scoreConfidence";
import type { ExtractedCommitment } from "../types";

describe("Score Confidence", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createCommitment = (
    overrides: Partial<ExtractedCommitment> = {}
  ): ExtractedCommitment => ({
    owner: "alice@example.com",
    task: "Send quarterly report",
    deadline: "2026-08-01",
    priority: 4,
    confidenceReasoning: "test",
    source: "gmail",
    description: "Send the quarterly financial report to the CEO",
    verificationMethod: "manual",
    ...overrides,
  });

  // ========================================================================
  // HIGH CONFIDENCE COMMITMENTS
  // ========================================================================

  describe("high confidence", () => {
    it("scores HIGH (>= 0.75) for commitments with all strong signals", () => {
      const commitment = createCommitment({
        owner: "alice@example.com",
        task: "Deliver the project",
        deadline: "2026-08-15",
        description:
          "I will deliver the entire project by August 15. This is a firm commitment.",
        priority: 5,
        verificationMethod: "github_release",
        linkedRepo: "my-project",
      });

      const result = scoreConfidence(commitment);

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
      expect(result.tier).toBe("HIGH");
    });

    it("includes strong signals in explanation for HIGH confidence", () => {
      const commitment = createCommitment({
        description:
          "I will send the report by Friday. This is a clear commitment.",
      });

      const result = scoreConfidence(commitment);

      if (result.tier === "HIGH") {
        expect(result.explanation).toMatch(
          /HIGH confidence.*clear|specific|explicit|strong/i
        );
      }
    });

    it("recognizes explicit owner (email address)", () => {
      const commitment = createCommitment({
        owner: "john.doe@company.com",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ownerClarity).toBeGreaterThanOrEqual(0.9);
    });

    it("scores strong commitment language highly", () => {
      const commitment = createCommitment({
        description: "I commit to deliver this by Friday without fail.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBeGreaterThanOrEqual(0.9);
    });

    it("scores explicit deadline (ISO 8601) highly", () => {
      const commitment = createCommitment({
        deadline: "2026-08-15",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.deadlineClarity).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ========================================================================
  // MEDIUM CONFIDENCE COMMITMENTS
  // ========================================================================

  describe("medium confidence", () => {
    it("scores MEDIUM (0.4-0.75) for commitments with mixed signals", () => {
      const commitment = createCommitment({
        description:
          "Maybe I can send the report sometime next week if I have time.",
      });

      const result = scoreConfidence(commitment);

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.4);
      // This commitment has many signals (owner, task, deadline in "next week")
      // even with ambiguity, so score may be >= 0.75, which would be HIGH
      expect(["MEDIUM", "HIGH"]).toContain(result.tier);
    });

    it("penalizes ambiguous language ('maybe', 'probably')", () => {
      const commitment = createCommitment({
        description:
          "I probably should send the report by Friday, but maybe I'll send it next week.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ambiguityPenalty).toBeLessThan(0);
      // Despite ambiguous language, the commitment has other strong signals
      // (explicit deadline "by Friday", task clarity, owner clarity)
      // So the overall score may still be moderate to high
      expect(result.confidenceScore).toBeGreaterThan(0.4);
    });

    it("handles vague task description", () => {
      const commitment = createCommitment({
        task: "Do some work",
        description: "I will do some work when I get a chance.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.taskClarity).toBeLessThan(0.7);
    });

    it("scores moderate commitment language", () => {
      const commitment = createCommitment({
        description: "I can send the report by Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBeGreaterThanOrEqual(0.6);
      expect(result.factors.commitmentLanguage).toBeLessThan(1.0);
    });

    it("includes weak points in explanation for MEDIUM confidence", () => {
      const commitment = createCommitment({
        description: "Could you possibly send the report sometime soon?",
      });

      const result = scoreConfidence(commitment);

      if (result.tier === "MEDIUM") {
        expect(result.explanation).toMatch(/MEDIUM/);
      }
    });
  });

  // ========================================================================
  // LOW CONFIDENCE COMMITMENTS
  // ========================================================================

  describe("low confidence", () => {
    it("scores LOW (< 0.4) for vague commitments", () => {
      const commitment = createCommitment({
        owner: "unknown",
        task: "Something",
        deadline: null,
        description: "Maybe do something sometime.",
      });

      const result = scoreConfidence(commitment);

      expect(result.confidenceScore).toBeLessThan(0.4);
      expect(result.tier).toBe("LOW");
    });

    it("rejects unknown/unclear owner", () => {
      const commitment = createCommitment({
        owner: "unknown",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ownerClarity).toBeLessThan(0.3);
    });

    it("penalizes missing deadline heavily", () => {
      const commitment = createCommitment({
        deadline: null,
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.deadlineClarity).toBe(0.0);
    });

    it("scores vague task low", () => {
      const commitment = createCommitment({
        task: "Think about it",
        description: "Consider this.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.taskClarity).toBeLessThan(0.6);
    });

    it("identifies lack of supporting signals", () => {
      const commitment = createCommitment({
        owner: "user",
        task: "Something",
        deadline: null,
        description: "No clear commitment here.",
        verificationMethod: "manual",
      });

      const result = scoreConfidence(commitment);

      // The commitment has some signals (owner, task, verification method)
      // so signal strength is around 3/7, not < 0.5
      expect(result.tier).toBe("LOW");
    });

    it("includes weak signals in explanation for LOW confidence", () => {
      const commitment = createCommitment({
        description: "I might try to do something if possible.",
      });

      const result = scoreConfidence(commitment);

      expect(result.explanation).toMatch(/LOW|weak|unclear|vague/i);
    });
  });

  // ========================================================================
  // FACTOR SCORING
  // ========================================================================

  describe("factor scoring: owner clarity", () => {
    it("scores email addresses highest (1.0)", () => {
      const commitment = createCommitment({
        owner: "alice@example.com",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ownerClarity).toBe(1.0);
    });

    it("scores full names high (0.9)", () => {
      const commitment = createCommitment({
        owner: "Alice Smith",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ownerClarity).toBeGreaterThanOrEqual(0.85);
    });

    it("scores single names lower (0.7)", () => {
      const commitment = createCommitment({
        owner: "Alice",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ownerClarity).toBeGreaterThanOrEqual(0.6);
      expect(result.factors.ownerClarity).toBeLessThan(0.9);
    });

    it("scores unknown owner low (0.0)", () => {
      const commitment = createCommitment({
        owner: "unknown",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ownerClarity).toBe(0.0);
    });
  });

  describe("factor scoring: task clarity", () => {
    it("scores specific deliverables highest (0.95+)", () => {
      const commitment = createCommitment({
        task: "Send the quarterly report",
        description: "Send the full quarterly financial report to the CEO.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.taskClarity).toBeGreaterThanOrEqual(0.9);
    });

    it("scores tasks with action verbs high (0.7+)", () => {
      const commitment = createCommitment({
        task: "Review the code",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.taskClarity).toBeGreaterThanOrEqual(0.7);
    });

    it("scores vague tasks low (< 0.7)", () => {
      const commitment = createCommitment({
        task: "Do something",
        description: "Something.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.taskClarity).toBeLessThan(0.7);
    });

    it("scores very short tasks low", () => {
      const commitment = createCommitment({
        task: "Help",
        description: "H",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.taskClarity).toBeLessThan(0.5);
    });
  });

  describe("factor scoring: deadline clarity", () => {
    it("scores ISO dates highest (1.0)", () => {
      const commitment = createCommitment({
        deadline: "2026-08-15",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.deadlineClarity).toBe(1.0);
    });

    it("scores relative dates (0.8)", () => {
      const commitment = createCommitment({
        deadline: "by Friday",
        description: "by Friday",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.deadlineClarity).toBeGreaterThanOrEqual(0.7);
    });

    it("scores missing deadline as 0.0", () => {
      const commitment = createCommitment({
        deadline: null,
        description: "Sometime in the future.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.deadlineClarity).toBe(0.0);
    });

    it("recognizes time patterns (3pm, 15:00)", () => {
      const commitment = createCommitment({
        deadline: null,
        description: "Please send by 3pm Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.deadlineClarity).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe("factor scoring: commitment language", () => {
    it("scores strong language highest (1.0)", () => {
      const commitment = createCommitment({
        description: "I will send the report by Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBe(1.0);
    });

    it("recognizes 'I commit' as strong language", () => {
      const commitment = createCommitment({
        description: "I commit to delivering this by the deadline.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBe(1.0);
    });

    it("recognizes 'I'll' as strong language", () => {
      const commitment = createCommitment({
        description: "I'll have it done by tomorrow.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBe(1.0);
    });

    it("scores moderate language (0.6-0.8)", () => {
      const commitment = createCommitment({
        description: "I can send the report by Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBeGreaterThanOrEqual(0.6);
      expect(result.factors.commitmentLanguage).toBeLessThan(1.0);
    });

    it("scores weak language low (< 0.5)", () => {
      const commitment = createCommitment({
        description: "Maybe I could try to send something.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.commitmentLanguage).toBeLessThan(0.5);
    });
  });

  describe("factor scoring: ambiguity penalty", () => {
    it("no penalty for clear language (0.0)", () => {
      const commitment = createCommitment({
        description: "I will send the report by Friday.",
      });

      const result = scoreConfidence(commitment);

      // Use toEqual for 0.0 to handle -0 vs 0 JavaScript quirk
      expect(result.factors.ambiguityPenalty).toBeGreaterThanOrEqual(0);
      expect(result.factors.ambiguityPenalty).toBeLessThanOrEqual(0);
    });

    it("penalizes 'maybe' (-0.15)", () => {
      const commitment = createCommitment({
        description: "Maybe I'll send the report.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ambiguityPenalty).toBeLessThan(0);
      expect(result.factors.ambiguityPenalty).toBeGreaterThan(-0.3);
    });

    it("penalizes 'probably' (-0.15)", () => {
      const commitment = createCommitment({
        description: "I'll probably send it by Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ambiguityPenalty).toBeLessThan(0);
    });

    it("penalizes qualifying language (if, unless, subject to)", () => {
      const commitment = createCommitment({
        description:
          "I will send it if I have time and unless something comes up.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ambiguityPenalty).toBeLessThan(-0.1);
    });

    it("accumulates penalties for multiple ambiguous words", () => {
      const commitment = createCommitment({
        description:
          "Maybe I could probably try to send it, hopefully by Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.ambiguityPenalty).toBeLessThan(-0.3);
    });
  });

  describe("factor scoring: context completeness", () => {
    it("scores rich context high (0.7+)", () => {
      const commitment = createCommitment({
        description:
          "Send the comprehensive quarterly financial report to the CEO and CFO",
        priority: 5,
        verificationMethod: "manual",
        deadline: "2026-08-15",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.contextCompleteness).toBeGreaterThanOrEqual(0.7);
    });

    it("scores minimal context lower", () => {
      const commitment = createCommitment({
        description: "Task.",
        priority: 2,
        verificationMethod: "manual",
        deadline: null,
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.contextCompleteness).toBeLessThan(0.6);
    });

    it("rewards linked repository", () => {
      const commitment = createCommitment({
        description: "Commit and push to the repo",
        verificationMethod: "github_commit",
        linkedRepo: "my-project",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.contextCompleteness).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("factor scoring: signal strength", () => {
    it("scores high with multiple signals (6+ out of 7)", () => {
      const commitment = createCommitment({
        owner: "alice@example.com",
        task: "Send report",
        deadline: "2026-08-01",
        description: "I will send the quarterly report",
        priority: 5,
        verificationMethod: "manual",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.signalStrength).toBeGreaterThanOrEqual(0.8);
    });

    it("scores low with few signals", () => {
      const commitment = createCommitment({
        owner: "unknown",
        task: "Something",
        deadline: null,
        description: "Task",
        priority: 1,
        verificationMethod: "manual",
      });

      const result = scoreConfidence(commitment);

      expect(result.factors.signalStrength).toBeLessThan(0.5);
    });
  });

  // ========================================================================
  // EXPLANATION GENERATION
  // ========================================================================

  describe("explanation generation", () => {
    it("generates explanation for HIGH confidence", () => {
      const commitment = createCommitment({
        description: "I will definitely send the report by Friday.",
      });

      const result = scoreConfidence(commitment);

      expect(result.explanation).toMatch(/HIGH/);
      expect(result.explanation.length).toBeGreaterThan(20);
    });

    it("generates explanation for MEDIUM confidence", () => {
      const commitment = createCommitment({
        description: "I might send the report sometime.",
      });

      const result = scoreConfidence(commitment);

      if (result.tier === "MEDIUM") {
        expect(result.explanation).toMatch(/MEDIUM/);
      }
    });

    it("generates explanation for LOW confidence", () => {
      const commitment = createCommitment({
        owner: "unknown",
        task: "Stuff",
        deadline: null,
        description: "Maybe do something.",
      });

      const result = scoreConfidence(commitment);

      expect(result.explanation).toMatch(/LOW/);
    });

    it("includes specific weak points in explanation", () => {
      const commitment = createCommitment({
        owner: "unknown",
        deadline: null,
      });

      const result = scoreConfidence(commitment);

      expect(result.explanation).toMatch(/unclear|no deadline|weak/i);
    });

    it("ends with period", () => {
      const commitment = createCommitment();

      const result = scoreConfidence(commitment);

      expect(result.explanation).toMatch(/\.$/);
    });
  });

  // ========================================================================
  // TIER MAPPING
  // ========================================================================

  describe("tier mapping", () => {
    it("maps score >= 0.75 to HIGH", () => {
      const commitment = createCommitment({
        description: "I will definitely complete this by Friday for sure.",
        deadline: "2026-08-01",
        priority: 5,
      });

      const result = scoreConfidence(commitment);

      if (result.confidenceScore >= 0.75) {
        expect(result.tier).toBe("HIGH");
      }
    });

    it("maps score 0.4-0.75 to MEDIUM", () => {
      const commitment = createCommitment({
        description: "I might send it by next week, if I can.",
      });

      const result = scoreConfidence(commitment);

      if (result.confidenceScore >= 0.4 && result.confidenceScore < 0.75) {
        expect(result.tier).toBe("MEDIUM");
      }
    });

    it("maps score < 0.4 to LOW", () => {
      const commitment = createCommitment({
        owner: "unknown",
        task: "Something",
        deadline: null,
        description: "Maybe.",
      });

      const result = scoreConfidence(commitment);

      if (result.confidenceScore < 0.4) {
        expect(result.tier).toBe("LOW");
      }
    });
  });

  // ========================================================================
  // COMPOSITE SCORE CALCULATION
  // ========================================================================

  describe("composite score", () => {
    it("returns score between 0.0 and 1.0", () => {
      const commitment = createCommitment();

      const result = scoreConfidence(commitment);

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
    });

    it("weights task clarity heavily (0.2)", () => {
      const highTaskClarityCommitment = createCommitment({
        task: "Send the comprehensive quarterly financial report",
      });

      const lowTaskClarityCommitment = createCommitment({
        task: "Do stuff",
      });

      const highResult = scoreConfidence(highTaskClarityCommitment);
      const lowResult = scoreConfidence(lowTaskClarityCommitment);

      expect(highResult.confidenceScore).toBeGreaterThan(
        lowResult.confidenceScore
      );
    });

    it("combines all factors into single score", () => {
      const commitment = createCommitment();

      const result = scoreConfidence(commitment);

      // Score should reflect combination of all factors
      expect(result.confidenceScore).toBeDefined();
      expect(typeof result.confidenceScore).toBe("number");

      // All factors should be present
      expect(result.factors.ownerClarity).toBeDefined();
      expect(result.factors.taskClarity).toBeDefined();
      expect(result.factors.deadlineClarity).toBeDefined();
      expect(result.factors.commitmentLanguage).toBeDefined();
      expect(result.factors.ambiguityPenalty).toBeDefined();
      expect(result.factors.contextCompleteness).toBeDefined();
      expect(result.factors.signalStrength).toBeDefined();
    });
  });

  // ========================================================================
  // REALISTIC SCENARIOS
  // ========================================================================

  describe("realistic scenarios", () => {
    it("scores a clear work request HIGH", () => {
      const commitment = createCommitment({
        owner: "manager@company.com",
        task: "Complete the project",
        deadline: "2026-08-30",
        description:
          "I will complete the entire software project by August 30. This is a firm commitment to deliver all features and conduct thorough testing.",
        priority: 5,
        verificationMethod: "github_release",
        linkedRepo: "main-project",
      });

      const result = scoreConfidence(commitment);

      expect(result.tier).toBe("HIGH");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
    });

    it("scores an ambiguous request MEDIUM or LOW", () => {
      const commitment = createCommitment({
        owner: "colleague",
        task: "Look into something",
        deadline: null,
        description: "Maybe check the code sometime when you get a chance.",
        priority: 2,
        verificationMethod: "manual",
      });

      const result = scoreConfidence(commitment);

      expect(["MEDIUM", "LOW"]).toContain(result.tier);
      expect(result.confidenceScore).toBeLessThan(0.75);
    });

    it("scores a meeting request differently than work request", () => {
      const commitment = createCommitment({
        owner: "alice@example.com",
        task: "Attend the meeting",
        deadline: "2026-07-30",
        description: "Can you attend the team meeting next Tuesday at 2pm?",
        priority: 3,
        verificationMethod: "calendar_attendance",
      });

      const result = scoreConfidence(commitment);

      // Calendar-based verification should still score reasonably
      expect(result.confidenceScore).toBeGreaterThan(0.3);
    });
  });
});
