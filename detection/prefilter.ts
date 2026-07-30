import { logger } from "../shared/utils";
import {
  PREFILTER_PATTERNS,
  PREFILTER_AUTO_FAIL_PATTERNS,
  PREFILTER_MIN_WORD_COUNT,
} from "./config";

// ============================================================================
// TYPES
// ============================================================================

export interface NormalizedGmailMessage {
  id: string;
  thread_id: string;
  from: string;
  to?: string[];
  subject: string;
  snippet?: string;
  body_text?: string;
  body?: string;
  received_at: Date;
}

export interface PrefilterResult {
  passes_prefilter: boolean;
  message: NormalizedGmailMessage;
  reason?: string; // Why it passed or failed (for debugging)
}

// ============================================================================
// PREFILTER ENGINE
// ============================================================================

/**
 * PrefilterEngine implements the noise-reduction layer from PRODUCT_SPEC Section 27.
 */
class PrefilterEngine {
  private requestRegex: RegExp;
  private promiseRegex: RegExp;
  private actionVerbRegex: RegExp;
  private deadlineRegex: RegExp;
  private automatedSenderRegex: RegExp;
  private systemNotificationRegex: RegExp;

  private processedMessageIds: Set<string>;

  constructor() {
    this.processedMessageIds = new Set();
    this.requestRegex = this.compilePattern(PREFILTER_PATTERNS.REQUEST_PATTERNS);
    this.promiseRegex = this.compilePattern(PREFILTER_PATTERNS.PROMISE_PATTERNS);
    this.actionVerbRegex = this.compilePattern(PREFILTER_PATTERNS.ACTION_VERBS);
    this.deadlineRegex = this.compilePattern(PREFILTER_PATTERNS.DEADLINE_PATTERNS);
    this.automatedSenderRegex = this.compilePattern(
      PREFILTER_AUTO_FAIL_PATTERNS.AUTOMATED_SENDERS
    );
    this.systemNotificationRegex = this.compilePattern(
      PREFILTER_AUTO_FAIL_PATTERNS.SYSTEM_NOTIFICATION_KEYWORDS
    );
  }

  filter(message: NormalizedGmailMessage): PrefilterResult {
    try {
      const autoFailReason = this.checkAutoFail(message);
      if (autoFailReason) {
        logger.info("Message rejected by auto-fail check", {
          messageId: message.id,
          reason: autoFailReason,
        });
        return {
          passes_prefilter: false,
          message,
          reason: autoFailReason,
        };
      }

      const passesSignalCheck = this.checkSignals(message);
      if (!passesSignalCheck) {
        logger.info("Message rejected: no commitment signals detected", {
          messageId: message.id,
        });
        return {
          passes_prefilter: false,
          message,
          reason: "No commitment signals detected",
        };
      }

      logger.info("Message passed prefilter", { messageId: message.id });
      return {
        passes_prefilter: true,
        message,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn("Prefilter error, failing open", {
        messageId: message.id,
        error: errorMessage,
      });
      return {
        passes_prefilter: true,
        message,
        reason: "Prefilter error (failing open)",
      };
    }
  }

  private checkAutoFail(message: NormalizedGmailMessage): string | null {
    if (this.processedMessageIds.has(message.id)) {
      return "Message already processed (dedup)";
    }

    const fromAddr = message.from || "";
    if (this.automatedSenderRegex.test(fromAddr)) {
      return "Sender is automated (no-reply, bot, etc.)";
    }

    const fullText = `${message.subject || ""} ${message.body || message.body_text || message.snippet || ""}`;
    if (this.systemNotificationRegex.test(fullText)) {
      return "System/integration notification (not a commitment)";
    }

    this.processedMessageIds.add(message.id);
    return null;
  }

  private checkSignals(message: NormalizedGmailMessage): boolean {
    const text = `${message.subject || ""} ${message.body || message.body_text || message.snippet || ""}`;

    const wordCount = (text || "").split(/\s+/).filter(Boolean).length;
    if (wordCount < PREFILTER_MIN_WORD_COUNT) {
      return false;
    }

    if (this.requestRegex.test(text) || this.promiseRegex.test(text)) {
      return true;
    }

    if (this.actionVerbRegex.test(text)) {
      return true;
    }

    if (
      this.deadlineRegex.test(text) ||
      PREFILTER_PATTERNS.TIME_REGEX.test(text) ||
      PREFILTER_PATTERNS.WEEKDAY_REGEX.test(text)
    ) {
      return true;
    }

    if (this.checkImperativeStructure(message)) {
      return true;
    }

    return false;
  }

  private checkImperativeStructure(message: NormalizedGmailMessage): boolean {
    const text = message.body || message.body_text || message.snippet || "";
    if (!text) return false;

    const sentences = text.split(/[.!?]+/);
    if (sentences.length === 0) {
      return false;
    }

    const firstSentence = sentences[0].trim().toLowerCase();
    if (!firstSentence) {
      return false;
    }

    for (const verb of PREFILTER_PATTERNS.ACTION_VERBS) {
      if (firstSentence.startsWith(verb)) {
        if (/\b(?:you|your|the|this|my|please)\b/i.test(firstSentence)) {
          return true;
        }
      }
    }

    return false;
  }

  private compilePattern(patterns: string[]): RegExp {
    const escaped = patterns.map((p) =>
      p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const combined = escaped.map((p) => `\\b${p}\\b`).join("|");
    return new RegExp(combined, "i");
  }
}

let engine = new PrefilterEngine();

export function prefilterMessage(message: NormalizedGmailMessage): PrefilterResult {
  return engine.filter(message);
}

export function resetPrefilterEngine(): void {
  engine = new PrefilterEngine();
}
