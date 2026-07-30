import { google } from "googleapis";
import { getGmailOAuthConfig } from "../backend/oauth/gmailOAuth.js";
import { connectMongo } from "../shared/db/connect.js";
import { IntegrationModel, CommitmentModel } from "../shared/db/models.js";
import { prefilterMessage } from "../detection/prefilter.js";
import { extractCommitments } from "../detection/extract.js";
import { scoreConfidence } from "../detection/scoreConfidence.js";
import { persistScoredCommitmentsBatch } from "../detection/persist.js";
import { getEnv } from "../shared/utils/env.js";

async function runDiagnostic() {
  console.log("=========================================================");
  console.log("SHADOW AI PIPELINE DIAGNOSTIC");
  console.log("=========================================================");

  await connectMongo();

  // STAGE 1: GMAIL OAUTH
  console.log("\n--- STAGE 1: GMAIL OAUTH ---");
  const integration = await IntegrationModel.findOne({ user_id: "user_demo_001", provider: "gmail" }).lean();
  if (!integration) {
    console.log("STAGE 1 FAIL: No Gmail integration found in DB for user_demo_001");
    process.exit(1);
  }

  let tokens: any;
  try {
    tokens = JSON.parse(integration.auth_token);
  } catch (e) {
    tokens = { accessToken: integration.auth_token };
  }

  console.log("Found OAuth Tokens. Access Token present:", !!tokens.accessToken, "Refresh Token present:", !!tokens.refreshToken);
  if (tokens.expiresAt) {
    console.log("Token expiresAt:", new Date(tokens.expiresAt).toLocaleString());
  }

  const config = getGmailOAuthConfig();
  const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Verify token validity by calling profile
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    console.log("STAGE 1 PASS: Connected Gmail email address:", profile.data.emailAddress);
  } catch (err: any) {
    console.log("STAGE 1 FAIL: Gmail API profile call failed:", err.message);
    process.exit(1);
  }

  // STAGE 2: GMAIL PROCESSING
  console.log("\n--- STAGE 2: GMAIL PROCESSING ---");
  let messageList: any[] = [];
  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 15,
      q: "in:inbox",
    });
    messageList = listRes.data.messages || [];
    console.log(`Fetched ${messageList.length} total inbox messages from Gmail API query 'in:inbox'.`);
  } catch (err: any) {
    console.log("STAGE 2 FAIL: Failed to list Gmail messages:", err.message);
    process.exit(1);
  }

  if (messageList.length === 0) {
    console.log("STAGE 2 WARNING: Inbox is empty!");
  }

  const fetchedMessages: any[] = [];
  for (const item of messageList) {
    const msgRes = await gmail.users.messages.get({
      userId: "me",
      id: item.id!,
      format: "full",
    });
    const msg = msgRes.data;
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const subject = getHeader("subject") || "No Subject";
    const from = getHeader("from") || "Unknown Sender";
    const dateStr = getHeader("date");

    let bodyText = msg.snippet || "";
    if (msg.payload?.parts) {
      const plainPart = msg.payload.parts.find((p) => p.mimeType === "text/plain");
      if (plainPart?.body?.data) {
        bodyText = Buffer.from(plainPart.body.data, "base64").toString("utf-8");
      }
    } else if (msg.payload?.body?.data) {
      bodyText = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
    }

    const norm = {
      id: msg.id!,
      thread_id: msg.threadId || msg.id!,
      from,
      subject,
      snippet: msg.snippet || "",
      body_text: bodyText,
      body: bodyText,
      received_at: dateStr ? new Date(dateStr) : new Date(),
    };

    fetchedMessages.push(norm);
    console.log(`\nEmail ID: ${norm.id}`);
    console.log(`  From: ${norm.from}`);
    console.log(`  Subject: ${norm.subject}`);
    console.log(`  Snippet: ${norm.snippet.substring(0, 100)}`);
  }

  // STAGE 2.5: PREFILTER EVALUATION
  console.log("\n--- STAGE 2.5: PREFILTER EVALUATION ---");
  const prefiltered = fetchedMessages.filter((msg) => {
    const res = prefilterMessage(msg);
    console.log(`Msg ${msg.id} ('${msg.subject}') prefilter result: ${res.passes_prefilter} (Reason: ${res.reason || "passed"})`);
    return res.passes_prefilter;
  });

  console.log(`\nPrefiltered ${prefiltered.length} messages out of ${fetchedMessages.length}`);

  // STAGE 3: AI EXTRACTION (GEMINI)
  console.log("\n--- STAGE 3: AI EXTRACTION ---");
  console.log("Calling Gemini API with GEMINI_API_KEY...");

  let extracted: any[] = [];
  try {
    extracted = await extractCommitments(prefiltered);
    console.log(`STAGE 3 PASS: Extracted ${extracted.length} commitments from Gemini API.`);
    console.log("Extracted Data:", JSON.stringify(extracted, null, 2));
  } catch (err: any) {
    console.log("STAGE 3 FAIL: Gemini extraction failed:", err.message);
  }

  // STAGE 3.5: CONFIDENCE SCORING
  console.log("\n--- STAGE 3.5: CONFIDENCE SCORING ---");
  const scored = extracted.map((c) => {
    const scoreResult = scoreConfidence(c);
    console.log(`Scored '${c.task}': Score=${scoreResult.confidenceScore}, Tier=${scoreResult.tier}`);
    return {
      ...c,
      confidenceScore: scoreResult.confidenceScore,
      confidenceTier: scoreResult.tier,
      confidenceExplanation: scoreResult.explanation,
    };
  });

  // STAGE 4: DATABASE PERSISTENCE
  console.log("\n--- STAGE 4: DATABASE PERSISTENCE ---");
  try {
    const persisted = await persistScoredCommitmentsBatch("user_demo_001", scored);
    console.log(`STAGE 4 PASS: Persisted ${persisted.length} commitments to MongoDB.`);
    const commitmentsInDb = await CommitmentModel.find({ user_id: "user_demo_001" }).lean();
    console.log(`Total Commitments in MongoDB for user_demo_001: ${commitmentsInDb.length}`);
    console.log(JSON.stringify(commitmentsInDb, null, 2));
  } catch (err: any) {
    console.log("STAGE 4 FAIL: MongoDB persistence failed:", err.message);
  }

  process.exit(0);
}

runDiagnostic();
