/**
 * Tests for aggregation utilities
 *
 * Tests data aggregation, calculations, and transformations.
 */

import { describe, it, expect } from "vitest";
import {
  calculateDaysRemaining,
  formatDeadlineLabel,
  determineRiskLevel,
  groupCommitmentsByStatus,
  getRequesterStats,
  getTimeBasedMetrics,
} from "../../services/aggregation";
import { createMockCommitment } from "../setup";

describe("Aggregation Utilities", () => {
  describe("calculateDaysRemaining", () => {
    it("returns null for no deadline", () => {
      const result = calculateDaysRemaining(null);
      expect(result).toBe(null);
    });

    it("calculates days remaining correctly", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = calculateDaysRemaining(tomorrow);
      expect(result).toBe(1);
    });

    it("calculates days overdue correctly", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = calculateDaysRemaining(yesterday);
      expect(result).toBeLessThan(0);
    });

    it("handles today deadline", () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const result = calculateDaysRemaining(today);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe("formatDeadlineLabel", () => {
    it("returns 'No deadline' for null", () => {
      expect(formatDeadlineLabel(null)).toBe("No deadline");
    });

    it("returns 'Today' for 0 days remaining", () => {
      expect(formatDeadlineLabel(0)).toBe("Today");
    });

    it("returns 'Tomorrow' for 1 day remaining", () => {
      expect(formatDeadlineLabel(1)).toBe("Tomorrow");
    });

    it("formats multiple days remaining", () => {
      expect(formatDeadlineLabel(5)).toBe("5 days left");
      expect(formatDeadlineLabel(30)).toBe("30 days left");
    });

    it("formats overdue days", () => {
      expect(formatDeadlineLabel(-1)).toBe("1 day overdue");
      expect(formatDeadlineLabel(-5)).toBe("5 days overdue");
    });
  });

  describe("determineRiskLevel", () => {
    it("returns HIGH for OVERDUE status", () => {
      const result = determineRiskLevel("OVERDUE", null, 0.9);
      expect(result).toBe("HIGH");
    });

    it("returns HIGH for AT_RISK status", () => {
      const result = determineRiskLevel("AT_RISK", null, 0.9);
      expect(result).toBe("HIGH");
    });

    it("returns LOW for COMPLETED status", () => {
      const result = determineRiskLevel("COMPLETED", null, 0.1);
      expect(result).toBe("LOW");
    });

    it("returns HIGH for low confidence", () => {
      const result = determineRiskLevel("PENDING", null, 0.3);
      expect(result).toBe("HIGH");
    });

    it("returns MEDIUM for medium confidence", () => {
      const result = determineRiskLevel("PENDING", null, 0.6);
      expect(result).toBe("MEDIUM");
    });

    it("returns LOW for high confidence", () => {
      const result = determineRiskLevel("PENDING", null, 0.8);
      expect(result).toBe("LOW");
    });

    it("factors in time remaining", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const result = determineRiskLevel("PENDING", futureDate, 0.9);
      expect(result).toBe("LOW");
    });
  });

  describe("groupCommitmentsByStatus", () => {
    it("returns empty object for empty array", () => {
      const result = groupCommitmentsByStatus([]);
      expect(result).toEqual({});
    });

    it("groups commitments by status", () => {
      const commitments = [
        createMockCommitment({ id: "1", status: "PENDING" }),
        createMockCommitment({ id: "2", status: "PENDING" }),
        createMockCommitment({ id: "3", status: "COMPLETED" }),
      ];

      const result = groupCommitmentsByStatus(commitments);

      expect(result.PENDING).toHaveLength(2);
      expect(result.COMPLETED).toHaveLength(1);
    });

    it("includes all status groups", () => {
      const commitments = [
        createMockCommitment({ status: "PENDING" }),
        createMockCommitment({ status: "AT_RISK" }),
        createMockCommitment({ status: "OVERDUE" }),
        createMockCommitment({ status: "COMPLETED" }),
      ];

      const result = groupCommitmentsByStatus(commitments);

      expect(Object.keys(result)).toHaveLength(4);
    });
  });

  describe("getRequesterStats", () => {
    it("returns empty array for empty commitments", () => {
      const result = getRequesterStats([]);
      expect(result).toEqual([]);
    });

    it("calculates stats per requester", () => {
      const commitments = [
        createMockCommitment({
          id: "1",
          requester: "alice@example.com",
          status: "COMPLETED",
        }),
        createMockCommitment({
          id: "2",
          requester: "alice@example.com",
          status: "PENDING",
        }),
        createMockCommitment({
          id: "3",
          requester: "bob@example.com",
          status: "COMPLETED",
        }),
      ];

      const result = getRequesterStats(commitments);

      const aliceStats = result.find(
        (s) => s.requester === "alice@example.com"
      );
      expect(aliceStats?.count).toBe(2);
      expect(aliceStats?.completed).toBe(1);

      const bobStats = result.find((s) => s.requester === "bob@example.com");
      expect(bobStats?.count).toBe(1);
      expect(bobStats?.completed).toBe(1);
    });

    it("calculates average confidence per requester", () => {
      const commitments = [
        createMockCommitment({
          requester: "alice@example.com",
          confidence_score: 0.8,
        }),
        createMockCommitment({
          requester: "alice@example.com",
          confidence_score: 0.6,
        }),
      ];

      const result = getRequesterStats(commitments);
      const aliceStats = result[0];

      expect(aliceStats.avgConfidence).toBe(0.7);
    });

    it("counts overdue commitments", () => {
      const commitments = [
        createMockCommitment({
          requester: "alice@example.com",
          status: "OVERDUE",
        }),
        createMockCommitment({
          requester: "alice@example.com",
          status: "PENDING",
        }),
      ];

      const result = getRequesterStats(commitments);
      const aliceStats = result[0];

      expect(aliceStats.overdue).toBe(1);
    });
  });

  describe("getTimeBasedMetrics", () => {
    it("returns zero metrics for empty commitments", () => {
      const result = getTimeBasedMetrics([]);

      expect(result.completionRate).toBe(0);
      expect(result.averageTimeToComplete).toBeNull();
      expect(result.onTimeCompletionRate).toBe(0);
    });

    it("calculates completion rate", () => {
      const commitments = [
        createMockCommitment({ status: "COMPLETED" }),
        createMockCommitment({ status: "COMPLETED" }),
        createMockCommitment({ status: "PENDING" }),
        createMockCommitment({ status: "PENDING" }),
      ];

      const result = getTimeBasedMetrics(commitments);
      expect(result.completionRate).toBe(50);
    });

    it("calculates on-time completion rate", () => {
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 1);

      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 1);

      const commitments = [
        createMockCommitment({
          status: "COMPLETED",
          deadline: futureDeadline,
        }),
        createMockCommitment({
          status: "COMPLETED",
          deadline: pastDeadline,
        }),
      ];

      const result = getTimeBasedMetrics(commitments);
      expect(result.onTimeCompletionRate).toBe(50);
    });

    it("calculates average time to complete", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const commitments = [
        createMockCommitment({
          status: "COMPLETED",
          created_at: past,
          updated_at: now,
        }),
      ];

      const result = getTimeBasedMetrics(commitments);
      expect(result.averageTimeToComplete).toBeCloseTo(7, 0);
    });
  });
});
