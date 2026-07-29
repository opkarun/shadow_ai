/**
 * Tests for evidenceMatcher.ts
 *
 * Tests evidence matching logic, verification decision engine,
 * and confidence scoring integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  matchEvidenceToCommitment,
  verifyCommitment,
} from "../evidenceMatcher";
import * as geminiModule from "../geminiIntegration";
import type { Commitment, Evidence } from "../../shared/types";

vi.mock("../geminiIntegration");

describe("evidenceMatcher", () => {
  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  const createCommitment = (
    overrides: Partial<Commitment> = {}
  ): Commitment => ({
    id: "commit_1",
    user_id: "user_1",
    title: "Implement authentication",
    description: "Add OAuth2 authentication to the API",
    requester: "tech-lead@company.com",
    source: "github",
    source_reference: "issue_42",
    deadline: new Date("2026-08-15"),
    status: "PENDING",
    confidence_score: 0.85,
    priority_score: 4,
    verification_method: "github_commit",
    linked_repo: "company/api",
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
    evidence_reference: "sha:abc123def456",
    match_confidence: 0.0,
    detected_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // matchEvidenceToCommitment
  // ========================================================================

  describe("matchEvidenceToCommitment", () => {
    describe("input validation", () => {
      it("rejects null commitment", async () => {
        const evidence = createEvidence();

        await expect(
          matchEvidenceToCommitment(null as any, evidence)
        ).rejects.toThrow("Commitment is required");
      });

      it("rejects commitment without ID", async () => {
        const commitment = createCommitment({ id: "" as any });
        const evidence = createEvidence();

        await expect(
          matchEvidenceToCommitment(commitment, evidence)
        ).rejects.toThrow("ID");
      });

      it("rejects null evidence", async () => {
        const commitment = createCommitment();

        await expect(
          matchEvidenceToCommitment(commitment, null as any)
        ).rejects.toThrow("Evidence is required");
      });

      it("rejects evidence without ID", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence({ id: "" as any });

        await expect(
          matchEvidenceToCommitment(commitment, evidence)
        ).rejects.toThrow("ID");
      });

      it("rejects evidence from different commitment", async () => {
        const commitment = createCommitment({ id: "commit_1" });
        const evidence = createEvidence({ commitment_id: "commit_2" });

        await expect(
          matchEvidenceToCommitment(commitment, evidence)
        ).rejects.toThrow("does not match");
      });
    });

    describe("happy path", () => {
      it("matches evidence with high confidence", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockResolvedValue({
          is_relevant: true,
          confidence_score: 0.9,
          reasoning: "Perfect match",
          key_signals: ["OAuth2 in commit"],
          concerns: [],
        });

        const result = await matchEvidenceToCommitment(
          commitment,
          evidence
        );

        expect(result.match_confidence).toBe(0.9);
        expect(result.is_sufficient_for_completion).toBe(true);
        expect(result.reasoning).toBe("Perfect match");
      });

      it("matches evidence with medium confidence", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockResolvedValue({
          is_relevant: true,
          confidence_score: 0.6,
          reasoning: "Probable match",
          key_signals: ["Auth-related"],
          concerns: ["generic commit message"],
        });

        const result = await matchEvidenceToCommitment(
          commitment,
          evidence
        );

        expect(result.match_confidence).toBe(0.6);
        expect(result.is_sufficient_for_completion).toBe(true);
      });

      it("matches evidence with low confidence", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockResolvedValue({
          is_relevant: false,
          confidence_score: 0.3,
          reasoning: "Weak connection",
          key_signals: [],
          concerns: ["unrelated commit"],
        });

        const result = await matchEvidenceToCommitment(
          commitment,
          evidence
        );

        expect(result.match_confidence).toBe(0.3);
        expect(result.is_sufficient_for_completion).toBe(false);
      });
    });

    describe("error handling", () => {
      it("throws on Gemini API failure", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockRejectedValue(
          new Error("API timeout")
        );

        await expect(
          matchEvidenceToCommitment(commitment, evidence)
        ).rejects.toThrow("Failed to match evidence");
      });

      it("handles malformed Gemini response", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockRejectedValue(
          new Error("Invalid JSON")
        );

        await expect(
          matchEvidenceToCommitment(commitment, evidence)
        ).rejects.toThrow();
      });
    });
  });

  // ========================================================================
  // verifyCommitment
  // ========================================================================

  describe("verifyCommitment", () => {
    describe("input validation", () => {
      it("rejects null commitment", async () => {
        await expect(verifyCommitment(null as any, [])).rejects.toThrow(
          "Commitment is required"
        );
      });

      it("rejects non-array evidence", async () => {
        const commitment = createCommitment();

        await expect(
          verifyCommitment(commitment, null as any)
        ).rejects.toThrow("array");
      });

      it("rejects evidence from different commitment", async () => {
        const commitment = createCommitment({ id: "commit_1" });
        const evidence = createEvidence({ commitment_id: "commit_2" });

        await expect(verifyCommitment(commitment, [evidence])).rejects.toThrow(
          "does not belong"
        );
      });
    });

    describe("happy path", () => {
      it("marks complete with sufficient evidence", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockResolvedValue({
          is_relevant: true,
          confidence_score: 0.85,
          reasoning: "Strong match",
          key_signals: ["OAuth2"],
          concerns: [],
        });

        const result = await verifyCommitment(commitment, [evidence]);

        expect(result.is_complete).toBe(true);
        expect(result.recommended_status).toBe("COMPLETED");
        expect(result.strongest_match?.match_confidence).toBe(0.85);
      });

      it("marks incomplete with insufficient evidence", async () => {
        const commitment = createCommitment();
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockResolvedValue({
          is_relevant: false,
          confidence_score: 0.2,
          reasoning: "Weak match",
          key_signals: [],
          concerns: ["unrelated"],
        });

        const result = await verifyCommitment(commitment, [evidence]);

        expect(result.is_complete).toBe(false);
        expect(result.recommended_status).toBeNull();
      });

      it("aggregates multiple evidence pieces", async () => {
        const commitment = createCommitment();
        const evidence1 = createEvidence({ id: "evidence_1" });
        const evidence2 = createEvidence({ id: "evidence_2" });

        vi.mocked(geminiModule.analyzeEvidenceRelevance)
          .mockResolvedValueOnce({
            is_relevant: true,
            confidence_score: 0.6,
            reasoning: "Moderate match",
            key_signals: ["auth"],
            concerns: ["generic"],
          })
          .mockResolvedValueOnce({
            is_relevant: true,
            confidence_score: 0.9,
            reasoning: "Strong match",
            key_signals: ["OAuth2", "authentication"],
            concerns: [],
          });

        const result = await verifyCommitment(commitment, [
          evidence1,
          evidence2,
        ]);

        expect(result.evidence_matches.length).toBe(2);
        expect(result.strongest_match?.match_confidence).toBe(0.9);
        expect(result.is_complete).toBe(true);
      });

      it("handles empty evidence array", async () => {
        const commitment = createCommitment();

        const result = await verifyCommitment(commitment, []);

        expect(result.evidence_matches.length).toBe(0);
        expect(result.strongest_match).toBeNull();
        expect(result.is_complete).toBe(false);
      });
    });

    describe("partial failure handling", () => {
      it("continues on individual evidence matching failure", async () => {
        const commitment = createCommitment();
        const evidence1 = createEvidence({ id: "evidence_1" });
        const evidence2 = createEvidence({ id: "evidence_2" });

        vi.mocked(geminiModule.analyzeEvidenceRelevance)
          .mockRejectedValueOnce(new Error("API error"))
          .mockResolvedValueOnce({
            is_relevant: true,
            confidence_score: 0.85,
            reasoning: "Good match",
            key_signals: ["OAuth2"],
            concerns: [],
          });

        const result = await verifyCommitment(commitment, [
          evidence1,
          evidence2,
        ]);

        // Should have 1 match (second one succeeded)
        expect(result.evidence_matches.length).toBe(1);
        expect(result.is_complete).toBe(true);
      });

      it("handles all failures gracefully", async () => {
        const commitment = createCommitment();
        const evidence1 = createEvidence({ id: "evidence_1" });
        const evidence2 = createEvidence({ id: "evidence_2" });

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockRejectedValue(
          new Error("API error")
        );

        const result = await verifyCommitment(commitment, [
          evidence1,
          evidence2,
        ]);

        // Both failed, no matches
        expect(result.evidence_matches.length).toBe(0);
        expect(result.is_complete).toBe(false);
      });
    });

    describe("summary generation", () => {
      it("generates completion summary", async () => {
        const commitment = createCommitment({
          title: "Deploy to production",
        });
        const evidence = createEvidence();

        vi.mocked(geminiModule.analyzeEvidenceRelevance).mockResolvedValue({
          is_relevant: true,
          confidence_score: 0.9,
          reasoning: "Perfect match",
          key_signals: [],
          concerns: [],
        });

        const result = await verifyCommitment(commitment, [evidence]);

        expect(result.summary).toContain("Deploy to production");
        expect(result.summary).toContain("complete");
      });

      it("generates no-evidence summary", async () => {
        const commitment = createCommitment({
          title: "Review PR",
        });

        const result = await verifyCommitment(commitment, []);

        expect(result.summary).toContain("No evidence");
        expect(result.summary).toContain("inconclusive");
      });
    });
  });
});
