import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { CommunicationDraftModel } from "../shared/db/models";
import { connectMongo } from "../shared/db/connect";
import { getEnv } from "../shared/utils/env";
import { logger } from "../shared/utils/logger";
import type { CommunicationDraft, CommunicationDraftType, Commitment, Evidence } from "../shared/types";

export interface DraftContext {
  commitment: Commitment;
  evidence: Evidence[];
  prior_thread_context: string[];
  user_name?: string;
  user_email?: string;
  requester_importance?: number;
}

/**
 * Inputs: a commitment, relevant evidence, prior thread context, and a draft type.
 * Output: a queued CommunicationDraft for user review.
 *
 * PRODUCT_SPEC.md Section 13 allows proactive draft generation but forbids auto-send.
 */
export async function generateDraft(
  draftType: CommunicationDraftType,
  context: DraftContext
): Promise<CommunicationDraft> {
  await connectMongo();

  const { commitment, evidence, prior_thread_context, user_name, user_email } = context;

  const toneGoal = getToneAndGoal(draftType);
  const evidenceSummary = formatEvidence(evidence);
  const priorContext = prior_thread_context.join("\n---\n") || "(no prior context)";

  const prompt = buildPrompt(
    draftType,
    commitment,
    evidenceSummary,
    priorContext,
    toneGoal,
    user_name,
    user_email
  );

  let content: string;
  try {
    const gemini = new GoogleGenAI({
      apiKey: getEnv("GEMINI_API_KEY")
    });
    const model = gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    content = (await model).candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    logger.error("Gemini draft generation failed", {
      commitment_id: commitment.id,
      draft_type: draftType,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }

  const draft: CommunicationDraft = {
    id: randomUUID(),
    commitment_id: commitment.id,
    draft_type: draftType,
    content,
    status: "queued",
    created_at: new Date(),
    sent_at: null,
    final_sent_content: null,
    snoozed_until: null
  };

  try {
    await CommunicationDraftModel.create(draft);
    logger.info("Draft generated", { draft_id: draft.id, draft_type: draftType });
  } catch (err) {
    logger.error("Failed to save draft to Mongo", {
      draft_id: draft.id,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }

  return draft;
}

function getToneAndGoal(draftType: CommunicationDraftType): { tone: string; goal: string } {
  switch (draftType) {
    case "acknowledgement":
      return {
        tone: "warm, concise, professional",
        goal: "confirm understanding of the commitment and scope/deadline"
      };
    case "completion":
      return {
        tone: "confident, brief, celebratory",
        goal: "close the loop with the requester and confirm completion"
      };
    case "recovery":
      return {
        tone: "apologetic, accountable, forward-looking",
        goal: "acknowledge the miss, rebuild trust, and commit to a concrete new timeline"
      };
    case "extension_request":
      return {
        tone: "proactive, respectful, solution-oriented",
        goal: "renegotiate the deadline before it is missed"
      };
  }
}

function formatEvidence(evidence: Evidence[]): string {
  if (evidence.length === 0) return "(no evidence collected yet)";

  return evidence
    .map((e) => {
      const typeLabel = e.evidence_type.replace(/_/g, " ");
      return `${typeLabel} (confidence: ${(e.match_confidence * 100).toFixed(0)}%): ${e.evidence_reference}`;
    })
    .join("\n");
}

function buildPrompt(
  draftType: CommunicationDraftType,
  commitment: Commitment,
  evidenceSummary: string,
  priorContext: string,
  toneGoal: { tone: string; goal: string },
  userName?: string,
  userEmail?: string
): string {
  const salutation = `Draft a ${draftType} email message for: ${commitment.requester}`;

  return `You are a professional AI assistant helping someone manage their commitments via email.

${salutation}

Commitment Details:
- Title: ${commitment.title}
- Description: ${commitment.description}
- Requester: ${commitment.requester}
- Deadline: ${commitment.deadline ? commitment.deadline.toISOString().split("T")[0] : "not specified"}
- Current Status: ${commitment.status}

Evidence of Completion:
${evidenceSummary}

Prior Thread Context:
${priorContext}

Tone: ${toneGoal.tone}
Goal: ${toneGoal.goal}

Write a plain-text email (no HTML, no markdown formatting) that achieves this goal.
${userName ? `Sign as: ${userName}` : ""}
${userEmail ? `From email: ${userEmail}` : ""}

The email should be 2-4 sentences, direct, and human-sounding. Do not include salutation or closing signature — just the body.`;
}

