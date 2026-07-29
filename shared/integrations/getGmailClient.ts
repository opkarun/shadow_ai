import { google } from "googleapis";
import { IntegrationModel } from "../db/models";
import { getEnv } from "../utils";

/**
 * Returns an authenticated Gmail client for the given user, handling OAuth token
 * refresh automatically. Callers use the returned client's gmail.users.messages
 * methods directly (list/get for reading, send for sending).
 *
 * Throws if the user has no connected Gmail integration.
 */
export async function getGmailClient(userId: string) {
  const integration = await IntegrationModel.findOne({
    user_id: userId,
    provider: "gmail",
    status: "connected"
  }).exec();

  if (!integration) {
    throw new Error(`No connected Gmail integration for user: ${userId}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    getEnv("GMAIL_CLIENT_ID"),
    getEnv("GMAIL_CLIENT_SECRET"),
    getEnv("GMAIL_REDIRECT_URI")
  );

  oauth2Client.setCredentials({
    access_token: integration.auth_token,
    refresh_token: integration.refresh_token
  });

  // googleapis auto-refreshes using refresh_token; this listener persists rotated tokens back to Mongo.
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await IntegrationModel.updateOne(
        { user_id: userId, provider: "gmail" },
        { $set: { auth_token: tokens.access_token, last_synced_at: new Date() } }
      ).exec();
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
