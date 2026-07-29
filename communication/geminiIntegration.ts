/**
 * Gemini API integration for communication draft generation.
 *
 * Handles all LLM calls for drafting acknowledgements, completions, recovery,
 * and extension-request messages. Implements exponential backoff retry logic
 * and comprehensive structured logging.
 *
 * Environment: Set GEMINI_API_KEY in .env
 */

import { logger } from "../shared/utils";
import { GEMINI_MODEL_ID, RETRY_CONFIG } from "./config";
import { getEnv } from "../shared/utils/env";
import type { CommunicationDraftType } from "../shared/types";
import type { GeminiDraftGenerationResult } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Response structure from Gemini API.
 * Mirrors the actual Google Generative AI API response format.
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Call Gemini to generate a draft message.
 *
 * Implements retry logic with exponential backoff for transient failures.
 * Logs all attempts and results for debugging and audit purposes.
 *
 * @param systemPrompt System instruction defining tone and goal
 * @param userPrompt User message with commitment context
 * @param draftType Type of draft being generated (for logging)
 * @returns Generated draft content as a string
 * @throws Error if all retries are exhausted
 */
export async function callGeminiDraftGeneration(
  systemPrompt: string,
  userPrompt: string,
  draftType: CommunicationDraftType
): Promise<string> {
  return callGeminiWithRetry(systemPrompt, userPrompt, draftType);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Internal: Call Gemini with exponential backoff retry logic.
 *
 * Distinguishes between transient errors (429, 500, RESOURCE_EXHAUSTED, etc.)
 * and permanent errors (invalid request, auth failure, etc.). Retries only
 * on transient errors.
 */
async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  draftType: CommunicationDraftType
): Promise<string> {
  const apiKey = getEnv("GEMINI_API_KEY");

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      logger.info(`Attempting Gemini draft generation call`, {
        model: GEMINI_MODEL_ID,
        draftType,
        attempt,
      });

      const response = await callGeminiAPI(apiKey, systemPrompt, userPrompt);

      logger.info(`Gemini draft generation succeeded`, {
        model: GEMINI_MODEL_ID,
        draftType,
        attempt,
        contentLength: response.length,
      });

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTransient = isTransientError(lastError.message);

      // If it's a permanent error or we've exhausted retries, give up
      if (!isTransient || attempt === RETRY_CONFIG.MAX_RETRIES) {
        logger.error(
          `Gemini draft generation failed after ${attempt} attempt${attempt === 1 ? "" : "s"}`,
          {
            model: GEMINI_MODEL_ID,
            draftType,
            attempt,
            error: lastError.message,
            isTransient,
          }
        );

        throw lastError;
      }

      // Log the transient failure and retry
      const backoffMs =
        RETRY_CONFIG.INITIAL_BACKOFF_MS *
        Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);

      logger.warn(
        `Gemini draft generation transient failure, retrying in ${backoffMs}ms`,
        {
          draftType,
          attempt,
          nextAttempt: attempt + 1,
          error: lastError.message,
          backoffMs,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error("Gemini draft generation failed after all retries");
}

/**
 * Determine if an error is transient (retryable) or permanent.
 *
 * Transient errors include:
 * - Rate limits (429)
 * - Server errors (500+)
 * - Resource exhaustion
 * - Deadline exceeded
 * - Unavailable
 * - Network errors
 *
 * Permanent errors include:
 * - Invalid request (400)
 * - Auth failure (401, 403)
 * - Not found (404)
 */
function isTransientError(errorMessage: string): boolean {
  return (
    errorMessage.includes("429") || // Rate limit
    errorMessage.includes("500") || // Server error
    errorMessage.includes("RESOURCE_EXHAUSTED") ||
    errorMessage.includes("DEADLINE_EXCEEDED") ||
    errorMessage.includes("UNAVAILABLE") ||
    errorMessage.includes("ECONNREFUSED") || // Network error
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("ETIMEDOUT")
  );
}

/**
 * Make the actual REST call to the Google Generative AI API.
 *
 * Handles request formatting, error parsing, and response extraction.
 * Does not implement retry logic — that's handled by the caller.
 *
 * @param apiKey Gemini API key
 * @param systemPrompt System instruction for the model
 * @param userPrompt User message with content to process
 * @returns Extracted text from the model's response
 * @throws Error if the API call fails or returns empty content
 */
async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent`;

  const requestBody = {
    system_instruction: {
      parts: {
        text: systemPrompt,
      },
    },
    contents: [
      {
        parts: [
          {
            text: userPrompt,
          },
        ],
      },
    ],
  };

  let response: Response;

  try {
    response = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000), // 30 second timeout
    });
  } catch (error) {
    // Network error or timeout
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API request failed: ${message}`);
  }

  // Handle HTTP errors
  if (!response.ok) {
    const statusText = response.statusText || `HTTP ${response.status}`;
    let detail = "";

    try {
      const errorData = (await response.json()) as GeminiResponse;
      if (errorData.error?.message) {
        detail = ` — ${errorData.error.message}`;
      }
    } catch {
      // Could not parse error response; use status text only
    }

    throw new Error(`Gemini API error: ${statusText}${detail}`);
  }

  // Parse successful response
  let data: GeminiResponse;

  try {
    data = (await response.json()) as GeminiResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Gemini API response: ${message}`);
  }

  // Extract text from response
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text) {
    throw new Error(
      "Empty response from Gemini API (no text content in candidates)"
    );
  }

  return text;
}

/**
 * Parse a draft generation response and validate it.
 *
 * This is a wrapper around the raw API call that adds validation
 * and can be extended with additional parsing logic if needed.
 *
 * @param systemPrompt System instruction for the model
 * @param userPrompt User message with content
 * @param draftType Type of draft being generated
 * @returns Parsed draft generation result
 */
export async function generateDraftContent(
  systemPrompt: string,
  userPrompt: string,
  draftType: CommunicationDraftType
): Promise<GeminiDraftGenerationResult> {
  const content = await callGeminiDraftGeneration(
    systemPrompt,
    userPrompt,
    draftType
  );

  // Basic validation: check length
  if (content.length === 0) {
    throw new Error("Gemini returned empty draft content");
  }

  return {
    content,
    reasoning: undefined,
  };
}
