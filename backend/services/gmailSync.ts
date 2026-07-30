/**
 * Gmail Sync Service
 *
 * Fetches real incoming emails from Gmail API using OAuth credentials,
 * converts them to NormalizedGmailMessage objects, and runs the Gemini AI detection pipeline.
 */

import { google } from "googleapis";
import { getGmailOAuthConfig } from "../oauth/gmailOAuth.js";
import { IntegrationModel } from "../../shared/db/models.js";
import { detectAndPersistCommitments, type NormalizedGmailMessage } from "../../detection/index.js";
import { logger } from "../../shared/utils/index.js";

/**
 * Fetch recent incoming emails from Gmail API and extract commitments
 */
export async function syncGmailMessages(userId: string): Promise<{
  processedMessagesCount: number;
  detectedCommitmentsCount: number;
}> {
  logger.info("Starting Gmail sync for user", { userId });

  // 1. Get Integration credentials from DB
  const integration = await IntegrationModel.findOne({
    user_id: userId,
    provider: "gmail",
    status: "connected",
  }).lean();

  if (!integration || !integration.auth_token) {
    logger.warn("No active Gmail integration found for user", { userId });
    return { processedMessagesCount: 0, detectedCommitmentsCount: 0 };
  }

  let tokens: any;
  try {
    tokens = JSON.parse(integration.auth_token);
  } catch {
    tokens = { accessToken: integration.auth_token };
  }

  const config = getGmailOAuthConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // 2. Fetch recent inbox messages
  let messageList: any[] = [];
  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 15,
      q: "in:inbox -category:promotions -category:social",
    });
    messageList = listRes.data.messages || [];
  } catch (error) {
    logger.error("Failed to list Gmail messages", { userId, error });
    throw error;
  }

  if (messageList.length === 0) {
    logger.info("No recent Gmail messages found", { userId });
    return { processedMessagesCount: 0, detectedCommitmentsCount: 0 };
  }

  // 3. Normalize messages for detection pipeline
  const normalizedMessages: NormalizedGmailMessage[] = [];

  for (const item of messageList) {
    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: item.id!,
        format: "full",
      });

      const msg = msgRes.data;
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

      const subject = getHeader("subject") || "No Subject";
      const from = getHeader("from") || "Unknown Sender";
      const dateStr = getHeader("date");
      const receivedAt = dateStr ? new Date(dateStr) : new Date();

      let bodyText = msg.snippet || "";
      if (msg.payload?.parts) {
        const plainPart = msg.payload.parts.find((p) => p.mimeType === "text/plain");
        if (plainPart?.body?.data) {
          bodyText = Buffer.from(plainPart.body.data, "base64").toString("utf-8");
        }
      } else if (msg.payload?.body?.data) {
        bodyText = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
      }

      normalizedMessages.push({
        id: msg.id!,
        thread_id: msg.threadId || msg.id!,
        subject,
        from,
        snippet: msg.snippet || bodyText.substring(0, 150),
        body_text: bodyText,
        received_at: receivedAt,
      });
    } catch (err) {
      logger.warn("Failed to fetch message payload", { id: item.id, error: err });
    }
  }

  // 4. Run AI Detection & Persistence Pipeline
  const persisted = await detectAndPersistCommitments(userId, normalizedMessages);

  // 5. Update last_synced_at
  await IntegrationModel.updateOne(
    { user_id: userId, provider: "gmail" },
    { last_synced_at: new Date() }
  );

  logger.info("Gmail sync completed successfully", {
    userId,
    processed: normalizedMessages.length,
    commitmentsDetected: persisted.length,
  });

  return {
    processedMessagesCount: normalizedMessages.length,
    detectedCommitmentsCount: persisted.length,
  };
}
