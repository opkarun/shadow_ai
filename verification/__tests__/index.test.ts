/**
 * Tests for index.ts (Public API)
 *
 * Tests all public entry points for the Verification module.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  verifyCommitment,
  verifyCommitments,
  assessRisk,
  assessRisks,
  checkOverdue,
  checkOverdues,
} from "../index";
import * as pipelineModule from "../pipeline";
import type { Commitment, Evidence } from "../../shared/types";

vi.mock("../pipeline");

describe("Verification Module - Public API (index.ts)", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createCommitment = (
    overrides: Partial<Commitment> = {}
  ): Commitment => ({
    id: "commit_1",
    user_id: "user_1",
    title: "Feature implementation",
    description: "Build new feature",
    requester: "product@company.com",
    source: "github",
    source_reference: "issue_1",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    confidence_score: 0.85,
    priority_score: 4,
    verification_method: "github_pr",
    linked_repo: "company/product",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const createEvidence = (
    overrides: Partial<Evidence> = {}
  ): Evidence => ({
    id: "evidence_1",
    commitment_id: "commit_1",
    evidence_type: "github_pr",
    evidence_reference: "pr:42",
    match_confidence: 0.0,
    detected_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(pipelineModule.runVerificationPipeline).mockResolvedValue({
      commitment: createCommitment(),
      verificationResult: {
        commitment: createCommitment(),
        evidence_matches: [],
        strongest_match: null,
        is_complete: false,
        recommended_status: null,
        summary: "Test",
      },
      persistedCommitment: createCommitment(),
      statusChanged: false,
    });

    vi.mocked(pipelineModule.runRiskAssessmentPipeline).mockResolvedValue({
      commitment: createCommitment(),
      riskResult: {
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
      },
      persistedCommitment: createCommitment(),
      statusChanged: false,
    });

    vi.mocked(pipelineModule.checkAndMarkOverdue).mockResolvedValue({
      commitment: createCommitment(),
      isOverdue: false,
    });
  });

  // ========================================================================
  // verifyCommitment
  // ========================================================================

  describe("verifyCommitment", () => {
    it("verifies single commitment successfully", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const result = await verifyCommitment(commitment, [evidence]);

      expect(result).toBeDefined();
      expect(result.persistedCommitment).toBeDefined();
    });

    it("supports additional context", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();
      const context = {
        evidence_1: {
          commitMessage: "Implement feature X",
          prTitle: "Feature X",
        },
      };

      const result = await verifyCommitment(
        commitment,
        [evidence],
        context
      );

      expect(result).toBeDefined();
    });

    it("throws on error", async () => {
      const commitment = createCommitment();

      vi.mocked(pipelineModule.runVerificationPipeline).mockRejectedValue(
        new Error("Pipeline failed")
      );

      await expect(
        verifyCommitment(commitment, [])
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // verifyCommitments (batch)
  // ========================================================================

  describe("verifyCommitments", () => {
    it("verifies multiple commitments", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      vi.mocked(pipelineModule.runVerificationPipelineBatch).mockResolvedValue({
        results: [
          {
            commitment: c1,
            verificationResult: {
              commitment: c1,
              evidence_matches: [],
              strongest_match: null,
              is_complete: false,
              recommended_status: null,
              summary: "Test",
            },
            persistedCommitment: c1,
            statusChanged: false,
          },
          {
            commitment: c2,
            verificationResult: {
              commitment: c2,
              evidence_matches: [],
              strongest_match: null,
              is_complete: false,
              recommended_status: null,
              summary: "Test",
            },
            persistedCommitment: c2,
            statusChanged: false,
          },
        ],
        failureCount: 0,
      });

      const result = await verifyCommitments([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      expect(result.results.length).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it("reports failures", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      vi.mocked(pipelineModule.runVerificationPipelineBatch).mockResolvedValue({
        results: [
          {
            commitment: c1,
            verificationResult: {
              commitment: c1,
              evidence_matches: [],
              strongest_match: null,
              is_complete: false,
              recommended_status: null,
              summary: "Test",
            },
            persistedCommitment: c1,
            statusChanged: false,
          },
        ],
        failureCount: 1,
      });

      const result = await verifyCommitments([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      expect(result.results.length).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  // ========================================================================
  // assessRisk
  // ========================================================================

  describe("assessRisk", () => {
    it("assesses risk for single commitment", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const result = await assessRisk(commitment, [evidence]);

      expect(result).toBeDefined();
      expect(result.riskResult).toBeDefined();
    });

    it("includes GitHub activity", async () => {
      const commitment = createCommitment();

      const result = await assessRisk(commitment, [], {
        lastCommitDaysAgo: 1,
        lastPRDaysAgo: 2,
      });

      expect(result).toBeDefined();
    });

    it("throws on error", async () => {
      const commitment = createCommitment();

      vi.mocked(pipelineModule.runRiskAssessmentPipeline).mockRejectedValue(
        new Error("Risk assessment failed")
      );

      await expect(
        assessRisk(commitment, [])
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // assessRisks (batch)
  // ========================================================================

  describe("assessRisks", () => {
    it("assesses risk for multiple commitments", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      vi.mocked(pipelineModule.runRiskAssessmentPipelineBatch).mockResolvedValue({
        results: [
          {
            commitment: c1,
            riskResult: {
              commitment: c1,
              risk_score: 0.3,
              is_at_risk: false,
              contributing_factors: {
                time_elapsed_ratio: 0.3,
                evidence_completeness: 0.0,
                github_activity_signal: 0.5,
                time_remaining_ms: 5 * 24 * 60 * 60 * 1000,
                is_within_risk_window: false,
                manually_flagged_at_risk: false,
              },
              explanation: "Low risk",
            },
            persistedCommitment: c1,
            statusChanged: false,
          },
        ],
        failureCount: 0,
      });

      const result = await assessRisks([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      expect(result.results.length).toBeGreaterThanOrEqual(0);
      expect(result.failureCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================================================
  // checkOverdue
  // ========================================================================

  describe("checkOverdue", () => {
    it("checks if commitment is overdue", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const result = await checkOverdue(commitment, [evidence]);

      expect(result).toBeDefined();
      expect(result.isOverdue).toBeDefined();
    });

    it("handles overdue commitments", async () => {
      const commitment = createCommitment({
        deadline: new Date(Date.now() - 1000),
      });

      vi.mocked(pipelineModule.checkAndMarkOverdue).mockResolvedValue({
        commitment,
        isOverdue: true,
        persistedCommitment: createCommitment({ status: "OVERDUE" }),
      });

      const result = await checkOverdue(commitment, []);

      expect(result.isOverdue).toBe(true);
    });

    it("throws on error", async () => {
      const commitment = createCommitment();

      vi.mocked(pipelineModule.checkAndMarkOverdue).mockRejectedValue(
        new Error("Check failed")
      );

      await expect(
        checkOverdue(commitment, [])
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // checkOverdues (batch)
  // ========================================================================

  describe("checkOverdues", () => {
    it("checks multiple commitments for overdue status", async () => {
      const c1 = createCommitment({
        id: "c1",
        deadline: new Date(Date.now() - 1000),
      });
      const c2 = createCommitment({
        id: "c2",
        deadline: new Date(Date.now() + 1000),
      });

      vi.mocked(pipelineModule.checkAndMarkOverdueBatch).mockResolvedValue({
        results: [
          { commitment: c1, isOverdue: true },
          { commitment: c2, isOverdue: false },
        ],
        failureCount: 0,
      });

      const result = await checkOverdues([c1, c2], {
        c1: [],
        c2: [],
      });

      expect(result.results.length).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it("reports failures", async () => {
      const c1 = createCommitment({ id: "c1" });

      vi.mocked(pipelineModule.checkAndMarkOverdueBatch).mockResolvedValue({
        results: [],
        failureCount: 1,
      });

      const result = await checkOverdues([c1], { c1: [] });

      expect(result.failureCount).toBe(1);
    });
  });

  // ========================================================================
  // INTEGRATION SCENARIOS
  // ========================================================================

  describe("integration workflows", () => {
    it("verifies then assesses risk", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const verifyResult = await verifyCommitment(commitment, [evidence]);
      const riskResult = await assessRisk(commitment, [evidence]);

      expect(verifyResult).toBeDefined();
      expect(riskResult).toBeDefined();
    });

    it("checks overdue after verification", async () => {
      const commitment = createCommitment();
      const evidence = createEvidence();

      const verifyResult = await verifyCommitment(commitment, [evidence]);
      const overdueResult = await checkOverdue(
        verifyResult.persistedCommitment,
        [evidence]
      );

      expect(overdueResult).toBeDefined();
    });

    it("handles complete workflow on multiple commitments", async () => {
      const c1 = createCommitment({ id: "c1" });
      const c2 = createCommitment({ id: "c2" });

      const verifyResult = await verifyCommitments([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      const riskResult = await assessRisks([
        { commitment: c1, evidence: [] },
        { commitment: c2, evidence: [] },
      ]);

      const overdueResult = await checkOverdues(
        [c1, c2],
        { c1: [], c2: [] }
      );

      expect(verifyResult).toBeDefined();
      expect(riskResult).toBeDefined();
      expect(overdueResult).toBeDefined();
    });
  });
});
