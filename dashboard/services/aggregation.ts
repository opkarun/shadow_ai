/**
 * Dashboard Data Aggregation
 *
 * Utilities for aggregating and computing statistics from commitments and related data.
 * Reuses logic from Detection, Verification, and Communication modules where appropriate.
 */

import type { Commitment } from "../../shared/types";
import type { DashboardStats } from "../store";

/**
 * Compute dashboard statistics from a list of commitments
 */
export function computeDashboardStats(
  commitments: Commitment[]
): DashboardStats {
  const now = new Date();

  let total = 0;
  let atRisk = 0;
  let dueToday = 0;
  let completed = 0;
  let overdue = 0;

  commitments.forEach((c) => {
    total++;

    // Count by status
    if (c.status === "COMPLETED") {
      completed++;
    } else if (c.status === "OVERDUE") {
      overdue++;
    } else if (c.status === "AT_RISK") {
      atRisk++;
    }

    // Check if due today
    if (c.deadline) {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      if (c.deadline >= startOfToday && c.deadline <= endOfToday) {
        dueToday++;
      }
    }
  });

  return {
    total,
    atRisk: atRisk + overdue,
    dueToday,
    completed,
    overdue,
  };
}

/**
 * Calculate days remaining until deadline
 */
export function calculateDaysRemaining(deadline: Date | null): number | null {
  if (!deadline) return null;

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  // Round to nearest day
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format relative deadline label for display
 */
export function formatDeadlineLabel(daysRemaining: number | null): string {
  if (daysRemaining === null) {
    return "No deadline";
  }

  if (daysRemaining === 0) {
    return "Today";
  }

  if (daysRemaining === 1) {
    return "Tomorrow";
  }

  if (daysRemaining > 0) {
    return `${daysRemaining} days left`;
  }

  // Overdue
  const daysOverdue = Math.abs(daysRemaining);
  return `${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`;
}

/**
 * Determine visual risk level based on commitment state
 *
 * Integrates with Verification module's risk detection logic
 */
export function determineRiskLevel(
  status: string,
  deadline: Date | null,
  confidenceScore: number
): "LOW" | "MEDIUM" | "HIGH" {
  // Status-based risk
  if (status === "OVERDUE" || status === "AT_RISK") {
    return "HIGH";
  }

  if (status === "COMPLETED") {
    return "LOW";
  }

  // Time-based risk
  const daysRemaining = calculateDaysRemaining(deadline);

  if (daysRemaining !== null) {
    if (daysRemaining <= 0) return "HIGH";
    if (daysRemaining <= 2) return "MEDIUM";
    if (daysRemaining <= 7) {
      // Use confidence to modulate
      if (confidenceScore < 0.5) return "MEDIUM";
      if (confidenceScore < 0.75) return "LOW";
      return "LOW";
    }
  }

  // Confidence-based risk
  if (confidenceScore < 0.4) return "HIGH";
  if (confidenceScore < 0.75) return "MEDIUM";

  return "LOW";
}

/**
 * Group commitments by status
 */
export function groupCommitmentsByStatus(
  commitments: Commitment[]
): Record<string, Commitment[]> {
  return commitments.reduce(
    (acc, commitment) => {
      const status = commitment.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(commitment);
      return acc;
    },
    {} as Record<string, Commitment[]>
  );
}

/**
 * Calculate statistics by requester
 */
export function getRequesterStats(
  commitments: Commitment[]
): Array<{
  requester: string;
  count: number;
  completed: number;
  overdue: number;
  avgConfidence: number;
}> {
  const requesterMap = new Map<
    string,
    {
      count: number;
      completed: number;
      overdue: number;
      totalConfidence: number;
    }
  >();

  commitments.forEach((c) => {
    const requester = c.requester || "Unknown";
    if (!requesterMap.has(requester)) {
      requesterMap.set(requester, {
        count: 0,
        completed: 0,
        overdue: 0,
        totalConfidence: 0,
      });
    }

    const stats = requesterMap.get(requester)!;
    stats.count++;
    stats.totalConfidence += c.confidence_score;

    if (c.status === "COMPLETED") {
      stats.completed++;
    } else if (c.status === "OVERDUE") {
      stats.overdue++;
    }
  });

  return Array.from(requesterMap.entries()).map(([requester, stats]) => ({
    requester,
    count: stats.count,
    completed: stats.completed,
    overdue: stats.overdue,
    avgConfidence: stats.totalConfidence / stats.count,
  }));
}

/**
 * Calculate time-based metrics for the dashboard
 */
export function getTimeBasedMetrics(commitments: Commitment[]): {
  completionRate: number;
  averageTimeToComplete: number | null;
  onTimeCompletionRate: number;
} {
  const now = new Date();
  const completed = commitments.filter((c) => c.status === "COMPLETED");

  let completionRate = 0;
  if (commitments.length > 0) {
    completionRate = (completed.length / commitments.length) * 100;
  }

  let averageTimeToComplete: number | null = null;
  if (completed.length > 0) {
    const totalTime = completed.reduce((sum, c) => {
      const createdAt = new Date(c.created_at).getTime();
      const updatedAt = new Date(c.updated_at).getTime();
      return sum + (updatedAt - createdAt);
    }, 0);

    averageTimeToComplete = Math.round(totalTime / completed.length / (1000 * 60 * 60 * 24)); // in days
  }

  let onTimeCompletionRate = 0;
  if (completed.length > 0) {
    const onTime = completed.filter((c) => {
      if (!c.deadline) return true; // No deadline = technically on time
      return new Date(c.updated_at) <= c.deadline;
    }).length;

    onTimeCompletionRate = (onTime / completed.length) * 100;
  }

  return {
    completionRate,
    averageTimeToComplete,
    onTimeCompletionRate,
  };
}
