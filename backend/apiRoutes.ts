import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import type {
  Commitment,
  Evidence,
  CommunicationDraft,
  AuditLogEntry,
} from "../shared/types/index.js";
import {
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  storeTokens,
  getStoredTokens,
} from "./oauth/gmailOAuth.js";
import { connectMongo } from "../shared/db/connect.js";
import {
  CommitmentModel,
  EvidenceModel,
  CommunicationDraftModel,
  AuditLogEntryModel,
  IntegrationModel,
} from "../shared/db/models.js";
import { syncGmailMessages } from "./services/gmailSync.js";

const oauthStateStore = new Map<string, { createdAt: number }>();

function getUserId(req: Request): string {
  return (req.query.userId as string) || "user_demo_001";
}

export function registerDashboardRoutes(app: Express): void {
  let dbConnected = false;

  const ensureDb = async () => {
    if (!dbConnected) {
      await connectMongo();
      dbConnected = true;
    }
  };

  // ============================================================================
  // COMMITMENTS ENDPOINTS
  // ============================================================================

  app.get("/api/commitments", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      let query = CommitmentModel.find({ user_id: userId });

      // Apply filters
      if (req.query.status) {
        if (req.query.status === "COMPLETED") {
          query = query.where("status").in(["COMPLETED", "ARCHIVED"]);
        } else {
          query = query.where("status").equals(req.query.status);
        }
      }
      if (req.query.view && req.query.view === "PENDING") {
        query = query.where("status").in(["PENDING", "CONFIRMED", "DETECTED", "AT_RISK"]);
      }
      if (req.query.view && req.query.view === "COMPLETED") {
        query = query.where("status").in(["COMPLETED", "ARCHIVED"]);
      }
      if (req.query.view && req.query.view === "OVERDUE") {
        query = query.where("status").equals("OVERDUE");
      }
      if (req.query.view && req.query.view === "ALL") {
        query = query.where("status").ne("DISMISSED");
      }
      if (req.query.requester) {
        query = query.where("requester").equals(req.query.requester);
      }
      if (req.query.q) {
        const searchRegex = new RegExp(req.query.q as string, "i");
        query = query.where("title").regex(searchRegex);
      }

      // Pagination
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const skip = (page - 1) * pageSize;

      const commitments = await query
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean<Commitment[]>();

      res.json({ commitments: commitments || [] });
    } catch (error) {
      console.error("Error fetching commitments:", error);
      res.status(500).json({ error: "Failed to fetch commitments" });
    }
  });

  app.get("/api/commitments/:id", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const commitment = await CommitmentModel.findOne({
        id: req.params.id,
        user_id: userId,
      }).lean<Commitment>();

      if (!commitment) {
        return res.status(404).json({ error: "Commitment not found" });
      }

      const evidence = await EvidenceModel.find({
        commitment_id: req.params.id,
      }).lean<Evidence[]>();

      res.json({ commitment, evidence: evidence || [] });
    } catch (error) {
      console.error("Error fetching commitment detail:", error);
      res.status(500).json({ error: "Failed to fetch commitment" });
    }
  });

  app.get("/api/commitments/:id/evidence", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const evidence = await EvidenceModel.find({
        commitment_id: req.params.id,
      }).lean<Evidence[]>();

      res.json(evidence || []);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ error: "Failed to fetch evidence" });
    }
  });

  app.post("/api/commitments/:id/confirm", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const commitment = await CommitmentModel.findOneAndUpdate(
        { id: req.params.id, user_id: userId },
        {
          status: "CONFIRMED",
          updated_at: new Date(),
        },
        { new: true }
      ).lean<Commitment>();

      if (!commitment) {
        return res.status(404).json({ error: "Commitment not found" });
      }

      res.json(commitment);
    } catch (error) {
      console.error("Error confirming commitment:", error);
      res.status(500).json({ error: "Failed to confirm commitment" });
    }
  });

  app.post("/api/commitments/:id/dismiss", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const commitment = await CommitmentModel.findOneAndUpdate(
        { id: req.params.id, user_id: userId },
        {
          status: "DISMISSED",
          updated_at: new Date(),
        },
        { new: true }
      ).lean<Commitment>();

      if (!commitment) {
        return res.status(404).json({ error: "Commitment not found" });
      }

      res.json(commitment);
    } catch (error) {
      console.error("Error dismissing commitment:", error);
      res.status(500).json({ error: "Failed to dismiss commitment" });
    }
  });

  app.post("/api/commitments/:id/mark-complete", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const commitment = await CommitmentModel.findOneAndUpdate(
        { id: req.params.id, user_id: userId },
        {
          status: "COMPLETED",
          updated_at: new Date(),
        },
        { new: true }
      ).lean<Commitment>();

      if (!commitment) {
        return res.status(404).json({ error: "Commitment not found" });
      }

      res.json(commitment);
    } catch (error) {
      console.error("Error marking commitment complete:", error);
      res.status(500).json({ error: "Failed to mark commitment complete" });
    }
  });

  app.patch("/api/commitments/:id", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const commitment = await CommitmentModel.findOneAndUpdate(
        { id: req.params.id, user_id: userId },
        {
          ...req.body,
          updated_at: new Date(),
        },
        { new: true }
      ).lean<Commitment>();

      if (!commitment) {
        return res.status(404).json({ error: "Commitment not found" });
      }

      res.json(commitment);
    } catch (error) {
      console.error("Error updating commitment:", error);
      res.status(500).json({ error: "Failed to update commitment" });
    }
  });

  // ============================================================================
  // DRAFT ENDPOINTS
  // ============================================================================

  app.get("/api/drafts", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      let query = CommunicationDraftModel.find();

      if (req.query.status) {
        query = query.where("status").equals(req.query.status);
      } else {
        query = query.where("status").equals("queued");
      }

      const drafts = await query.lean<CommunicationDraft[]>();

      const items = await Promise.all(
        (drafts || []).map(async (draft) => {
          const commitment = await CommitmentModel.findOne({
            id: draft.commitment_id,
            user_id: userId,
          }).lean<Commitment>();
          return {
            draft,
            commitment: commitment || null,
            createdAtLabel: new Date(draft.created_at).toLocaleString(),
          };
        })
      );

      res.json({ items: items.filter((item) => item.commitment !== null) });
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });

  app.post("/api/drafts/:id/approve", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const draftToApprove = await CommunicationDraftModel.findOne({
        id: req.params.id,
      }).lean<CommunicationDraft>();

      if (!draftToApprove) {
        return res.status(404).json({ error: "Draft not found" });
      }

      const draft = await CommunicationDraftModel.findOneAndUpdate(
        { id: req.params.id },
        {
          status: "approved_sent",
          sent_at: new Date(),
          final_sent_content: draftToApprove.content,
        },
        { new: true }
      ).lean<CommunicationDraft>();

      res.json(draft);
    } catch (error) {
      console.error("Error approving draft:", error);
      res.status(500).json({ error: "Failed to approve draft" });
    }
  });

  app.post("/api/drafts/:id/discard", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const draft = await CommunicationDraftModel.findOneAndUpdate(
        { id: req.params.id },
        { status: "discarded" },
        { new: true }
      ).lean<CommunicationDraft>();

      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      res.json(draft);
    } catch (error) {
      console.error("Error discarding draft:", error);
      res.status(500).json({ error: "Failed to discard draft" });
    }
  });

  app.post("/api/drafts/:id/snooze", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const draft = await CommunicationDraftModel.findOneAndUpdate(
        { id: req.params.id },
        { status: "snoozed" },
        { new: true }
      ).lean<CommunicationDraft>();

      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      res.json(draft);
    } catch (error) {
      console.error("Error snoozing draft:", error);
      res.status(500).json({ error: "Failed to snooze draft" });
    }
  });

  app.post("/api/drafts/:id/send", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const { content } = req.body;

      const draft = await CommunicationDraftModel.findOneAndUpdate(
        { id: req.params.id },
        {
          status: "edited_sent",
          sent_at: new Date(),
          final_sent_content: content,
        },
        { new: true }
      ).lean<CommunicationDraft>();

      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      res.json(draft);
    } catch (error) {
      console.error("Error sending draft:", error);
      res.status(500).json({ error: "Failed to send draft" });
    }
  });

  // ============================================================================
  // CONFIRMATION INBOX
  // ============================================================================

  app.get("/api/confirmations", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const commitments = await CommitmentModel.find({
        user_id: userId,
        status: { $in: ["DETECTED", "PENDING"] },
        confidence_score: { $gte: 0.4, $lt: 0.75 },
      }).lean<Commitment[]>();

      const items = (commitments || []).map((c) => ({
        commitment: c,
        confidenceScore: c.confidence_score,
        extractionReasoning: "Detected from email message via Gemini AI reasoning pipeline.",
        sourcePreview: `"${c.description.substring(0, 120)}..."`,
      }));

      res.json({ items });
    } catch (error) {
      console.error("Error fetching confirmations:", error);
      res.status(500).json({ error: "Failed to fetch confirmations" });
    }
  });

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const auditLogs = await AuditLogEntryModel.find({
        commitment_id: { $exists: true },
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean<AuditLogEntry[]>();

      const notifications = await Promise.all(
        (auditLogs || []).map(async (log) => {
          const commitment = await CommitmentModel.findOne({
            id: log.commitment_id,
          }).lean<Commitment>();
          return {
            id: log.id,
            title: getEventTitle(log.event_type),
            message: commitment?.title || "Unknown commitment",
            eventType: log.event_type,
            severity: getSeverity(log.event_type),
            timestamp: log.timestamp,
            isRead: false,
            actionLink: commitment ? `/commitments/${commitment.id}` : null,
          };
        })
      );

      res.json({ notifications });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();

      const total = await CommitmentModel.countDocuments({ user_id: userId, status: { $ne: "DISMISSED" } });
      const completed = await CommitmentModel.countDocuments({
        user_id: userId,
        status: "COMPLETED",
      });
      const overdue = await CommitmentModel.countDocuments({
        user_id: userId,
        status: "OVERDUE",
      });
      const dueToday = await CommitmentModel.countDocuments({
        user_id: userId,
        status: { $in: ["PENDING", "CONFIRMED", "DETECTED", "AT_RISK"] },
      });

      const atRiskCommitments = await CommitmentModel.find({
        user_id: userId,
        status: { $ne: "DISMISSED" },
      }).lean<Commitment[]>();
      const atRisk = (atRiskCommitments || []).filter(
        (c) => c.status === "AT_RISK" || c.confidence_score < 0.75
      ).length;

      res.json({
        total,
        atRisk,
        dueToday,
        completed,
        overdue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        total: 0,
        atRisk: 0,
        dueToday: 0,
        completed: 0,
        overdue: 0,
      });
    }
  });

  // ============================================================================
  // SETTINGS
  // ============================================================================

  app.get("/api/settings", (req: Request, res: Response) => {
    const userId = getUserId(req);
    res.json({
      profile: {
        name: "Demo User",
        email: "demo@example.com",
        timezone: "America/New_York",
      },
      integrations: {
        gmail: { connected: true },
        github: { connected: false },
        google_calendar: { connected: false },
      },
      notification_preferences: {
        email_on_overdue: true,
        email_on_completion: false,
        slack_notifications: false,
      },
    });
  });

  app.post("/api/settings", (req: Request, res: Response) => {
    res.json({ success: true });
  });

  // ============================================================================
  // OAUTH - GMAIL
  // ============================================================================

  app.get("/api/integrations/auth/gmail", (req: Request, res: Response) => {
    const state = randomBytes(32).toString("hex");
    oauthStateStore.set(state, { createdAt: Date.now() });

    const authUrl = generateAuthorizationUrl(state);
    res.json({ authUrl });
  });

  app.get("/integrations/connect/gmail/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
      return res.status(400).send("Missing code or state parameter");
    }

    const storedState = oauthStateStore.get(state);
    if (!storedState || Date.now() - storedState.createdAt > 10 * 60 * 1000) {
      return res.status(400).send("Invalid or expired state");
    }

    try {
      const { tokens } = await exchangeCodeForTokens(code, state);
      const userId = getUserId(req);

      await ensureDb();

      await IntegrationModel.findOneAndUpdate(
        { user_id: userId, provider: "gmail" },
        {
          id: `int_gmail_${userId}`,
          user_id: userId,
          provider: "gmail",
          auth_token: JSON.stringify(tokens),
          scopes: tokens.scopes,
          status: "connected",
          last_synced_at: new Date(),
        },
        { upsert: true, new: true }
      );

      syncGmailMessages(userId).catch((err) =>
        console.error("Initial Gmail scan error:", err)
      );

      res.redirect("/oauth-success");
    } catch (error) {
      console.error("OAuth error:", error);
      res.redirect("/oauth-error");
    }
  });

  // ============================================================================
  // INTEGRATIONS & MANUAL SYNC
  // ============================================================================

  app.post("/api/integrations/sync/gmail", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();
      const result = await syncGmailMessages(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Manual Gmail sync error:", error);
      res.status(500).json({ error: "Failed to sync Gmail messages" });
    }
  });

  app.get("/api/integrations/status/:provider", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();
      const { provider } = req.params;

      const integration = await IntegrationModel.findOne({
        user_id: userId,
        provider,
      }).lean();

      if (!integration) {
        return res.json({
          provider,
          status: "disconnected",
          connected: false,
        });
      }

      res.json({
        provider,
        status: integration.status,
        connected: integration.status === "connected",
        last_synced_at: integration.last_synced_at,
      });
    } catch (error) {
      console.error("Error checking integration status:", error);
      res.status(500).json({ error: "Failed to check integration status" });
    }
  });

  app.post("/api/integrations/disconnect/:provider", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await ensureDb();
      const { provider } = req.params;

      await IntegrationModel.deleteOne({
        user_id: userId,
        provider,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting integration:", error);
      res.status(500).json({ error: "Failed to disconnect integration" });
    }
  });
}

function getEventTitle(eventType: string): string {
  const titles: Record<string, string> = {
    status_change: "Status Updated",
    priority_recalc: "Priority Recalculated",
    evidence_matched: "Evidence Found",
    draft_generated: "Draft Created",
    draft_sent: "Draft Sent",
  };
  return titles[eventType] || "Event";
}

function getSeverity(eventType: string): "error" | "warning" | "info" {
  switch (eventType) {
    case "status_change":
      return "warning";
    case "draft_sent":
      return "info";
    case "evidence_matched":
      return "info";
    default:
      return "info";
  }
}
