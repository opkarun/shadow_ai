/**
 * Tests for riskEngine.ts
 *
 * Tests risk detection logic, deadline checking, and overdue detection.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  assessCommitmentRisk,
  isCommitmentOverdue,
} from "../riskEngine";
import type { Commitment, Evidence } from "../../shared/types";

describe("riskEngine", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createCommitment = (
    overrides: Partial<Commitment> = {}
  ): Commitment => ({
    id: "commit_1",
    user_id: "user_1",
    title: "Complete feature",
    description: "Build and deploy new feature",
    requester: "product-manager@company.com",
    source: "gmail",
    source_reference: "email_123",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    status: "PENDING",
    confidence_score: 0.85,
    priority_score: 4,
    verification_method: "github_pr",
    linked_repo: "company/product",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Created 7 days ago
    updated_at: new Date(),
    ...overrides,
  });

  const createEvidence = (
    overrides: Partial<Evidence> = {}
  ): Evidence => ({
    id: "evidence_1",
    commitment_id: "commit_1",
    evidence_type: "github_commit",
    evidence_reference: "sha:abc123",
    match_confidence: 0.0,
    detected_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // assessCommitmentRisk
  // ========================================================================

  describe("assessCommitmentRisk", () => {
    describe("input validation", () => {
      it("rejects null commitment", async () => {
        await expect(
          assessCommitmentRisk(null as any, [])
        ).rejects.toThrow("Commitment is required");
      });

      it("rejects commitment without ID", async () => {
        const commitment = createCommitment({ id: "" as any });

        await expect(
          assessCommitmentRisk(commitment, [])
        ).rejects.toThrow("ID");
      });

      it("rejects non-array evidence", async () => {
        const commitment = createCommitment();

        await expect(
          assessCommitmentRisk(commitment, null as any)
        ).rejects.toThrow("array");
      });

      it("rejects invalid evaluated_at date", async () => {
        const commitment = createCommitment();

        await expect(
          assessCommitmentRisk(commitment, [], new Date("invalid"))
        ).rejects.toThrow("valid Date");
      });
    });

    describe("happy path", () => {
      it("assesses low risk with no deadline pressure", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days away
        });
        const evidence = createEvidence();

        const result = await assessCommitmentRisk(
          commitment,
          [evidence],
          new Date()
        );

        expect(result.risk_score).toBeLessThan(0.5);
        expect(result.is_at_risk).toBe(false);
      });

      it("assesses high risk near deadline with no evidence", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours away
        });

        const result = await assessCommitmentRisk(
          commitment,
          [],
          new Date()
        );

        expect(result.risk_score).toBeGreaterThan(0.65);
        expect(result.is_at_risk).toBe(true);
      });

      it("assesses reduced risk with recent evidence", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        });
        const evidence = createEvidence({
          detected_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        });

        const result = await assessCommitmentRisk(
          commitment,
          [evidence],
          new Date()
        );

        expect(result.risk_score).toBeLessThan(0.8);
      });

      it("accounts for GitHub activity signals", async () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        });

        const result = await assessCommitmentRisk(
          commitment,
          [],
          new Date(),
          {
            lastCommitDaysAgo: 0, // Commit today
            lastPRDaysAgo: 1,
          }
        );

        // Recent activity should reduce risk
        expect(result.contributing_factors.github_activity_signal).toBeGreaterThan(0.5);
      });

      it("handles commitments without deadline", async () => {
        const commitment = createCommitment({
          deadline: null,
        });

        const result = await assessCommitmentRisk(commitment, []);

        expect(result.is_at_risk).toBe(false);
      });
    });

    describe("risk factors calculation", () => {
      it("calculates time elapsed ratio correctly", async () => {
        const now = new Date();
        const created = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
        const deadline = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

        const commitment = createCommitment({
          created_at: created,
          deadline,
        });

        const result = await assessCommitmentRisk(commitment, [], now);

        // Halfway through
        expect(result.contributing_factors.time_elapsed_ratio).toBeCloseTo(
          0.5,
          1
        );
      });

      it("detects when within risk window", async () => {
        const now = new Date();
        const created = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
        const deadline = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day from now

        const commitment = createCommitment({
          created_at: created,
          deadline,
        });

        const result = await assessCommitmentRisk(commitment, [], now);

        expect(result.contributing_factors.is_within_risk_window).toBe(true);
      });
    });

    describe("error handling", () => {
      it("throws on invalid inputs", async () => {
        const commitment = createCommitment();

        await expect(
          assessCommitmentRisk(commitment, [], "invalid" as any)
        ).rejects.toThrow();
      });
    });
  });

  // ========================================================================
  // isCommitmentOverdue
  // ========================================================================

  describe("isCommitmentOverdue", () => {
    describe("input validation", () => {
      it("rejects null commitment", () => {
        expect(() =>
          isCommitmentOverdue(null as any, [])
        ).toThrow("Commitment is required");
      });

      it("rejects non-array evidence", () => {
        const commitment = createCommitment();

        expect(() =>
          isCommitmentOverdue(commitment, null as any)
        ).toThrow("array");
      });

      it("rejects invalid date", () => {
        const commitment = createCommitment();

        expect(() =>
          isCommitmentOverdue(commitment, [], new Date("invalid"))
        ).toThrow("valid Date");
      });
    });

    describe("happy path", () => {
      it("returns false for future deadlines", () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() + 1000),
        });

        const result = isCommitmentOverdue(commitment, []);

        expect(result).toBe(false);
      });

      it("returns false for current time equals deadline", () => {
        const now = new Date();
        const commitment = createCommitment({
          deadline: now,
        });

        const result = isCommitmentOverdue(commitment, [], now);

        expect(result).toBe(false);
      });

      it("returns false for commitments without deadline", () => {
        const commitment = createCommitment({
          deadline: null,
        });

        const result = isCommitmentOverdue(commitment, []);

        expect(result).toBe(false);
      });

      it("returns false when deadline passed but evidence exists", () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000),
        });
        const evidence = createEvidence();

        const result = isCommitmentOverdue(commitment, [evidence]);

        expect(result).toBe(false);
      });

      it("returns true when deadline passed and no evidence", () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000),
        });

        const result = isCommitmentOverdue(commitment, []);

        expect(result).toBe(true);
      });

      it("recognizes various evidence types as completion signals", () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000),
        });

        const evidenceTypes = [
          "github_commit",
          "github_pr",
          "github_release",
          "calendar_attendance",
          "manual",
        ];

        for (const evidenceType of evidenceTypes) {
          const evidence = createEvidence({
            evidence_type: evidenceType as any,
          });

          const result = isCommitmentOverdue(commitment, [evidence]);

          expect(result).toBe(false);
        }
      });
    });

    describe("edge cases", () => {
      it("handles commitments with multiple evidence items", () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000),
        });
        const evidence1 = createEvidence({ id: "e1" });
        const evidence2 = createEvidence({ id: "e2" });

        const result = isCommitmentOverdue(commitment, [
          evidence1,
          evidence2,
        ]);

        // Has evidence, so not overdue
        expect(result).toBe(false);
      });

      it("handles commitments very far past deadline", () => {
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        });

        const result = isCommitmentOverdue(commitment, []);

        expect(result).toBe(true);
      });

      it("returns true only for PRODUCT_SPEC hard rule: no time inference", () => {
        // This is the key test for the hard rule:
        // "Time passing is never evidence."
        const commitment = createCommitment({
          deadline: new Date(Date.now() - 1000), // Deadline passed
          title: "Time-critical task",
        });

        const result = isCommitmentOverdue(commitment, []);

        // Even though time passed, without evidence it's OVERDUE
        expect(result).toBe(true);
      });
    });
  });
});
