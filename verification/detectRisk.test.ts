import { describe, it, expect } from "vitest";
import { detectRisk } from "./detectRisk.js";
import type { Commitment, Evidence } from "../shared/types/index.js";

// Test helper: create a commitment with sensible defaults
function createCommitment(overrides: Partial<Commitment> = {}): Commitment {
  const now = new Date("2026-07-29T10:00:00Z");
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  return {
    id: "test-commitment",
    user_id: "test-user",
    title: "Test commitment",
    description: "A test commitment",
    requester: "Test Requester",
    source: "gmail",
    source_reference: "message-123",
    deadline: twoDaysFromNow,
    status: "PENDING",
    confidence_score: 0.9,
    priority_score: 0.5,
    verification_method: "github",
    linked_repo: null,
    created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    updated_at: now,
    ...overrides,
  };
}

// Test helper: create evidence with sensible defaults
function createEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence-1",
    commitment_id: "test-commitment",
    evidence_type: "github_commit",
    evidence_reference: "abc123",
    match_confidence: 0.8,
    detected_at: new Date(),
    ...overrides,
  };
}

describe("detectRisk", () => {
  describe("Interface and return type", () => {
    it("should return object with is_at_risk, risk_score, and explanation", () => {
      const commitment = createCommitment();
      const result = detectRisk(commitment, [], new Date());

      expect(result).toHaveProperty("is_at_risk");
      expect(result).toHaveProperty("risk_score");
      expect(result).toHaveProperty("explanation");
      expect(Object.keys(result).length).toBe(3);
    });

    it("should return is_at_risk as boolean", () => {
      const commitment = createCommitment();
      const result = detectRisk(commitment, [], new Date());
      expect(typeof result.is_at_risk).toBe("boolean");
    });

    it("should return risk_score as number between 0 and 100", () => {
      const commitment = createCommitment();
      const result = detectRisk(commitment, [], new Date());
      expect(typeof result.risk_score).toBe("number");
      expect(result.risk_score).toBeGreaterThanOrEqual(0);
      expect(result.risk_score).toBeLessThanOrEqual(100);
    });

    it("should return explanation as non-empty string", () => {
      const commitment = createCommitment();
      const result = detectRisk(commitment, [], new Date());
      expect(typeof result.explanation).toBe("string");
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  describe("Edge case: No deadline", () => {
    it("should return is_at_risk=false when deadline is null", () => {
      const commitment = createCommitment({ deadline: null });
      const result = detectRisk(commitment, [], new Date());

      expect(result.is_at_risk).toBe(false);
      expect(result.risk_score).toBe(0);
      expect(result.explanation).toContain("no deadline");
    });
  });

  describe("Edge case: Deadline already passed", () => {
    it("should return is_at_risk=false when deadline has passed", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const yesterdayDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const commitment = createCommitment({ deadline: yesterdayDeadline });
      const result = detectRisk(commitment, [], now);

      expect(result.is_at_risk).toBe(false);
      expect(result.risk_score).toBe(0);
      expect(result.explanation).toContain("Deadline Monitoring (FR-3)");
    });
  });

  describe("Inside risk window", () => {
    it("should flag is_at_risk=true when inside risk window with no evidence", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      // Created 10 days ago = 11-day total duration; risk window = 2.2 days
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const result = detectRisk(commitment, [], now);

      expect(result.is_at_risk).toBe(true);
      expect(result.risk_score).toBeGreaterThan(0);
      expect(result.explanation).toContain("at risk");
    });

    it("should return is_at_risk=false when inside risk window but has sufficient evidence", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const evidence = [createEvidence({ match_confidence: 0.7 })];
      const result = detectRisk(commitment, evidence, now);

      expect(result.is_at_risk).toBe(false);
      expect(result.explanation).toContain("sufficient completion evidence");
    });
  });

  describe("Outside risk window", () => {
    it("should return is_at_risk=false when outside risk window", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      // 30 days from now, created 5 days ago = 35-day total; risk window = 7 days
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: thirtyDaysFromNow,
      });

      const result = detectRisk(commitment, [], now);

      expect(result.is_at_risk).toBe(false);
      expect(result.risk_score).toBe(0);
      expect(result.explanation).toContain("not yet in the risk window");
    });
  });

  describe("GitHub-linked commitments", () => {
    it("should flag is_at_risk=true for GitHub-linked with no activity inside risk window", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
        linked_repo: "owner/repo",
      });

      const result = detectRisk(commitment, [], now);

      expect(result.is_at_risk).toBe(true);
      expect(result.explanation).toContain("no recent GitHub activity");
    });

    it("should return is_at_risk=false for GitHub-linked with commit activity", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
        linked_repo: "owner/repo",
      });

      const githubEvidence = [
        createEvidence({ evidence_type: "github_commit", match_confidence: 0.6 }),
      ];

      const result = detectRisk(commitment, githubEvidence, now);

      expect(result.is_at_risk).toBe(false);
      expect(result.explanation).toContain("recent activity");
    });

    it("should recognize PR as GitHub activity", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
        linked_repo: "owner/repo",
      });

      const prEvidence = [
        createEvidence({ evidence_type: "github_pr", match_confidence: 0.6 }),
      ];

      const result = detectRisk(commitment, prEvidence, now);

      expect(result.is_at_risk).toBe(false);
    });

    it("should recognize release as GitHub activity", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
        linked_repo: "owner/repo",
      });

      const releaseEvidence = [
        createEvidence({ evidence_type: "github_release", match_confidence: 0.6 }),
      ];

      const result = detectRisk(commitment, releaseEvidence, now);

      expect(result.is_at_risk).toBe(false);
    });

    it("should prioritize GitHub activity in explanation for non-at-risk", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      const createdAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: thirtyDaysFromNow,
        linked_repo: "owner/repo",
      });

      const githubEvidence = [
        createEvidence({ evidence_type: "github_commit", match_confidence: 0.3 }),
      ];

      const result = detectRisk(commitment, githubEvidence, now);

      expect(result.is_at_risk).toBe(false);
      // GitHub activity should be mentioned first in explanation
      expect(result.explanation).toContain("GitHub-linked commitment has recent activity");
    });
  });

  describe("Confidence threshold (0.5)", () => {
    it("should not count evidence below 0.5 confidence", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const lowConfidenceEvidence = [
        createEvidence({ match_confidence: 0.49 }),
      ];

      const result = detectRisk(commitment, lowConfidenceEvidence, now);

      expect(result.is_at_risk).toBe(true);
    });

    it("should count evidence at exactly 0.5 confidence", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const mediumConfidenceEvidence = [
        createEvidence({ match_confidence: 0.5 }),
      ];

      const result = detectRisk(commitment, mediumConfidenceEvidence, now);

      expect(result.is_at_risk).toBe(false);
    });

    it("should count evidence above 0.5 confidence", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const highConfidenceEvidence = [
        createEvidence({ match_confidence: 0.6 }),
      ];

      const result = detectRisk(commitment, highConfidenceEvidence, now);

      expect(result.is_at_risk).toBe(false);
    });

    it("should use OR logic across multiple evidence items", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const mixedEvidence = [
        createEvidence({ id: "e1", match_confidence: 0.3 }),
        createEvidence({ id: "e2", match_confidence: 0.4 }),
        createEvidence({ id: "e3", match_confidence: 0.6 }), // One passes threshold
      ];

      const result = detectRisk(commitment, mixedEvidence, now);

      expect(result.is_at_risk).toBe(false);
    });
  });

  describe("Risk window scaling", () => {
    it("should scale risk window with commitment duration (short task)", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      // 2-hour commitment: created 2 hours ago, deadline 2 hours from now
      // Total = 4 hours; risk window = 48 minutes
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: twoHoursAgo,
        deadline: twoHoursFromNow,
      });

      // Exactly 2 hours remaining > 48 minutes, so not in risk window yet
      let result = detectRisk(commitment, [], now);
      expect(result.is_at_risk).toBe(false);
      expect(result.risk_score).toBe(0);

      // After 1 hour 30 minutes (30 minutes remaining < 48 minutes risk window)
      const laterTime = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
      result = detectRisk(commitment, [], laterTime);
      expect(result.is_at_risk).toBe(true);
      expect(result.risk_score).toBeGreaterThan(0);
    });

    it("should scale risk window with commitment duration (long task)", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      // 14-day commitment: created 7 days ago, deadline 7 days from now
      // Total = 14 days; risk window = 2.8 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: sevenDaysAgo,
        deadline: sevenDaysFromNow,
      });

      let result = detectRisk(commitment, [], now);
      expect(result.is_at_risk).toBe(false);
      expect(result.risk_score).toBe(0);

      // After 5 days (2 days remaining < 2.8 days risk window)
      const laterTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      result = detectRisk(commitment, [], laterTime);
      expect(result.is_at_risk).toBe(true);
      expect(result.risk_score).toBeGreaterThan(0);
    });
  });

  describe("Risk score calculation", () => {
    it("should return 0 risk_score when outside risk window", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      const createdAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: thirtyDaysFromNow,
      });

      const result = detectRisk(commitment, [], now);
      expect(result.risk_score).toBe(0);
    });

    it("should return higher risk_score when inside risk window with no evidence", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const result = detectRisk(commitment, [], now);
      expect(result.risk_score).toBeGreaterThan(50);
    });

    it("should include GitHub penalty in risk_score for linked repo without activity", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitmentWithoutGitHub = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
        linked_repo: null,
      });

      const commitmentWithGitHub = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
        linked_repo: "owner/repo",
      });

      const scoreWithout = detectRisk(commitmentWithoutGitHub, [], now).risk_score;
      const scoreWith = detectRisk(commitmentWithGitHub, [], now).risk_score;

      // GitHub penalty should increase score
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });
  });

  describe("Explanation messages", () => {
    it("should mention time remaining in at-risk explanation", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: tomorrow,
      });

      const result = detectRisk(commitment, [], now);
      expect(result.explanation).toMatch(/\d+ hours remaining/);
    });

    it("should mention evidence in non-at-risk explanation", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      const createdAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: thirtyDaysFromNow,
      });

      const evidence = [createEvidence({ match_confidence: 0.8 })];
      const result = detectRisk(commitment, evidence, now);

      expect(result.explanation).toContain("sufficient completion evidence");
    });

    it("should mention days remaining in outside-window explanation", () => {
      const now = new Date("2026-07-29T10:00:00Z");
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      const createdAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const commitment = createCommitment({
        created_at: createdAt,
        deadline: thirtyDaysFromNow,
      });

      const result = detectRisk(commitment, [], now);
      expect(result.explanation).toMatch(/\d+ days? remaining/);
    });
  });

  describe("Real-world scenarios", () => {
    it("handles a short-deadline task correctly", () => {
      // Scenario: "Finish report by 3 PM today"
      const now = new Date("2026-07-29T10:00:00Z");
      const deadline = new Date("2026-07-29T15:00:00Z"); // 5 hours from now
      const createdAt = new Date("2026-07-29T08:00:00Z"); // 2 hours ago

      const commitment = createCommitment({
        created_at: createdAt,
        deadline,
        title: "Finish report by 3 PM",
      });

      // Total duration: 7 hours; risk window = 84 minutes
      // Time remaining: 5 hours (300 minutes) > 84 minutes, NOT in risk window
      let result = detectRisk(commitment, [], now);
      expect(result.is_at_risk).toBe(false);
      expect(result.risk_score).toBe(0);

      // After 2 hours (3 hours remaining = 180 minutes > 84 minutes, still NOT in window)
      const twoHoursLater = new Date("2026-07-29T12:00:00Z");
      result = detectRisk(commitment, [], twoHoursLater);
      expect(result.is_at_risk).toBe(false);

      // Inside risk window: 83 minutes remaining < 84 minutes
      const nearDeadline = new Date("2026-07-29T13:37:00Z");
      result = detectRisk(commitment, [], nearDeadline);
      expect(result.is_at_risk).toBe(true);
    });

    it("handles a week-long deadline correctly", () => {
      // Scenario: "Ship v2.0 by next Friday"
      const now = new Date("2026-07-29T00:00:00Z"); // Tuesday
      const deadline = new Date("2026-08-01T23:59:59Z"); // Friday (3 days out)
      const createdAt = new Date("2026-07-25T00:00:00Z"); // Previous Friday (4 days ago)

      const commitment = createCommitment({
        created_at: createdAt,
        deadline,
        title: "Ship v2.0",
      });

      // Total duration: 7 days; risk window = 1.4 days
      // Time remaining: 3 days > 1.4 days, NOT in risk window
      let result = detectRisk(commitment, [], now);
      expect(result.is_at_risk).toBe(false);

      // Friday afternoon (inside risk window: ~34 hours remaining < 38.4 hours)
      const friday = new Date("2026-08-01T14:00:00Z");
      // Time remaining: ~34 hours < 38.4 hours, IN risk window
      result = detectRisk(commitment, [], friday);
      expect(result.is_at_risk).toBe(true);
    });
  });
});
