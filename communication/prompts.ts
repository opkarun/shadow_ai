/**
 * Prompts for Gemini draft generation.
 * These define how the LLM should draft messages for all four draft types.
 *
 * Key principle: Prompts are explicit about tone, length, and structure.
 * Every prompt includes context about the commitment, evidence, and prior thread
 * so the LLM can avoid repetition and write contextually appropriate messages.
 */

import type {
  Commitment,
  Evidence,
  CommunicationDraftType,
} from "../shared/types";
import { DRAFT_TYPE_METADATA, DRAFT_GENERATION_SYSTEM_PREFIX } from "./config";

// ============================================================================
// SYSTEM PROMPTS (tone + goal definitions)
// ============================================================================

/**
 * System prompt for acknowledgement drafts.
 *
 * Guides Gemini to draft a warm, responsive acknowledgement that confirms
 * the user understands the commitment and will follow through.
 */
function buildAcknowledgementSystemPrompt(): string {
  const metadata = DRAFT_TYPE_METADATA.acknowledgement;
  return `${DRAFT_GENERATION_SYSTEM_PREFIX}

You are drafting an acknowledgement message to confirm receipt of a commitment.

Tone: ${metadata.tone}
Goal: ${metadata.goal}

The message should:
- Briefly confirm you understand what was asked
- Indicate when you expect to complete it (if a deadline was mentioned)
- Sound warm and professional, not robotic
- Be 2-3 sentences maximum
- Avoid phrases like "I acknowledge receipt" — be natural

Do not include salutations or signatures.`;
}

/**
 * System prompt for completion drafts.
 *
 * Guides Gemini to draft a confident confirmation that closes the loop on
 * a completed commitment.
 */
function buildCompletionSystemPrompt(): string {
  const metadata = DRAFT_TYPE_METADATA.completion;
  return `${DRAFT_GENERATION_SYSTEM_PREFIX}

You are drafting a completion confirmation message to let the requester know a commitment is done.

Tone: ${metadata.tone}
Goal: ${metadata.goal}

The message should:
- State that the work is complete and ready for review/use
- Reference the specific deliverable (what was completed)
- Optionally mention where/how to access the work (if applicable)
- Offer follow-up help if needed
- Be 2-3 sentences maximum
- Sound confident, not apologetic

Do not include salutations or signatures.`;
}

/**
 * System prompt for recovery drafts.
 *
 * Guides Gemini to draft a recovery message when a deadline has been missed.
 * Must balance accountability with forward momentum.
 */
function buildRecoverySystemPrompt(): string {
  const metadata = DRAFT_TYPE_METADATA.recovery;
  return `${DRAFT_GENERATION_SYSTEM_PREFIX}

You are drafting a recovery message because a commitment deadline has passed without completion.

Tone: ${metadata.tone}
Goal: ${metadata.goal}

The message should:
- Directly acknowledge that the deadline was missed (no excuses, no evasion)
- Take responsibility ("I missed this deadline" not "this wasn't completed")
- Offer a specific, realistic new timeline (e.g., "I'll have it to you by Friday EOD")
- Optionally explain briefly why (if there's genuine context) but avoid over-explaining
- Be 3-4 sentences maximum
- Sound like you're committed to rebuilding trust

Do not include salutations or signatures.`;
}

/**
 * System prompt for extension request drafts.
 *
 * Guides Gemini to draft a proactive request for a deadline extension before
 * it's missed. This is the opportunity to renegotiate and avoid a recovery message.
 */
function buildExtensionRequestSystemPrompt(): string {
  const metadata = DRAFT_TYPE_METADATA.extension_request;
  return `${DRAFT_GENERATION_SYSTEM_PREFIX}

You are drafting an extension request message to renegotiate a commitment deadline before it's missed.

Tone: ${metadata.tone}
Goal: ${metadata.goal}

The message should:
- State the current deadline clearly
- Explain why the timeline is now at risk (lack of available time, unexpected blockers, etc.)
- Propose a specific new deadline that is realistic
- Sound proactive and respectful, not desperate or apologetic
- Offer to discuss if the new timeline doesn't work
- Be 3-4 sentences maximum

Do not include salutations or signatures.`;
}

/**
 * Get the system prompt for a specific draft type.
 */
function getSystemPrompt(draftType: CommunicationDraftType): string {
  switch (draftType) {
    case "acknowledgement":
      return buildAcknowledgementSystemPrompt();
    case "completion":
      return buildCompletionSystemPrompt();
    case "recovery":
      return buildRecoverySystemPrompt();
    case "extension_request":
      return buildExtensionRequestSystemPrompt();
    default:
      throw new Error(`Unknown draft type: ${draftType}`);
  }
}

// ============================================================================
// USER PROMPTS (context-specific prompts)
// ============================================================================

/**
 * Format commitment details for the user prompt.
 *
 * Presents the commitment info in a readable, structured way so the LLM
 * can reference it accurately in the draft.
 */
