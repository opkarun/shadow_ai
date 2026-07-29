/**
 * Detection Pipeline Orchestrator
 *
 * Wires together the three stages of commitment detection:
 * 1. Prefilter - Noise reduction (cheap regex checks)
 * 2. Extract - LLM extraction of candidate commitments
 * 3. Score Confidence - Confidence assessment for automation tier
 *
 * This is the internal orchestrator; use detection/index.ts for the public API.
 */

import { logger } from "../shared/utils";
import { prefilterMessage, type NormalizedGmailMessage } from "./prefilter";
import { extractCommitments } from "./extract";
import { scoreConfidence } from "./scoreConfidence";
import type { ExtractedCommitment, ConfidenceScoreResult } from "./types";

/**
 * Result of the full detection pipeline.
 * Represents a commitment that has passed all three stages.
 */
export interface ScoredCommitment extends ExtractedCommitment {
  /** Confidence assessment from the scoring stage */
  confidenceScore: number;
  confidenceTier: "HIGH" | "MEDIUM" | "LOW";
  confidenceExplanation: string;
}

/**
 * Run the full detection pipeline on Gmail messages.
 *
 * Orchestrates:
 * 1. Prefilter - Remove obvious non-commitments
 * 2. Extract - Use Gemini to extract commitment structure
 * 3. Score - Assess confidence of each candidate
 *
 * @param messages - Normalized Gmail messages
 * @returns Scored commitment candidates ready for persistence
 */
export async function runDetectionPipeline(
  messages: NormalizedGmailMessage[]
): Promise<ScoredCommitment[]> {
  logger.info("Starting detection pipeline", {
    messageCount: messages.length,
  });

  // Stage 1: Prefilter
  logger.info("Stage 1: Prefiltering messages");
  const prefiltered = messages.filter((msg) => {
    const result = prefilterMessage(msg);
    return result.passes_prefilter;
  });

  logger.info("Prefilter complete", {
    inputCount: messages.length,
    passedCount: prefiltered.length,
    filteredOutCount: messages.length - prefiltered.length,
  });

  if (prefiltered.length === 0) {
    logger.info("No messages passed prefilter, pipeline complete");
    return [];
  }

  // Stage 2: Extract
  logger.info("Stage 2: Extracting commitments");
  let extracted: ExtractedCommitment[] = [];

  try {
    extracted = await extractCommitments(prefiltered);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Extraction stage failed", {
      error: errorMessage,
    });
    // Continue with empty results rather than crashing
  }

  logger.info("Extraction complete", {
    candidateCount: extracted.length,
  });

  if (extracted.length === 0) {
    logger.info("No commitments extracted, pipeline complete");
    return [];
  }

  // Stage 3: Score Confidence
  logger.info("Stage 3: Scoring confidence");
  const scored = extracted
    .map((commitment) => {
      try {
        const scoreResult = scoreConfidence(commitment);

        return {
          ...commitment,
          confidenceScore: scoreResult.confidenceScore,
          confidenceTier: scoreResult.tier,
          confidenceExplanation: scoreResult.explanation,
        } as ScoredCommitment;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("Scoring failed for commitment", {
          task: commitment.task,
          error: errorMessage,
        });

        // Fall back to conservative MEDIUM confidence
        return {
          ...commitment,
          confidenceScore: 0.5,
          confidenceTier: "MEDIUM",
          confidenceExplanation:
            "Scoring failed; assigned conservative MEDIUM confidence",
        } as ScoredCommitment;
      }
    })
    .filter((result) => result !== null) as ScoredCommitment[];

  logger.info("Pipeline complete", {
    scoredCount: scored.length,
    byTier: {
      HIGH: scored.filter((c) => c.confidenceTier === "HIGH").length,
      MEDIUM: scored.filter((c) => c.confidenceTier === "MEDIUM").length,
      LOW: scored.filter((c) => c.confidenceTier === "LOW").length,
    },
  });

  return scored;
}
