import { randomUUID } from "crypto";
import type { Commitment, Evidence } from "../shared/types/index.js";

export interface VerificationEvent {
  provider: "github" | "google_calendar" | "manual";
  reference: string;
  received_at: Date;
  payload: Record<string, unknown>;
}

/**
 * Inputs: an open commitment plus a GitHub, Calendar, or manual verification event.
 * Output: evidence records that can be stored and used for a sanctioned status transition.
 *
 * PRODUCT_SPEC.md Section 14 requires real evidence; elapsed time alone is never evidence.
 */
export function matchEvidence(commitment: Commitment, event: VerificationEvent): Evidence[] {
  const evidenceList: Evidence[] = [];
  const now = event.received_at || new Date();

  const commitTitle = (commitment.title || "").toLowerCase();
  const eventRef = (event.reference || "").toLowerCase();
  const payloadStr = JSON.stringify(event.payload || {}).toLowerCase();

  // Match GitHub commit or PR
  if (event.provider === "github") {
    let confidence = 0.5;

    // Direct repo or reference match
    if (commitment.linked_repo && eventRef.includes(commitment.linked_repo.toLowerCase())) {
      confidence += 0.3;
    }

    // Task keywords match in commit message
    const keywords = commitTitle.split(/\s+/).filter((w) => w.length > 3);
    const matchesKeyword = keywords.some((kw) => payloadStr.includes(kw));

    if (matchesKeyword) {
      confidence += 0.2;
    }

    evidenceList.push({
      id: randomUUID(),
      commitment_id: commitment.id,
      evidence_type: "github_commit",
      evidence_reference: event.reference,
      match_confidence: Math.min(1.0, confidence),
      detected_at: now,
    });
  } else if (event.provider === "manual") {
    evidenceList.push({
      id: randomUUID(),
      commitment_id: commitment.id,
      evidence_type: "manual",
      evidence_reference: event.reference || "Manual user confirmation",
      match_confidence: 1.0,
      detected_at: now,
    });
  }

  return evidenceList;
}
