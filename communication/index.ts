/**
 * Communication module entry point.
 * Exports all public functions and starts the snooze resurfacing cron job.
 */

import { startResurfaceCron } from "./resurfaceSnoozed";

export { generateDraft, type DraftContext } from "./generateDraft";
export { sendApprovedDraft, listQueuedDrafts, discardDraft, snoozeDraft, type DraftSendRequest } from "./approvalQueue";

/**
 * Initialize the communication module.
 * Call this once at application startup to begin the snooze resurfacing cron job.
 */
export function initCommunication(): void {
  startResurfaceCron();
}
