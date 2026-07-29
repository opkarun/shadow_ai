/**
 * Draft Generation Pipeline
 *
 * Generates AI-drafted communication messages for commitments.
 * Orchestrates prompt building, Gemini API calls, and database persistence.
 * All drafts are queued for explicit user approval before sending.
 *
 * PRODUCT_SPEC.md Section 13 (AI Communication Lifecycle):
 * - Proactive draft generation is allowed
 * - No auto-send ever (hard constraint)
 * - Drafts are queued for user review/edit/approval
 */

import { randomUUID } from "crypto";
import { logger } from "../shared/utils";
import { connectMongo } from "../shared/db/connect";
import { CommunicationDraftModel, AuditLogEntryModel } from "../shared/db/models";
import type {
  CommunicationDraft,
  CommunicationDraftType,
  Commitment,
  Evidence,
} from "../shared/types";
import { buildDraftPrompts } from "./prompts";
import { generateDraftContent } from "./geminiIntegration";
import {
  MAX_DRAFT_CONTENT_LENGTH,
  MIN_DRAFT_CONTENT_LENGTH,
  LOG_GENERATED_DRAFTS,
} from "./config";

export interface DraftContext {
  commitment: Commitment;
  evidence: Evidence[];
  prior_thread_context: string[];
}

/**
 * Generate a draft message for a commitment.
 *
 * Orchestrates:
 * 1. Input validation
 * 2. Prompt building (tone, context, goal)
 * 3. Gemini API call for draft generation
 * 4. Response validation (length, content quality)
 * 5. Database persistence
 * 6. Audit log creation
 *
 * @param draftType Type of draft (acknowledgement, completion, recovery, extension_request)
 * @param context Commitment context (commitment, evidence, prior emails)
 * @returns Persisted CommunicationDraft with status "queued"
 * @throws Error if generation fails (after validation and retries)
 */
export async function generateDraft(
  draftType: CommunicationDraftType,
  context: DraftContext
): Promise<CommunicationDraft> {
  // Validate inputs
  validateDraftContext(draftType, context);

  const { commitment, evidence, prior_thread_context } = context;
  const userId = commitment.user_id;
  const draftId = randomUUID();
  const now = new Date();

  logger.info("Starting draft generation", {
    draftId,
    userId,
    draftType,
    commitmentId: commitment.id,
    commitmentTitle: commitment.title,
  });

  try {
    // Connect to database
    await connectMongo();

    // Step 1: Build prompts
    logger.info("Building draft prompts", {
      draftId,
      draftType,
      commitmentId: commitment.id,
    });

    const [systemPrompt, userPrompt] = buildDraftPrompts(
      draftType,
      commitment,
      evidence,
      prior_thread_context
    );

    // Step 2: Call Gemini to generate draft content
    logger.info("Calling Gemini for draft generation", {
      draftId,
      draftType,
      commitmentId: commitment.id,
    });

    const { content: draftContent } = await generateDraftContent(
      systemPrompt,
      userPrompt,
      draftType
    );

    // Step 3: Validate response
    validateDraftContent(draftContent, draftId);

    if (LOG_GENERATED_DRAFTS) {
      logger.info("Draft content generated", {
        draftId,
        draftType,
        contentLength: draftContent.length,
      });
    }

    // Step 4: Create draft record
    const draft: CommunicationDraft = {
      id: draftId,
      commitment_id: commitment.id,
      draft_type: draftType,
      content: draftContent,
      status: "queued",
      created_at: now,
      sent_at: null,
      final_sent_content: null,
    };

    // Step 5: Persist to database
    logger.info("Persisting draft to database", {
      draftId,
      commitmentId: commitment.id,
      draftType,
      status: "queued",
    });

    const persisted = (await CommunicationDraftModel.create(
      draft
    )) as unknown as CommunicationDraft;

    // Step 6: Create audit log entry
    logger.info("Creating audit log entry", {
      draftId,
      commitmentId: commitment.id,
      eventType: "draft_generated",
    });

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: commitment.id,
      event_type: "draft_generated",
      before_state: {},
      after_state: {
        draft_id: draftId,
        draft_type: draftType,
        status: "queued",
        content_length: draftContent.length,
      },
      contributing_factors: {
        trigger: getTriggerReason(draftType),
        commitment_title: commitment.title,
        commitment_deadline: commitment.deadline?.toISOString() || null,
      },
      timestamp: now,
    });

    logger.info("Draft generation complete", {
      draftId,
      commitmentId: commitment.id,
      draftType,
      status: "queued",
    });

    return persisted;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Draft generation failed", {
      draftId,
      userId,
      commitmentId: context.commitment.id,
      draftType,
      error: errorMessage,
    });

    throw error;
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate draft context before processing.
 *
 * Ensures all required fields are present and have valid types.
 */
function validateDraftContext(
  draftType: CommunicationDraftType,
  context: DraftContext
): void {
  // Validate draft type
  const validTypes: CommunicationDraftType[] = [
    "acknowledgement",
    "completion",
    "recovery",
    "extension_request",
  ];
  if (!validTypes.includes(draftType)) {
    throw new Error(`Invalid draft type: ${draftType}`);
  }

  // Validate context
  if (!context) {
    throw new Error("Draft context is required");
  }

  if (!context.commitment) {
    throw new Error("Commitment is required in draft context");
  }

  if (!context.commitment.id) {
    throw new Error("Commitment must have an ID");
  }

  if (!context.commitment.user_id) {
    throw new Error("Commitment must have a user_id");
  }

  if (!context.commitment.title) {
    throw new Error("Commitment must have a title");
  }

  if (!context.commitment.description) {
    throw new Error("Commitment must have a description");
  }

  if (!context.commitment.requester) {
    throw new Error("Commitment must have a requester");
  }

  if (!Array.isArray(context.evidence)) {
    throw new Error("Evidence must be an array");
  }

  if (!Array.isArray(context.prior_thread_context)) {
    throw new Error("Prior thread context must be an array");
  }
}

/**
 * Validate generated draft content.
 *
 * Ensures the response from Gemini is non-empty and within acceptable bounds.
 */
function validateDraftContent(content: string, draftId: string): void {
  if (!content || typeof content !== "string") {
    throw new Error("Draft content must be a non-empty string");
  }

  if (content.length < MIN_DRAFT_CONTENT_LENGTH) {
    throw new Error(
      `Draft content is too short (${content.length} chars, minimum ${MIN_DRAFT_CONTENT_LENGTH})`
    );
  }

  if (content.length > MAX_DRAFT_CONTENT_LENGTH) {
    logger.warn("Draft content exceeds preferred length", {
      draftId,
      contentLength: content.length,
      maxLength: MAX_DRAFT_CONTENT_LENGTH,
    });
    // Don't reject; just warn and continue
  }
}

/**
 * Get a human-readable reason for why this draft was generated.
 *
 * Used in audit log for explainability.
 */
function getTriggerReason(draftType: CommunicationDraftType): string {
  switch (draftType) {
    case "acknowledgement":
      return "Commitment confirmed or user accepted request";
    case "completion":
      return "Verification evidence found or manual completion recorded";
    case "recovery":
      return "Commitment deadline passed without completion evidence";
    case "extension_request":
      return "Commitment flagged at risk; deadline approaching with insufficient progress";
    default:
      return "Unknown trigger";
  }
}
