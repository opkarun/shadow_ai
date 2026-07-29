import { logger } from "../shared/utils";
import { GEMINI_MODEL_ID, RETRY_CONFIG } from "./config";
import { getEnv } from "../shared/utils/env";

/**
 * Gemini API client wrapper for extraction and scoring.
 *
 * IMPORTANT: This is a stub interface for hackathon development.
 * Production implementation requires the real Google Generative AI SDK.
 *
 * For production, integrate with:
 * - Google Generative AI Python SDK (https://github.com/google/generative-ai-python)
 * - Or call the REST API directly with fetch
 *
 * Environment: Set GEMINI_API_KEY in .env
 */

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * Call Gemini API for commitment extraction.
 *
 * Stub implementation for hackathon.
 * Logs the request and returns mock structured data.
 * TODO: Integrate real Google Generative AI SDK for production.
 *
 * @param systemPrompt System instruction for the model
 * @param userPrompt User message with content to extract
 * @returns Raw text response from Gemini
 */
export async function callGeminiExtraction(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return callGeminiWithRetry(systemPrompt, userPrompt, "extraction");
}

/**
 * Call Gemini API for confidence scoring.
 *
 * Stub implementation for hackathon.
 * Logs the request and returns mock structured data.
 * TODO: Integrate real Google Generative AI SDK for production.
 *
 * @param systemPrompt System instruction for the model
 * @param userPrompt User message with candidate to score
 * @returns Raw text response from Gemini
 */
export async function callGeminiScoring(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return callGeminiWithRetry(systemPrompt, userPrompt, "scoring");
}

/**
 * Internal: Call Gemini with exponential backoff retry logic.
 */
async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  operation: string
): Promise<string> {
  const apiKey = getEnv("GEMINI_API_KEY");

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      logger.info(`Attempting Gemini ${operation} call`, {
        model: GEMINI_MODEL_ID,
        attempt,
        operation,
      });

      // TODO: Replace with real API call to Google Generative AI REST endpoint
      // For now, we call the API as documented:
      // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
      // with apiKey as query parameter

      const response = await callGeminiAPI(
        apiKey,
        systemPrompt,
        userPrompt
      );

      logger.info(`Gemini ${operation} succeeded`, {
        model: GEMINI_MODEL_ID,
        attempt,
      });

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTransient =
        lastError.message.includes("429") || // Rate limit
        lastError.message.includes("500") || // Server error
        lastError.message.includes("RESOURCE_EXHAUSTED") ||
        lastError.message.includes("DEADLINE_EXCEEDED") ||
        lastError.message.includes("UNAVAILABLE") ||
        lastError.message.includes("ECONNREFUSED"); // Network error

      if (!isTransient || attempt === RETRY_CONFIG.MAX_RETRIES) {
        logger.error(
          `Gemini ${operation} failed after ${attempt} attempts`,
          {
            model: GEMINI_MODEL_ID,
            error: lastError.message,
            isTransient,
          }
        );

        throw lastError;
      }

      const backoffMs =
        RETRY_CONFIG.INITIAL_BACKOFF_MS *
        Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);

      logger.warn(
        `Gemini ${operation} transient failure, retrying in ${backoffMs}ms`,
        {
          attempt,
          nextAttempt: attempt + 1,
          error: lastError.message,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error("Gemini call failed");
}

/**
 * Make REST call to Google Generative AI API.
 * TODO: Implement real API call with fetch.
 */
async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // TODO: Implement real API call
  // This is where the production code would:
  // 1. Build the request body with system prompt and user message
  // 2. Call the Google Generative AI API
  // 3. Parse and return the text response

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

  const response = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GeminiResponse;

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}