function formatCommitmentContext(commitment: Commitment): string {
  const deadlineStr = commitment.deadline
    ? `Deadline: ${commitment.deadline.toDateString()}`
    : "Deadline: Not specified";

  return `Commitment Details:
- Task: ${commitment.title}
- Description: ${commitment.description}
- Requester: ${commitment.requester}
- ${deadlineStr}
- Source: ${commitment.source}`;
}

/**
 * Format evidence details for the user prompt.
 *
 * Presents any gathered evidence (GitHub commits, PRs, manual marks, etc.)
 * so the LLM can reference it in completion/recovery messages.
 */
function formatEvidenceContext(evidence: Evidence[]): string {
  if (!evidence.length) {
    return "";
  }

  const formattedEvidence = evidence
    .map(
      (e) => `- ${e.evidence_type}: ${e.evidence_reference} (matched with ${Math.round(e.match_confidence * 100)}% confidence)`
    )
    .join("\n");

  return `Evidence Found:
${formattedEvidence}`;
}

/**
 * Format prior thread context for the user prompt.
 *
 * Includes recent prior emails so the LLM understands the conversation
 * history and can avoid repetition.
 */
function formatThreadContext(prior: string[]): string {
  if (!prior.length) {
    return "";
  }

  const truncated = prior.slice(-3); // Last 3 for brevity
  return `Prior Thread Context:
${truncated.map((msg, idx) => `${idx + 1}. ${msg}`).join("\n\n")}`;
}

/**
 * Build user prompt for acknowledgement draft.
 */
function buildAcknowledgementUserPrompt(
  commitment: Commitment,
  prior: string[]
): string {
  const commitmentCtx = formatCommitmentContext(commitment);
  const threadCtx = formatThreadContext(prior);

  return `Draft an acknowledgement message for this commitment:

${commitmentCtx}

${threadCtx ? threadCtx + "\n" : ""}
Compose a brief acknowledgement confirming you understand this commitment and when you expect to complete it.`;
}

/**
 * Build user prompt for completion draft.
 */
function buildCompletionUserPrompt(
  commitment: Commitment,
  evidence: Evidence[],
  prior: string[]
): string {
  const commitmentCtx = formatCommitmentContext(commitment);
  const evidenceCtx = formatEvidenceContext(evidence);
  const threadCtx = formatThreadContext(prior);

  return `Draft a completion confirmation message for this commitment:

${commitmentCtx}

${evidenceCtx ? evidenceCtx + "\n" : ""}
${threadCtx ? threadCtx + "\n" : ""}
Compose a brief message confirming that this commitment is complete and ready for review.`;
}

/**
 * Build user prompt for recovery draft.
 */
function buildRecoveryUserPrompt(
  commitment: Commitment,
  prior: string[]
): string {
  const commitmentCtx = formatCommitmentContext(commitment);
  const threadCtx = formatThreadContext(prior);

  return `Draft a recovery message for this missed commitment:

${commitmentCtx}

${threadCtx ? threadCtx + "\n" : ""}
The deadline has now passed without evidence of completion. Compose a message that acknowledges the miss, takes responsibility, and proposes a specific new timeline.`;
}

/**
 * Build user prompt for extension request draft.
 */
function buildExtensionRequestUserPrompt(
  commitment: Commitment,
  prior: string[]
): string {
  const commitmentCtx = formatCommitmentContext(commitment);
  const threadCtx = formatThreadContext(prior);
  const daysRemaining = commitment.deadline
    ? Math.ceil(
        (commitment.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const riskNote =
    daysRemaining > 0
      ? `(${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining)`
      : "(deadline is imminent)";

  return `Draft an extension request for this commitment at risk:

${commitmentCtx}

${threadCtx ? threadCtx + "\n" : ""}
This commitment is at risk of missing its deadline ${riskNote}. Compose a proactive message requesting a deadline extension with a specific new timeline.`;
}

/**
 * Get the user prompt for a specific draft type.
 */
function getUserPrompt(
  draftType: CommunicationDraftType,
  commitment: Commitment,
  evidence: Evidence[],
  prior: string[]
): string {
  switch (draftType) {
    case "acknowledgement":
      return buildAcknowledgementUserPrompt(commitment, prior);
    case "completion":
      return buildCompletionUserPrompt(commitment, evidence, prior);
    case "recovery":
      return buildRecoveryUserPrompt(commitment, prior);
    case "extension_request":
      return buildExtensionRequestUserPrompt(commitment, prior);
    default:
      throw new Error(`Unknown draft type: ${draftType}`);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Build system and user prompts for draft generation.
 *
 * @param draftType Which type of draft to generate
 * @param commitment The commitment this draft relates to
 * @param evidence Evidence gathered so far (if any)
 * @param prior Prior emails in the thread (for context)
 * @returns Tuple of [systemPrompt, userPrompt]
 */
export function buildDraftPrompts(
  draftType: CommunicationDraftType,
  commitment: Commitment,
  evidence: Evidence[],
  prior: string[]
): [string, string] {
  const systemPrompt = getSystemPrompt(draftType);
  const userPrompt = getUserPrompt(draftType, commitment, evidence, prior);
  return [systemPrompt, userPrompt];
}
