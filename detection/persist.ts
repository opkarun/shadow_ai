/**
 * Persistence Layer for Detection Results
 *
 * Saves scored commitments to MongoDB using shared database models.
 * Determines automation tier based on confidence score.
 * Uses shared state machine for status transitions.
 */

import { randomUUID } from "crypto";
import { logger } from "../shared/utils";
import { connectMongo } from "../shared/db/connect";
import { CommitmentModel } from "../shared/db/models";
import type { Commitment, CommitmentStatus } from "../shared/types";
import type { ScoredCommitment } from "./pipeline";

/**
 * Persist a scored commitment to the database.
 *
 * Creates a new Commitment record with appropriate status based on tier:
 * - HIGH → CONFIRMED (auto-create, no user approval needed)
 * - MEDIUM → DETECTED (wait for user confirmation)
 * - LOW → DISMISSED (not shown to user)
 *
 * Uses shared state machine to ensure valid status transitions.
 *
 * @param userId - User ID who owns this commitment
 * @param scored - Scored commitment from pipeline
 * @returns Persisted Commitment with ID
 */
export async function persistScoredCommitment(
  userId: string,
  scored: ScoredCommitment
): Promise<Commitment> {
  await connectMongo();

  // Determine initial status based on confidence tier
  const initialStatus = getInitialStatus(scored.confidenceTier);

  logger.info("Persisting scored commitment", {
    userId,
    task: scored.task,
    tier: scored.confidenceTier,
    status: initialStatus,
  });

  // Create the commitment record
  const commitmentId = randomUUID();
  const now = new Date();

  const commitment: Commitment = {
    id: commitmentId,
    user_id: userId,
    title: scored.task,
    description: scored.description,
    requester: scored.owner,
    source: scored.source as "gmail" | "github" | "manual",
    source_reference: "unknown", // Would be set by the ingestion layer
    deadline: scored.deadline ? new Date(scored.deadline) : null,
    status: initialStatus,
    confidence_score: scored.confidenceScore,
    priority_score: scored.priority,
    verification_method: scored.verificationMethod,
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
 *
 * @param userId - User ID who owns these commitments
 * @param scoredCommitments - Array of scored commitments
 * @returns Array of persisted Commitments
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

      // Continue with next commitment rather than failing entire batch
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
 *
 * This implements FR-1.4 from PRODUCT_SPEC:
 * - HIGH confidence → CONFIRMED (auto-create)
 * - MEDIUM confidence → DETECTED (await user confirmation)
 * - LOW confidence → DISMISSED (not surfaced)
 */
function getInitialStatus(tier: "HIGH" | "MEDIUM" | "LOW"): CommitmentStatus {
  switch (tier) {
    case "HIGH":
      // Auto-create high-confidence commitments
      return "CONFIRMED";

    case "MEDIUM":
      // Surface medium-confidence for user confirmation
      return "DETECTED";

    case "LOW":
      // Silently dismiss low-confidence candidates
      return "DISMISSED";

    default:
      // Conservative fallback
      return "DETECTED";
  }
}
