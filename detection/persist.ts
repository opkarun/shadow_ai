/**
 * Persistence Layer for Detection Results
 *
 * Saves scored commitments to MongoDB using shared database models.
 * Determines automation tier based on confidence score.
 * Uses shared state machine for status transitions.
 */

import { randomUUID } from "crypto";
import { logger } from "../shared/utils/index.js";
import { connectMongo } from "../shared/db/connect.js";
import { CommitmentModel } from "../shared/db/models.js";
import type { Commitment, CommitmentStatus } from "../shared/types/index.js";
import type { ScoredCommitment } from "./pipeline";

/**
 * Persist a scored commitment to the database.
 *
 * Creates a new Commitment record with appropriate status based on tier:
 * - HIGH → CONFIRMED (auto-create, no user approval needed)
 * - MEDIUM → DETECTED (wait for user confirmation)
 * - LOW → DISMISSED (not shown to user)
 */
export async function persistScoredCommitment(
  userId: string,
  scored: ScoredCommitment
): Promise<Commitment> {
  await connectMongo();

  const initialStatus = getInitialStatus(scored.confidenceTier);

  logger.info("Persisting scored commitment", {
    userId,
    task: scored.task,
    tier: scored.confidenceTier,
    status: initialStatus,
  });

  const commitmentId = randomUUID();
  const now = new Date();

  // Safely parse deadline into a valid Date object or null
  let parsedDeadline: Date | null = null;
  if (scored.deadline) {
    const d = new Date(scored.deadline);
    if (!isNaN(d.getTime())) {
      parsedDeadline = d;
    } else {
      const lower = String(scored.deadline).toLowerCase();
      const refDate = new Date();
      if (lower.includes("today") || lower.includes("eod")) {
        parsedDeadline = new Date(refDate.setHours(23, 59, 59, 999));
      } else if (lower.includes("tomorrow")) {
        parsedDeadline = new Date(refDate.setDate(refDate.getDate() + 1));
      } else if (lower.includes("friday")) {
        parsedDeadline = new Date(refDate.setDate(refDate.getDate() + (5 - refDate.getDay() + 7) % 7));
      }
    }
  }

  // Ensure priority_score is a valid number (1-5, default 3)
  const priorityScore =
    typeof scored.priority === "number" && !isNaN(scored.priority)
      ? scored.priority
      : 3;

  const commitment: Commitment = {
    id: commitmentId,
    user_id: userId,
    title: scored.task,
    description: scored.description || scored.task,
    requester: scored.owner || "Requester",
    source: (scored.source as "gmail" | "github" | "manual") || "gmail",
    source_reference: (scored as any).sourceReference || `gmail_msg_${randomUUID()}`,
    deadline: parsedDeadline,
    status: initialStatus,
    confidence_score: scored.confidenceScore ?? 0.7,
    priority_score: priorityScore,
    verification_method: scored.verificationMethod || "manual",
    linked_repo: scored.linkedRepo || null,
    created_at: now,
    updated_at: now,
  };

  // Save to database
  const created = await CommitmentModel.create(commitment);

  logger.info("Commitment persisted successfully", {
    commitmentId,
    status: initialStatus,
  });

  return created as unknown as Commitment;
}

/**
 * Persist multiple scored commitments in batch.
 */
export async function persistScoredCommitmentsBatch(
  userId: string,
  scoredCommitments: ScoredCommitment[]
): Promise<Commitment[]> {
  logger.info("Persisting batch of scored commitments", {
    userId,
    count: scoredCommitments.length,
  });

  const results: Commitment[] = [];

  for (const scored of scoredCommitments) {
    try {
      const persisted = await persistScoredCommitment(userId, scored);
      results.push(persisted);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to persist commitment", {
        task: scored.task,
        error: errorMessage,
      });

      continue;
    }
  }

  logger.info("Batch persistence complete", {
    successCount: results.length,
    totalCount: scoredCommitments.length,
  });

  return results;
}

/**
 * Determine initial commitment status based on confidence tier.
 */
function getInitialStatus(tier: "HIGH" | "MEDIUM" | "LOW"): CommitmentStatus {
  switch (tier) {
    case "HIGH":
      return "CONFIRMED";
    case "MEDIUM":
      return "DETECTED";
    case "LOW":
      return "DISMISSED";
    default:
      return "DETECTED";
  }
}
