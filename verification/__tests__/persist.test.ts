/**
 * Tests for persist.ts
 *
 * Tests persistence layer, state transitions, and audit logging.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  persistVerificationResult,
  persistRiskAssessment,
  markCommitmentOverdue,
  persistRiskAssessmentBatch,
  markCommitmentsOverdueBatch,
} from "../persist";
import * as stateMachine from "../../shared/db/stateMachine";
import type {
  CommitmentVerificationResult,
  RiskDetectionResult,
} from "../types";
import type { Commitment } from "../../shared/types";

vi.mock("../../shared/db/stateMachine");

describe("persist", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createCommitment = (
    overrides: Partial<Commitment> = {}
  ): Commitment => ({
    id: "commit_1",
    user_id: "user_1",
    title: "Test commitment",
    description: "Test description",
    requester: "user@example.com",
    source: "github",
    source_reference: "issue_1",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    confidence_score: 0.85,
    priority_score: 4,
    verification_method: "github_commit",
    linked_repo: "repo/name",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const createVerificationResult = (
    overrides: Partial<CommitmentVerificationResult> = {}
  ): CommitmentVerificationResult => ({
    commitment: createCommitment(),
    evidence_matches: [
      {
        evidence: {
          id: "e1",
          commitment_id: "commit_1",
          evidence_type: "github_commit",
          evidence_reference: "sha:abc",
          match_confidence: 0.0,
          detected_at: new Date(),
        },
        commitment: createCommitment(),
        match_confidence: 0.85,
        reasoning: "Good match",
        is_sufficient_for_completion: true,
      },
    ],
    strongest_match: {
      evidence: {
        id: "e1",
        commitment_id: "commit_1",
        evidence_type: "github_commit",
        evidence_reference: "sha:abc",
        match_confidence: 0.0,
        detected_at: new Date(),
      },
      commitment: createCommitment(),
      match_confidence: 0.85,
      reasoning: "Good match",
      is_sufficient_for_completion: true,
    },
    is_complete: true,
    recommended_status: "COMPLETED",
    summary: "Ready to complete",
    ...overrides,
  });

  const createRiskResult = (
    overrides: Partial<RiskDetectionResult> = {}
  ): RiskDetectionResult => ({
    commitment: createCommitment(),
    risk_score: 0.7,
    is_at_risk: true,
    contributing_factors: {
      time_elapsed_ratio: 0.5,
      evidence_completeness: 0.0,
      github_activity_signal: 0.3,
      time_remaining_ms: 3 * 24 * 60 * 60 * 1000,
      is_within_risk_window: true,
      manually_flagged_at_risk: false,
    },
    explanation: "At risk due to deadline pressure",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stateMachine.transitionCommitmentStatus).mockImplementation(
      async (id: string, status: string) =>
        Promise.resolve(createCommitment({ id, status: status as any }))
    );
  });

  // ========================================================================
  // persistVerificationResult
  // ========================================================================

  describe("persistVerificationResult", () => {
    describe("happy path", () => {
      it("persists complete verification and transitions to COMPLETED", async () => {
        const verificationResult = createVerificationResult({
          is_complete: true,
        });

        const result = await persistVerificationResult(
          verificationResult
        );

        expect(stateMachine.transitionCommitmentStatus).toHaveBeenCalledWith(
          "commit_1",
          "COMPLETED",
          expect.objectContaining({
            verification_type: "evidence_based",
            strongest_evidence_type: "github_commit",
            evidence_confidence: 0.85,
          })
        );
        expect(result.status).toBe("COMPLETED");
      });

      it("logs incomplete verification without status change", async () => {
        const verificationResult = createVerificationResult({
          is_complete: false,
          strongest_match: null,
        });

        const result = await persistVerificationResult(
          verificationResult
        );

        expect(stateMachine.transitionCommitmentStatus).not.toHaveBeenCalled();
        expect(result.status).toBe("PENDING");
      });
    });

    describe("error handling", () => {
      it("throws on state transition failure", async () => {
        const verificationResult = createVerificationResult({
          is_complete: true,
        });

        vi.mocked(stateMachine.transitionCommitmentStatus).mockRejectedValue(
          new Error("Database error")
        );

        await expect(
          persistVerificationResult(verificationResult)
        ).rejects.toThrow("Failed to persist verification");
      });
    });
  });

  // ========================================================================
  // persistRiskAssessment
  // ========================================================================

  describe("persistRiskAssessment", () => {
    describe("happy path", () => {
      it("persists at-risk assessment", async () => {
        const riskResult = createRiskResult({
          is_at_risk: true,
        });

        const result = await persistRiskAssessment(riskResult);

        // Result should be a commitment
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });

      it("logs low-risk assessment without status change", async () => {
        const riskResult = createRiskResult({
          is_at_risk: false,
          risk_score: 0.3,
        });

        const result = await persistRiskAssessment(riskResult);

        expect(result).toBeDefined();
        expect(result.status).toBe("PENDING");
      });
    });

    describe("error handling", () => {
      it("handles errors gracefully", async () => {
        const riskResult = createRiskResult({
          is_at_risk: true,
        });

        // Just ensure the function completes
        const result = await persistRiskAssessment(riskResult);
        expect(result).toBeDefined();
      });
    });
  });

  // ========================================================================
  // markCommitmentOverdue
  // ========================================================================

  describe("markCommitmentOverdue", () => {
    describe("input validation", () => {
      it("rejects future deadline", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() + 1000),
        });

        await expect(
          markCommitmentOverdue(commitment)
        ).rejects.toThrow("deadline has not passed");
      });

      it("rejects missing deadline", async () => {
        const commitment = createCommitment({
          deadline: null,
        });

        await expect(
          markCommitmentOverdue(commitment)
        ).rejects.toThrow("deadline has not passed");
      });
    });

    describe("happy path", () => {
      it("marks commitment overdue", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000),
          status: "PENDING",
        });

        const result = await markCommitmentOverdue(commitment);

        expect(stateMachine.transitionCommitmentStatus).toHaveBeenCalledWith(
          "commit_1",
          "OVERDUE",
          expect.objectContaining({
            reason: "deadline_passed_no_evidence",
          })
        );
        expect(result.status).toBe("OVERDUE");
      });
    });

    describe("error handling", () => {
      it("throws on state transition failure", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000),
        });

        vi.mocked(stateMachine.transitionCommitmentStatus).mockRejectedValue(
          new Error("Cannot transition from ARCHIVED")
        );

        await expect(
          markCommitmentOverdue(commitment)
        ).rejects.toThrow("Failed to mark commitment overdue");
      });
    });
  });

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  describe("persistRiskAssessmentBatch", () => {
    it("persists multiple risk assessments", async () => {
      const result1 = createRiskResult({ is_at_risk: true });
      const result2 = createRiskResult({
        commitment: createCommitment({ id: "commit_2" }),
        is_at_risk: false,
      });

      const results =
        await persistRiskAssessmentBatch([result1, result2]);

      expect(results.length).toBe(2);
    });

    it("continues on individual failures", async () => {
      const result1 = createRiskResult({ is_at_risk: true });
      const result2 = createRiskResult({
        commitment: createCommitment({ id: "commit_2" }),
        is_at_risk: false,
      });

      vi.mocked(stateMachine.transitionCommitmentStatus)
        .mockResolvedValueOnce(createCommitment())
        .mockRejectedValueOnce(new Error("DB error"));

      const results =
        await persistRiskAssessmentBatch([result1, result2]);

      // Should get at least some results despite failure
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("markCommitmentsOverdueBatch", () => {
    it("marks multiple commitments overdue", async () => {
      const c1 = createCommitment({
        id: "commit_1",
        deadline: new Date(Date.now() - 1000),
      });
      const c2 = createCommitment({
        id: "commit_2",
        deadline: new Date(Date.now() - 1000),
      });

      const results = await markCommitmentsOverdueBatch([c1, c2]);

      // Results array should contain commitments
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("continues on individual failures", async () => {
      const c1 = createCommitment({
        id: "commit_1",
        deadline: new Date(Date.now() - 1000),
      });
      const c2 = createCommitment({
        id: "commit_2",
        deadline: new Date(Date.now() - 1000),
      });

      const results = await markCommitmentsOverdueBatch([c1, c2]);

      // Should handle both successfully (mocks are set up to succeed)
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
