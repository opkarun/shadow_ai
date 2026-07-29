/**
 * Detection Module - Public API
 *
 * Single entry point for the entire Detection module.
 * Orchestrates: Prefilter → Extract → Score → Persist
 *
 * Usage:
 *   const results = await detectAndPersistCommitments(userId, messages);
 */

import { logger } from "../shared/utils";
import { runDetectionPipeline } from "./pipeline";
import { persistScoredCommitmentsBatch } from "./persist";
import type { NormalizedGmailMessage } from "./prefilter";
import type { Commitment } from "../shared/types";

/**
 * Main entry point: Detect commitments from Gmail messages and persist to database.
 *
 * This is the function external modules (ingestion layer, webhooks, etc.) should call.
 *
 * Orchestrates the full detection pipeline:
 * 1. Prefilter - Noise reduction (cheap regex checks)
 * 2. Extract - LLM-powered commitment extraction
 * 3. Score - Confidence assessment
 * 4. Persist - Save to MongoDB with appropriate status
 *
 * HIGH-confidence commitments are auto-created (CONFIRMED).
 * MEDIUM-confidence commitments await user confirmation (DETECTED).
 * LOW-confidence commitments are silently dismissed.
 *
 * @param userId - User ID for ownership
 * @param messages - Normalized Gmail messages to process
 * @returns Array of persisted Commitments (only those that passed all stages)
 */
export async function detectAndPersistCommitments(
  userId: string,
  messages: NormalizedGmailMessage[]
): Promise<Commitment[]> {
  logger.info("Starting detection and persistence", {
    userId,
    messageCount: messages.length,
  });

  try {
    // Run the detection pipeline (prefilter → extract → score)
    const scored = await runDetectionPipeline(messages);

    if (scored.length === 0) {
      logger.info("No commitments detected in this batch", { userId });
      return [];
    }

    // Persist scored commitments to database
    const persisted = await persistScoredCommitmentsBatch(userId, scored);

    logger.info("Detection and persistence complete", {
      userId,
      persistedCount: persisted.length,
    });

    return persisted;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Detection and persistence failed", {
      userId,
      error: errorMessage,
    });

    // Re-throw to let caller handle the error
    throw error;
  }
}

// ============================================================================
// EXPORTS - Public API
// ============================================================================

// Types (for external use)
export type { NormalizedGmailMessage } from "./prefilter";
export type { ExtractedCommitment } from "./types";
export type { ConfidenceScoreResult, ConfidenceTier } from "./types";
export type { ScoredCommitment } from "./pipeline";

// Individual stage functions (for advanced use cases)
export { prefilterMessage } from "./prefilter";
export { extractCommitments } from "./extract";
export { scoreConfidence } from "./scoreConfidence";
export { runDetectionPipeline } from "./pipeline";
export { persistScoredCommitment, persistScoredCommitmentsBatch } from "./persist";
