import { logger } from "../shared/utils";
import { callGeminiExtraction } from "./gemini";
import {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
} from "./prompts";
import { EXTRACTION_BATCH_SIZE } from "./config";
import type { NormalizedGmailMessage } from "./prefilter";
import type { ExtractedCommitment } from "./types";

/**
 * Extract commitments from Gmail messages using Gemini.
 *
 * Input: Messages that passed the prefilter.
 * Process:
 *   1. Batch messages for efficiency
 *   2. Call Gemini for each batch
 *   3. Parse JSON responses
 *   4. Validate extracted data
 *   5. Fallback extraction if Gemini API fails due to rate limits / quota (429)
 *
 * Output: Structured commitment candidates ready for confidence scoring.
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
          body: msg.body || msg.body_text || msg.snippet || "",
        }))
      );

      const response = await callGeminiExtraction(systemPrompt, userPrompt);
      const parsed = parseExtractionResponse(response);

      if (parsed.length > 0) {
        allExtracted.push(...parsed);
      } else {
        logger.info(`Batch ${batchIdx + 1} Gemini returned empty commitment set`);
      }

      logger.info(`Batch ${batchIdx + 1} extraction succeeded`, {
        commitmentCount: parsed.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Batch ${batchIdx + 1} LLM extraction failed`, {
        error: errorMessage,
        messageCount: batch.length,
      });

      // Fallback extraction only when LLM rate limits (429) or quota exhausted
      const isQuotaError =
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("404");

      if (isQuotaError) {
        logger.info("Executing rate-limit fallback extractor for batch");
        const fallbackItems = extractFallbackCommitments(batch);
        allExtracted.push(...fallbackItems);
      } else {
        continue;
      }
    }
  }

  logger.info("Commitment extraction complete", {
    totalExtracted: allExtracted.length,
    totalMessages: messages.length,
  });

  return allExtracted;
}

/**
 * Fallback extraction logic for prefiltered messages when LLM is unavailable or rate limited.
 */
function extractFallbackCommitments(batch: NormalizedGmailMessage[]): ExtractedCommitment[] {
  const extracted: ExtractedCommitment[] = [];

  for (const msg of batch) {
    const text = `${msg.subject || ""} ${msg.body || msg.body_text || msg.snippet || ""}`;
    const fromSender = msg.from || "Requester";

    let taskTitle = msg.subject || "Follow up on commitment";
    if (!taskTitle || taskTitle.toLowerCase() === "no subject" || taskTitle.length < 3) {
      taskTitle = text.substring(0, 60);
    }

    let deadlineStr: string | null = null;
    const deadlineMatch = text.match(/\bby\s+(today|tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday|eod|\d{1,2}\/\d{1,2})\b/i);
    if (deadlineMatch) {
      deadlineStr = deadlineMatch[0];
    }

    let linkedRepo: string | null = null;
    const repoMatch = text.match(/https:\/\/github\.com\/[^\s\)]+/i);
    if (repoMatch) {
      linkedRepo = repoMatch[0];
    }

    extracted.push({
      owner: fromSender,
      task: taskTitle,
      description: text.substring(0, 300),
      deadline: deadlineStr,
      source: "gmail",
      sourceReference: `gmail_msg_${msg.id}`,
      verificationMethod: linkedRepo ? "github_commit" : "manual",
      confidenceReasoning: "Extracted via smart pattern fallback (LLM rate limited)",
    } as ExtractedCommitment);
  }

  return extracted;
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
 */
function parseExtractionResponse(
  rawResponse: string
): ExtractedCommitment[] {
  try {
    const parsed = JSON.parse(rawResponse);

    if (!parsed.commitments || !Array.isArray(parsed.commitments)) {
      return [];
    }

    const validated = parsed.commitments.filter(
      (commitment: unknown): commitment is ExtractedCommitment => {
        if (typeof commitment !== "object" || commitment === null) {
          return false;
        }

        const obj = commitment as Record<string, unknown>;

        const hasOwner = "owner" in obj;
        const hasTask = "task" in obj;
        const hasDescription = "description" in obj;
        const hasSource = "source" in obj;
        const hasVerificationMethod = "verificationMethod" in obj;

        return (
          hasOwner &&
          hasTask &&
          hasDescription &&
          hasSource &&
          hasVerificationMethod
        );
      }
    );

    return validated;
  } catch (error) {
    return [];
  }
}
