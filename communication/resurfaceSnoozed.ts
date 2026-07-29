/**
 * Scheduled job that resurffaces snoozed drafts back to the approval queue
 * when their snooze time expires.
 *
 * Runs every 5 minutes via node-cron. Finds all drafts where:
 *   status === "snoozed" AND snoozed_until <= now
 * And updates them back to status === "queued" so they reappear in listQueuedDrafts().
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment
// @ts-ignore
import cron from "node-cron";
import { CommunicationDraftModel, AuditLogEntryModel } from "../shared/db/models";
import { connectMongo } from "../shared/db/connect";
import { logger } from "../shared/utils/logger";
import { randomUUID } from "node:crypto";

export function startResurfaceCron(): void {
  // Run every 5 minutes: "*/5 * * * *"
  cron.schedule("*/5 * * * *", async () => {
    try {
      await connectMongo();

      const now = new Date();

      // Find all snoozed drafts whose snooze time has expired
      const expiredSnoozes = await CommunicationDraftModel.find({
        status: "snoozed",
        snoozed_until: { $lte: now }
      }).exec();

      if (expiredSnoozes.length === 0) {
        logger.info("Snooze check: no expired snoozes found");
        return;
      }

      logger.info("Resurfacing expired snoozes", { count: expiredSnoozes.length });

      // Update each one back to "queued"
      for (const draft of expiredSnoozes) {
        const updated = await CommunicationDraftModel.findOneAndUpdate(
          { id: draft.id },
          { $set: { status: "queued", snoozed_until: null } },
          { new: true }
        ).exec();

        if (!updated) {
          logger.warn("Draft disappeared during snooze resurfacing", { draft_id: draft.id });
          continue;
        }

        // Record the resurfacing in the audit log
        await AuditLogEntryModel.create({
          id: randomUUID(),
          commitment_id: draft.commitment_id,
          event_type: "draft_snoozed", // Reuse event_type; the state change itself indicates what happened
          before_state: { status: "snoozed", snoozed_until: draft.snoozed_until?.toISOString() },
          after_state: { status: "queued", snoozed_until: null },
          contributing_factors: { reason: "snooze_expired", draft_id: draft.id },
          timestamp: new Date()
        });

        logger.info("Draft resurfaced from snooze", { draft_id: draft.id });
      }

      logger.info("Snooze resurfacing complete", { count: expiredSnoozes.length });
    } catch (err) {
      logger.error("Snooze resurfacing job failed", {
        error: err instanceof Error ? err.message : String(err)
      });
      // Don't rethrow: cron jobs should not crash the process
    }
  });

  logger.info("Snooze resurfacing cron job started (every 5 minutes)");
}
