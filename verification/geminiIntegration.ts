/**
 * Gemini API integration for evidence analysis and risk detection.
 *
 * Handles all LLM calls for analyzing evidence relevance, detecting risk,
 * and extracting GitHub context. Implements exponential backoff retry logic
 * and comprehensive structured logging.
 *
 * Environment: Set GEMINI_API_KEY in .env
 */

import { logger } from "../shared/utils";
import { GEMINI_MODEL_ID, GITHUB_RETRY_CONFIG } from "./config";
import { getEnv } from "../shared/utils/env";
import type { Commitment, Evidence } from "../shared/types";

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

/**
 * Result of analyzing evidence relevance.
 * Returned by Gemini when evaluating if evidence supports a commitment.
 */
export interface EvidenceAnalysisResponse {
  is_relevant: boolean;
  confidence_score: number;
  reasoning: string;
  key_signals: string[];
  concerns: string[];
}

/**
 * Result of risk detection analysis.
 * Returned by Gemini when assessing commitment risk.
 */
export interface RiskAnalysisResponse {
  risk_score: number;
  is_at_risk: boolean;
  contributing_factors: {
    time_pressure?: string;
    evidence_status?: string;
    activity_signals?: string;
    context_clues?: string;
  };
  recommendation: string;
}

/**
 * Result of GitHub context extraction.
 * Returned by Gemini when analyzing GitHub data.
 */
export interface GitHubContextResponse {
  commits?: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    key_keywords: string[];
  }>;
  pull_requests?: Array<{
    number: number;
    title: string;
    description: string;
    merged: boolean;
    merged_at: string;
    key_keywords: string[];
  }>;
  releases?: Array<{
    tag: string;
    name: string;
    description: string;
    published_at: string;
    key_keywords: string[];
  }>;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Analyze if a piece of evidence is relevant to a commitment.
 *
 * Calls Gemini to assess the confidence that evidence (e.g., a GitHub commit
 * or PR) actually supports the claim that a commitment has been completed.
 *
 * @param commitment The commitment being verified
 * @param evidence The evidence being analyzed
 * @param additionalContext Optional metadata (commit message, PR description, etc.)
 * @returns Evidence analysis result with confidence score and reasoning
 * @throws Error if the Gemini call fails after retries
 */
export async function analyzeEvidenceRelevance(
  systemPrompt: string,
  userPrompt: string,
  context: { commitment: Commitment; evidenceType: string }
): Promise<EvidenceAnalysisResponse> {
  const responseText = await callGeminiWithRetry(
    systemPrompt,
    userPrompt,
    "evidence_analysis"
  );

  try {
    const parsed = JSON.parse(responseText) as EvidenceAnalysisResponse;

    logger.info("Evidence relevance analysis completed", {
      commitment_id: context.commitment.id,
      evidence_type: context.evidenceType,
      confidence_score: parsed.confidence_score,
      is_relevant: parsed.is_relevant,
    });

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to parse evidence analysis response", {
      commitment_id: context.commitment.id,
      error: message,
      response_preview: responseText.substring(0, 100),
    });
    throw new Error(`Failed to parse Gemini evidence analysis response: ${message}`);
  }
}

/**
 * Detect if a commitment is at risk of missing its deadline.
 *
 * Calls Gemini to assess risk based on time remaining, evidence collected,
 * and activity signals from the linked repository.
 *
 * @param systemPrompt System instruction for risk analysis
 * @param userPrompt Formatted commitment and progress context
 * @param commitment The commitment being assessed
 * @returns Risk analysis result with risk score and contributing factors
 * @throws Error if the Gemini call fails after retries
 */
export async function detectCommitmentRisk(
  systemPrompt: string,
  userPrompt: string,
  commitment: Commitment
): Promise<RiskAnalysisResponse> {
  const responseText = await callGeminiWithRetry(
    systemPrompt,
    userPrompt,
    "risk_detection"
  );

  try {
    const parsed = JSON.parse(responseText) as RiskAnalysisResponse;

    logger.info("Risk detection completed", {
      commitment_id: commitment.id,
      risk_score: parsed.risk_score,
      is_at_risk: parsed.is_at_risk,
    });

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to parse risk detection response", {
      commitment_id: commitment.id,
      error: message,
      response_preview: responseText.substring(0, 100),
    });
    throw new Error(`Failed to parse Gemini risk detection response: ${message}`);
  }
}

/**
 * Extract structured information from GitHub data.
 *
 * Calls Gemini to parse and extract key information from GitHub commits,
 * pull requests, and releases for matching against commitments.
 *
 * @param systemPrompt System instruction for GitHub analysis
 * @param userPrompt Formatted GitHub data
 * @param context Logging context
 * @returns Structured GitHub data with extracted keywords
 * @throws Error if the Gemini call fails after retries
 */
export async function extractGitHubContext(
  systemPrompt: string,
  userPrompt: string,
  context: { repo: string }
): Promise<GitHubContextResponse> {
  const responseText = await callGeminiWithRetry(
    systemPrompt,
    userPrompt,
    "github_analysis"
  );

  try {
    const parsed = JSON.parse(responseText) as GitHubContextResponse;

    logger.info("GitHub context extraction completed", {
      repo: context.repo,
      commits_count: parsed.commits?.length || 0,
      prs_count: parsed.pull_requests?.length || 0,
      releases_count: parsed.releases?.length || 0,
    });

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to parse GitHub context extraction response", {
      repo: context.repo,
      error: message,
      response_preview: responseText.substring(0, 100),
    });
    throw new Error(`Failed to parse Gemini GitHub analysis response: ${message}`);
  }
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
  analysisType: "evidence_analysis" | "risk_detection" | "github_analysis"
): Promise<string> {
  const apiKey = getEnv("GEMINI_API_KEY");

  let lastError: Error | null = null;

  for (
    let attempt = 1;
    attempt <= GITHUB_RETRY_CONFIG.MAX_RETRIES;
    attempt++
  ) {
    try {
      logger.info(`Attempting Gemini ${analysisType} call`, {
        model: GEMINI_MODEL_ID,
        analysisType,
        attempt,
      });

      const response = await callGeminiAPI(apiKey, systemPrompt, userPrompt);

      logger.info(`Gemini ${analysisType} succeeded`, {
        model: GEMINI_MODEL_ID,
        analysisType,
        attempt,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));

      const isTransient = isTransientError(lastError.message);

      // If it's a permanent error or we've exhausted retries, give up
      if (
        !isTransient ||
        attempt === GITHUB_RETRY_CONFIG.MAX_RETRIES
      ) {
        logger.error(
          `Gemini ${analysisType} failed after ${attempt} attempt${attempt === 1 ? "" : "s"}`,
          {
            model: GEMINI_MODEL_ID,
            analysisType,
            attempt,
            error: lastError.message,
            isTransient,
          }
        );

        throw lastError;
      }

      // Log the transient failure and retry
      const backoffMs =
        GITHUB_RETRY_CONFIG.INITIAL_BACKOFF_MS *
        Math.pow(GITHUB_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);

      logger.warn(
        `Gemini ${analysisType} transient failure, retrying in ${backoffMs}ms`,
        {
          analysisType,
          attempt,
          nextAttempt: attempt + 1,
          error: lastError.message,
          backoffMs,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw (
    lastError ||
    new Error(`Gemini ${analysisType} failed after all retries`)
  );
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
 * @param userPrompt User message with content to analyze
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
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text) {
    throw new Error(
      "Empty response from Gemini API (no text content in candidates)"
    );
  }

  return text;
}
