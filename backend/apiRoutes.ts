import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import type {
  Commitment,
  Evidence,
  CommunicationDraft,
  AuditLogEntry,
} from "../shared/types";
import {
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  storeTokens,
  getStoredTokens,
} from "./oauth/gmailOAuth.js";

/**
 * Registers all Dashboard BFF routes on the Express app.
 *
 * PRODUCT_SPEC.md Section 21 defines the conceptual REST surface; routes aggregate
 * data from Detection, Verification, and Communication modules and format for the UI.
 *
 * In development, uses realistic mock data.
 * In production, would query database and call module functions.
 */
// In-memory OAuth state storage (mock - in production, use session/Redis)
const oauthStateStore = new Map<string, { createdAt: number }>();

export function registerDashboardRoutes(app: Express): void {
  // ============================================================================
  // MOCK DATA - In-Memory Store (for development/demo)
  // ============================================================================

  const MOCK_USER_ID = "user_demo_001";

  const mockCommitments: Record<string, Commitment> = {
    commit_001: {
      id: "commit_001",
      user_id: MOCK_USER_ID,
      title: "Implement user authentication system",
      description:
        "Need to add JWT-based authentication to the API with refresh tokens",
      requester: "alice@example.com",
      source: "gmail",
      source_reference: "msg_123",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: "PENDING",
      confidence_score: 0.92,
      priority_score: 5,
      verification_method: "github_commit",
      linked_repo: "myorg/myapp",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    commit_002: {
      id: "commit_002",
      user_id: MOCK_USER_ID,
      title: "Review pull request for database optimization",
      description: "Please review the PR #234 for database query optimization",
      requester: "bob@example.com",
      source: "github",
      source_reference: "issue_456",
      deadline: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours
      status: "OVERDUE",
      confidence_score: 0.85,
      priority_score: 4,
      verification_method: "github_pr",
      linked_repo: "myorg/myapp",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    commit_003: {
      id: "commit_003",
      user_id: MOCK_USER_ID,
      title: "Deploy to production",
      description: "Deploy the latest release to production environment",
      requester: "charlie@example.com",
      source: "gmail",
      source_reference: "msg_789",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: "PENDING",
      confidence_score: 0.78,
      priority_score: 3,
      verification_method: "calendar_attendance",
      linked_repo: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    },
    commit_004: {
      id: "commit_004",
      user_id: MOCK_USER_ID,
      title: "Send meeting notes to stakeholders",
      description: "Compile and distribute meeting minutes from Q3 planning session",
      requester: "diana@example.com",
      source: "gmail",
      source_reference: "msg_101",
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: "COMPLETED",
      confidence_score: 0.88,
      priority_score: 2,
      verification_method: "manual",
      linked_repo: null,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    commit_005: {
      id: "commit_005",
      user_id: MOCK_USER_ID,
      title: "Complete documentation update",
      description: "Update API documentation with new endpoints",
      requester: "eve@example.com",
      source: "github",
      source_reference: "issue_222",
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: "COMPLETED",
      confidence_score: 0.81,
      priority_score: 2,
      verification_method: "github_commit",
      linked_repo: "myorg/docs",
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  };

  const mockEvidence: Record<string, Evidence[]> = {
    commit_001: [
      {
        id: "ev_001",
        commitment_id: "commit_001",
        evidence_type: "github_commit",
        evidence_reference: "commit:abc123def456",
        match_confidence: 0.95,
        detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
    commit_004: [
      {
        id: "ev_002",
        commitment_id: "commit_004",
        evidence_type: "manual",
        evidence_reference: "Manually marked complete by user",
        match_confidence: 1.0,
        detected_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ],
    commit_005: [
      {
        id: "ev_003",
        commitment_id: "commit_005",
        evidence_type: "github_commit",
        evidence_reference: "commit:xyz789abc123",
        match_confidence: 0.92,
        detected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  };

  const mockDrafts: Record<string, CommunicationDraft> = {
    draft_001: {
      id: "draft_001",
      commitment_id: "commit_001",
      draft_type: "acknowledgement",
      content: "Hi Alice, I acknowledge your request to implement authentication. I'll start working on it tomorrow.",
      status: "queued",
      created_at: new Date(Date.now() - 30 * 60 * 1000),
      sent_at: null,
      final_sent_content: null,
    },
    draft_002: {
      id: "draft_002",
      commitment_id: "commit_002",
      draft_type: "recovery",
      content: "Hi Bob, I apologize for the delay on reviewing PR #234. Looking at it now.",
      status: "queued",
      created_at: new Date(Date.now() - 15 * 60 * 1000),
      sent_at: null,
      final_sent_content: null,
    },
  };

  const mockAuditLogs: AuditLogEntry[] = [
    {
      id: "audit_001",
      commitment_id: "commit_001",
      event_type: "status_change",
      before_state: { status: "DETECTED" },
      after_state: { status: "CONFIRMED" },
      contributing_factors: { confidence_score: 0.92 },
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      id: "audit_002",
      commitment_id: "commit_002",
      event_type: "status_change",
      before_state: { status: "PENDING" },
      after_state: { status: "OVERDUE" },
      contributing_factors: { reason: "deadline_passed" },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ];

  // ============================================================================
  // ROUTE HANDLERS
  // ============================================================================

  app.get("/api/commitments", (req: Request, res: Response) => {
    const { status, q: searchQuery, sortBy = "deadline", page = "1", pageSize = "20" } = req.query;
    let filtered = Object.values(mockCommitments);

    if (status && status !== "ALL") {
      filtered = filtered.filter((c) => c.status === status);
    }

    if (searchQuery && typeof searchQuery === "string") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      );
    }

    if (sortBy === "deadline") {
      filtered.sort((a, b) => {
        const aDeadline = a.deadline?.getTime() || Infinity;
        const bDeadline = b.deadline?.getTime() || Infinity;
        return aDeadline - bDeadline;
      });
    }

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const start = (pageNum - 1) * pageSizeNum;
    const paginated = filtered.slice(start, start + pageSizeNum);
    const pageCount = Math.ceil(filtered.length / pageSizeNum);

    // Return commitments directly as per hook expectation
    res.json({
      commitments: paginated,
      total: filtered.length,
      page: pageNum,
      pageCount,
      hasNextPage: pageNum < pageCount
    });
  });

  app.get("/api/commitments/:id", (req: Request, res: Response) => {
    const commitment = mockCommitments[req.params.id];
    if (!commitment) return res.status(404).json({ error: "Not found" });
    res.json({ commitment, evidence: mockEvidence[req.params.id] || [] });
  });

  app.get("/api/commitments/:id/evidence", (req: Request, res: Response) => {
    res.json(mockEvidence[req.params.id] || []);
  });

  app.post("/api/commitments/:id/confirm", (req: Request, res: Response) => {
    const commitment = mockCommitments[req.params.id];
    if (!commitment) return res.status(404).json({ error: "Not found" });
    commitment.status = "CONFIRMED";
    commitment.updated_at = new Date();
    res.json(commitment);
  });

  app.post("/api/commitments/:id/dismiss", (req: Request, res: Response) => {
    const commitment = mockCommitments[req.params.id];
    if (!commitment) return res.status(404).json({ error: "Not found" });
    commitment.status = "DISMISSED";
    commitment.updated_at = new Date();
    res.json(commitment);
  });

  app.post("/api/commitments/:id/mark-complete", (req: Request, res: Response) => {
    const commitment = mockCommitments[req.params.id];
    if (!commitment) return res.status(404).json({ error: "Not found" });
    commitment.status = "COMPLETED";
    commitment.updated_at = new Date();
    res.json(commitment);
  });

  app.get("/api/drafts", (req: Request, res: Response) => {
    const drafts = Object.values(mockDrafts).map((draft) => ({
      draft,
      commitment: mockCommitments[draft.commitment_id],
      draftTypeLabel: draft.draft_type,
      createdAtLabel: "just now",
      isApprovable: draft.status === "queued",
    }));
    res.json({ items: drafts, totalPending: drafts.length, countByType: {} });
  });

  app.post("/api/drafts/:id/approve", (req: Request, res: Response) => {
    const draft = mockDrafts[req.params.id];
    if (!draft) return res.status(404).json({ error: "Not found" });
    draft.status = "approved_sent";
    draft.sent_at = new Date();
    draft.final_sent_content = draft.content;
    res.json(draft);
  });

  app.post("/api/drafts/:id/discard", (req: Request, res: Response) => {
    const draft = mockDrafts[req.params.id];
    if (!draft) return res.status(404).json({ error: "Not found" });
    draft.status = "discarded";
    res.json(draft);
  });

  app.post("/api/drafts/:id/snooze", (req: Request, res: Response) => {
    const draft = mockDrafts[req.params.id];
    if (!draft) return res.status(404).json({ error: "Not found" });
    draft.status = "snoozed";
    res.json(draft);
  });

  app.post("/api/drafts/:id/send", (req: Request, res: Response) => {
    const draft = mockDrafts[req.params.id];
    if (!draft) return res.status(404).json({ error: "Not found" });
    const { content } = req.body;
    draft.status = "approved_sent";
    draft.sent_at = new Date();
    draft.final_sent_content = content || draft.content;
    res.json(draft);
  });

  app.get("/api/confirmations", (req: Request, res: Response) => {
    const items = Object.values(mockCommitments)
      .filter((c) => c.status === "DETECTED" && c.confidence_score >= 0.4 && c.confidence_score < 0.9)
      .map((c) => ({
        commitment: c,
        confidenceScore: c.confidence_score,
        confidenceTier: c.confidence_score >= 0.7 ? "HIGH" : c.confidence_score >= 0.5 ? "MEDIUM" : "LOW",
        extractionReasoning: "Extracted from email",
        sourcePreview: c.description.substring(0, 100),
        isActedUpon: false,
      }));
    res.json({ items, totalPending: items.length });
  });

  app.get("/api/notifications", (req: Request, res: Response) => {
    const notifications = mockAuditLogs.map((log) => ({
      id: log.id,
      commitment_id: log.commitment_id,
      eventType: log.event_type,
      title: `Status changed to ${log.after_state.status}`,
      message: mockCommitments[log.commitment_id]?.title || "Unknown",
      severity: "info" as const,
      timestamp: log.timestamp,
      isRead: false,
      actionLink: `/commitments/${log.commitment_id}`,
    }));
    res.json({ notifications, unreadCount: notifications.length, hasMore: false });
  });

  app.get("/api/stats", (req: Request, res: Response) => {
    const commitments = Object.values(mockCommitments);
    res.json({
      total: commitments.length,
      pending: commitments.filter((c) => c.status === "PENDING").length,
      atRisk: commitments.filter((c) => c.confidence_score < 0.7).length,
      dueToday: 1,
      completed: commitments.filter((c) => c.status === "COMPLETED").length,
      overdue: commitments.filter((c) => c.status === "OVERDUE").length,
    });
  });

  app.get("/api/analytics", (req: Request, res: Response) => {
    const commitments = Object.values(mockCommitments);
    const completed = commitments.filter((c) => c.status === "COMPLETED");

    res.json({
      completionRate: Math.round((completed.length / commitments.length) * 100),
      onTimeCompletion: 75,
      avgTimeToComplete: 3,
      requesterStats: [
        { requester: "alice@example.com", count: 2, completed: 1, completionRate: 50 },
        { requester: "bob@example.com", count: 1, completed: 0, completionRate: 0 },
        { requester: "charlie@example.com", count: 1, completed: 0, completionRate: 0 },
      ],
    });
  });

  app.get("/api/settings", (req: Request, res: Response) => {
    res.json({
      notifications: { onOverdue: true, onAtRisk: true, quietHours: { start: 22, end: 8 } },
      risk: { riskWindow: 25, atRiskThreshold: 0.65 },
      integrations: [
        { name: "gmail", status: "connected" },
        { name: "github", status: "connected" },
        { name: "google_calendar", status: "connected" },
      ],
      profile: { name: "Demo User", email: "demo@example.com", timezone: "America/New_York" },
    });
  });

  app.post("/api/settings", (req: Request, res: Response) => {
    res.json({ success: true });
  });

  // ============================================================================
  // GMAIL OAUTH ROUTES
  // ============================================================================

  app.get("/api/integrations/auth/gmail", (req: Request, res: Response) => {
    const state = randomBytes(32).toString("hex");
    oauthStateStore.set(state, { createdAt: Date.now() });

    try {
      const authUrl = generateAuthorizationUrl(state);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating authorization URL:", error);
      res.status(500).json({
        error: "Failed to generate authorization URL",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred",
      });
    }
  });

  app.get("/integrations/connect/gmail/callback", async (
    req: Request,
    res: Response
  ) => {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      const errorDescription =
        req.query.error_description ||
        "Unknown error";
      console.error(`OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `/oauth-error?error=${encodeURIComponent(String(error))}&description=${encodeURIComponent(String(errorDescription))}`
      );
    }

    // Validate state parameter
    if (!state || typeof state !== "string") {
      console.error("Invalid or missing state parameter");
      return res.redirect(
        "/oauth-error?error=invalid_state&description=Missing+or+invalid+state+parameter"
      );
    }

    if (!oauthStateStore.has(state)) {
      console.error("State parameter not found or expired");
      return res.redirect(
        "/oauth-error?error=state_expired&description=State+parameter+expired+or+invalid"
      );
    }

    // Remove used state (prevent replay attacks)
    oauthStateStore.delete(state);

    // Validate authorization code
    if (!code || typeof code !== "string") {
      console.error("Invalid or missing authorization code");
      return res.redirect(
        "/oauth-error?error=no_code&description=Missing+authorization+code"
      );
    }

    try {
      // Exchange code for tokens
      const { tokens, userId } = await exchangeCodeForTokens(
        code,
        state
      );

      // Store tokens (mock storage)
      storeTokens(userId, tokens);

      // Redirect back to dashboard with success message
      res.redirect(
        `/oauth-success?provider=gmail&user_id=${encodeURIComponent(userId)}&scopes=${encodeURIComponent(tokens.scopes.join(","))}`
      );
    } catch (error) {
      console.error("Token exchange failed:", error);
      return res.redirect(
        `/oauth-error?error=token_exchange_failed&description=${encodeURIComponent(
          error instanceof Error
            ? error.message
            : "Unknown error occurred"
        )}`
      );
    }
  });

  app.get("/api/integrations/status/:provider", (req: Request, res: Response) => {
    const { provider } = req.params;

    // For demo, return mock integration statuses
    const integrations: Record<string, any> = {
      gmail: { provider: "gmail", status: "connected", lastSync: new Date() },
      github: { provider: "github", status: "connected", lastSync: new Date() },
      google_calendar: {
        provider: "google_calendar",
        status: "connected",
        lastSync: new Date(),
      },
    };

    if (provider in integrations) {
      res.json(integrations[provider]);
    } else {
      res
        .status(404)
        .json({ error: "Integration not found" });
    }
  });

  app.post("/api/integrations/disconnect/:provider", (req: Request, res: Response) => {
    const { provider } = req.params;
    console.log(`Disconnecting integration: ${provider}`);
    res.json({ success: true, message: `Disconnected from ${provider}` });
  });
}
