import { logger } from "../shared/utils";
import { callGeminiExtraction } from "./gemini";
import {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
} from "./prompts";
import { EXTRACTION_BATCH_SIZE } from "./config";
import type { NormalizedGmailMessage } from "./prefilter";
import type { ExtractedCommitment, GeminiExtractionResponse } from "./types";

/**
 * Extract commitments from Gmail messages using Gemini.
 *
 * Input: Messages that passed the prefilter.
 * Process:
 *   1. Batch messages for efficiency
 *   2. Call Gemini for each batch
 *   3. Parse JSON responses
 *   4. Validate extracted data
 *   5. Return extracted commitments
 *
 * Output: Structured commitment candidates ready for confidence scoring.
 *
 * Error handling: Errors in a batch are logged and skipped; other batches continue.
 */
export async function extractCommitments(
  messages: NormalizedGmailMessage[]
): Promise<ExtractedCommitment[]> {
  if (messages.length === 0) {
    return [];
  }

  logger.info("Starting commitment extraction", {
    messageCount: messages.length,
    batchSize: EXTRACTION_BATCH_SIZE,
  });

  const systemPrompt = buildExtractionSystemPrompt();
  const batches = createBatches(messages, EXTRACTION_BATCH_SIZE);
  const allExtracted: ExtractedCommitment[] = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    try {
      logger.info(`Processing batch ${batchIdx + 1}/${batches.length}`, {
        batchSize: batch.length,
      });

      const userPrompt = buildExtractionUserPrompt(
        batch.map((msg) => ({
          from: msg.from,
          subject: msg.subject,
          body: msg.body,
        }))
      );

      const response = await callGeminiExtraction(systemPrompt, userPrompt);
      const parsed = parseExtractionResponse(response);

      allExtracted.push(...parsed);

      logger.info(`Batch ${batchIdx + 1} extraction succeeded`, {
        commitmentCount: parsed.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Batch ${batchIdx + 1} extraction failed`, {
        error: errorMessage,
        messageCount: batch.length,
      });

      // Continue with next batch rather than failing entirely
      continue;
    }
  }

  logger.info("Commitment extraction complete", {
    totalExtracted: allExtracted.length,
    totalMessages: messages.length,
  });

  return allExtracted;
}

/**
 * Split an array into batches of specified size.
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Parse Gemini's JSON extraction response.
 * Returns the commitments array; validates structure but allows partial failures.
 */
function parseExtractionResponse(
  rawResponse: string
): ExtractedCommitment[] {
  try {
    const parsed = JSON.parse(rawResponse);

    if (!parsed.commitments || !Array.isArray(parsed.commitments)) {
      logger.warn("Invalid extraction response structure", {
        hasCommitments: !!parsed.commitments,
        isArray: Array.isArray(parsed.commitments),
      });

      return [];
    }

    const validated = parsed.commitments.filter(
      (commitment: unknown): commitment is ExtractedCommitment => {
        // First check if it's an object
        if (typeof commitment !== "object" || commitment === null) {
          logger.warn("Skipping non-object commitment");
          return false;
        }

        // Now we know it's an object, check for required fields
        const obj = commitment as Record<string, unknown>;

        const hasOwner = "owner" in obj;
        const hasTask = "task" in obj;
        const hasDescription = "description" in obj;
        const hasSource = "source" in obj;
        const hasVerificationMethod = "verificationMethod" in obj;

        if (
          !hasOwner ||
          !hasTask ||
          !hasDescription ||
          !hasSource ||
          !hasVerificationMethod
        ) {
          logger.warn("Skipping invalid commitment structure", {
            hasOwner,
            hasTask,
            hasDescription,
            hasSource,
            hasVerificationMethod,
          });

          return false;
        }

        return true;
      }
    );

    return validated;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Failed to parse extraction response", {
      error: errorMessage,
      responseLength: rawResponse.length,
    });

    return [];
  }
}
