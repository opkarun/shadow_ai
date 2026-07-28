export interface NormalizedGmailMessage {
  id: string;
  thread_id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  received_at: Date;
}

export interface PrefilterResult {
  passes_prefilter: boolean;
  message: NormalizedGmailMessage;
}

/**
 * Inputs: a normalized Gmail message from the ingestion layer.
 * Output: a boolean gate plus the original message, unmodified.
 *
 * Section 27 requires this to fail open if malformed input causes an error.
 */
export function prefilterMessage(_message: NormalizedGmailMessage): PrefilterResult {
  // TODO: Implement recall-oriented pre-filter signals from PRODUCT_SPEC.md Section 27.
  throw new Error("TODO: prefilterMessage is not implemented.");
}
