/**
 * Tests for pipeline.ts
 *
 * Tests orchestration of verification, risk assessment, and overdue checking workflows.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  runVerificationPipeline,
  runRiskAssessmentPipeline,
  checkAndMarkOverdue,
  runVerificationPipelineBatch,
  runRiskAssessmentPipelineBatch,
  checkAndMarkOverdueBatch,
} from "../pipeline";
import * as evidenceMatcherModule from "../evidenceMatcher";
import * as riskEngineModule from "../riskEngine";
import * as persistModule from "../persist";
import type { Commitment, Evidence } from "../../shared/types";

vi.mock("../evidenceMatcher");
vi.mock("../riskEngine");
vi.mock("../persist");

describe("pipeline", () => {
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

  const createEvidence = (
    overrides: Partial<Evidence> = {}
  ): Evidence => ({
    id: "evidence_1",
    commitment_id: "commit_1",
    evidence_type: "github_commit",
    evidence_reference: "sha:abc",
    match_confidence: 0.0,
    detected_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(evidenceMatcherModule.verifyCommitment).mockResolvedValue({
      commitment: createCommitment(),
      evidence_matches: [],
      strongest_match: null,
      is_complete: false,
      recommended_status: null,
      summary: "Test",
    } as any);

    vi.mocked(riskEngineModule.assessCommitmentRisk).mockResolvedValue({
      commitment: createCommitment(),
      risk_score: 0.5,
      is_at_risk: false,
      contributing_factors: {
        time_elapsed_ratio: 0.5,
        evidence_completeness: 0.0,
        github_activity_signal: 0.5,
        time_remaining_ms: 3 * 24 * 60 * 60 * 1000,
        is_within_risk_window: false,
        manually_flagged_at_risk: false,
      },
      explanation: "Low risk",
    });

    vi.mocked(persistModule.persistVerificationResult).mockResolvedValue(
      createCommitment()
    );
    vi.mocked(persistModule.persistRiskAssessment).mockResolvedValue(
      createCommitment()
    );
  });

  // ========================================================================
  // runVerificationPipeline
  // ========================================================================

  describe("runVerificationPipeline", () => {
    it("orchestrates verification workflow successfully", async () => {
      const commitment = createCommitment({ status: "PENDING" });
      const evidence = createEvidence();

      vi.mocked(evidenceMatcherModule.verifyCommitment).mockResolvedValue({
        commitment,
        evidence_matches: [],
        strongest_match: {
          evidence,
          commitment,
          match_confidence: 0.9,
          reasoning: "Strong match",
          is_sufficient_for_completion: true,
        },
        is_complete: true,
        recommended_status: "COMPLETED",
        summary: "Test",
      } as any);

      vi.mocked(persistModule.persistVerificationResult).mockResolvedValue(
        createCommitment({ status: "COMPLETED" })
      );

      const result = await runVerificationPipeline({
        commitment,
        evidence: [evidence],
      });

      expect(result.verificationResult.is_complete).toBe(true);
      expect(result.persistedCommitment.status).toBe("COMPLETED");
    });

    it("handles verification without status change", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const result = await runVerificationPipeline({
        commitment,
        evidence: [evidence],
      });

      expect(result.statusChanged).toBe(false);
    });

    it("throws on verification failure", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      vi.mocked(evidenceMatcherModule.verifyCommitment).mockRejectedValue(
        new Error("Verification failed")
      );

      await expect(
        runVerificationPipeline({
          commitment,
          evidence: [evidence],
        })
      ).rejects.toThrow("Verification failed");
    });

    it("throws on persistence failure", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      vi.mocked(persistModule.persistVerificationResult).mockRejectedValue(
        new Error("DB error")
      );

      await expect(
        runVerificationPipeline({
          commitment,
          evidence: [evidence],
        })
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // runRiskAssessmentPipeline
  // ========================================================================

  describe("runRiskAssessmentPipeline", () => {
    it("orchestrates risk assessment workflow successfully", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      vi.mocked(riskEngineModule.assessCommitmentRisk).mockResolvedValue({
        commitment,
        risk_score: 0.75,
        is_at_risk: true,
        contributing_factors: {
          time_elapsed_ratio: 0.5,
          evidence_completeness: 0.0,
          github_activity_signal: 0.3,
          time_remaining_ms: 2 * 24 * 60 * 60 * 1000,
          is_within_risk_window: true,
          manually_flagged_at_risk: false,
        },
        explanation: "At risk",
      });

      vi.mocked(persistModule.persistRiskAssessment).mockResolvedValue(
        createCommitment({ status: "AT_RISK" })
      );

      const result = await runRiskAssessmentPipeline({
        commitment,
        evidence: [evidence],
      });

      expect(result.riskResult.is_at_risk).toBe(true);
      expect(result.statusChanged).toBe(true);
      expect(result.persistedCommitment.status).toBe("AT_RISK");
    });

    it("includes GitHub activity in assessment", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const result = await runRiskAssessmentPipeline({
        commitment,
        evidence: [evidence],
        githubActivity: {
          lastCommitDaysAgo: 1,
          lastPRDaysAgo: 2,
        },
      });

      expect(result.riskResult).toBeDefined();
    });
  });

  // ========================================================================
  // checkAndMarkOverdue
  // ========================================================================

  describe("checkAndMarkOverdue", () => {
    it("marks commitment overdue when deadline passed", async () => {
      const commitment = createCommitment({
        deadline: new Date(Date.now() - 1000),
      });
      const evidence: Evidence[] = [];

      vi.mocked(riskEngineModule.isCommitmentOverdue).mockReturnValue(true);
      vi.mocked(persistModule.markCommitmentOverdue).mockResolvedValue(
        createCommitment({ status: "OVERDUE" })
      );

      const result = await checkAndMarkOverdue(commitment, evidence);

      expect(result.isOverdue).toBe(true);
      expect(result.persistedCommitment?.status).toBe("OVERDUE");
    });

    it("does not mark when deadline is future", async () => {
      const commitment = createCommitment({
        deadline: new Date(Date.now() + 1000),
      });

      vi.mocked(riskEngineModule.isCommitmentOverdue).mockReturnValue(false);

      const result = await checkAndMarkOverdue(commitment, []);

      expect(result.isOverdue).toBe(false);
      expect(result.persistedCommitment).toBeUndefined();
    });
  });

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  describe("runVerificationPipelineBatch", () => {
    it("processes multiple commitments", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      const result = await runVerificationPipelineBatch([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      expect(result.results.length).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it("continues on individual failures", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      vi.mocked(evidenceMatcherModule.verifyCommitment)
        .mockResolvedValueOnce({
          commitment: c1,
          evidence_matches: [],
          strongest_match: null,
          is_complete: false,
          recommended_status: null,
          summary: "Test",
        } as any)
        .mockRejectedValueOnce(new Error("Error"));

      const result = await runVerificationPipelineBatch([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      expect(result.results.length).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  describe("runRiskAssessmentPipelineBatch", () => {
    it("processes multiple commitments", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      const result = await runRiskAssessmentPipelineBatch([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      expect(result.results.length).toBe(2);
      expect(result.failureCount).toBe(0);
    });
  });

  describe("checkAndMarkOverdueBatch", () => {
    it("checks multiple commitments", async () => {
      const c1 = createCommitment({
        id: "c1",
        deadline: new Date(Date.now() - 1000),
      });
      const c2 = createCommitment({
        id: "c2",
        deadline: new Date(Date.now() + 1000),
      });

      vi.mocked(riskEngineModule.isCommitmentOverdue)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      vi.mocked(persistModule.markCommitmentOverdue).mockResolvedValue(
        createCommitment({ status: "OVERDUE" })
      );

      const result = await checkAndMarkOverdueBatch([c1, c2], {
        c1: [],
        c2: [],
      });

      expect(result.results.filter((r) => r.isOverdue).length).toBe(1);
      expect(result.failureCount).toBe(0);
    });
  });
});
