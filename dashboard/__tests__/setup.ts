/**
 * Dashboard Test Setup
 *
 * Global mock configuration and test utilities for Dashboard tests.
 */

import { vi } from "vitest";

// Mock Zustand store
vi.mock("../store", () => ({
  useDashboardStore: vi.fn(() => ({
    commitments: [],
    evidence: {},
    drafts: [],
    auditLogs: [],
    approvalQueue: [],
    confirmationItems: [],
    notifications: [],
    stats: {
      total: 0,
      atRisk: 0,
      dueToday: 0,
      completed: 0,
      overdue: 0,
    },
    currentView: "PENDING",
    filters: {
      view: "PENDING",
      sortBy: "priority_score",
      sortOrder: "desc",
      page: 1,
      pageSize: 20,
    },
    isLoading: false,
    error: null,
    lastSyncedAt: null,

    setCommitments: vi.fn(),
    setEvidence: vi.fn(),
    setDrafts: vi.fn(),
    setAuditLogs: vi.fn(),
    setApprovalQueue: vi.fn(),
    setConfirmationItems: vi.fn(),
    setNotifications: vi.fn(),
    setStats: vi.fn(),
    setCurrentView: vi.fn(),
    setFilters: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setLastSyncedAt: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock router
vi.mock("../routing/router", () => ({
  useRouter: vi.fn(() => ({
    currentPage: "dashboard",
    selectedCommitmentId: null,
    searchQuery: "",
    navigate: vi.fn(),
    goBack: vi.fn(),
    setSearchQuery: vi.fn(),
    reset: vi.fn(),
  })),
  useCurrentPage: vi.fn(() => "dashboard"),
  useNavigate: vi.fn(() => vi.fn()),
}));

// Mock API client
vi.mock("../services/api", () => ({
  dashboardApi: {
    getCommitments: vi.fn().mockResolvedValue({
      commitments: [],
      total: 0,
      page: 1,
      pageCount: 1,
      hasNextPage: false,
    }),
    getCommitmentDetail: vi.fn().mockResolvedValue({
      commitment: {},
      evidence: [],
      drafts: [],
      auditHistory: [],
      relatedCommitments: [],
    }),
    getEvidence: vi.fn().mockResolvedValue([]),
    getApprovalQueue: vi.fn().mockResolvedValue({
      items: [],
      totalPending: 0,
      countByType: {},
    }),
    getConfirmationInbox: vi.fn().mockResolvedValue({
      items: [],
      totalPending: 0,
    }),
    getNotifications: vi.fn().mockResolvedValue({
      notifications: [],
      unreadCount: 0,
      hasMore: false,
    }),
    getStatistics: vi.fn().mockResolvedValue({
      total: 0,
      atRisk: 0,
      dueToday: 0,
      completed: 0,
      overdue: 0,
    }),
    confirmCommitment: vi.fn().mockResolvedValue({}),
    dismissCommitment: vi.fn().mockResolvedValue({}),
    approveDraft: vi.fn().mockResolvedValue({}),
    discardDraft: vi.fn().mockResolvedValue({}),
    snoozeDraft: vi.fn().mockResolvedValue({}),
    sendDraft: vi.fn().mockResolvedValue({}),
    markCommitmentComplete: vi.fn().mockResolvedValue({}),
    updateCommitment: vi.fn().mockResolvedValue({}),
  },
}));

// Mock data fetching hooks
vi.mock("../hooks/useDashboardData", () => ({
  useFetchCommitments: vi.fn(),
  useFetchStats: vi.fn(),
  useFetchApprovalQueue: vi.fn(),
  useFetchConfirmationInbox: vi.fn(),
  useFetchNotifications: vi.fn(),
  useRefreshDashboard: vi.fn(() => vi.fn()),
}));

// Mock initialization hook
vi.mock("../hooks/useDashboardInit", () => ({
  useDashboardInit: vi.fn(() => ({
    isReady: true,
    error: null,
    refresh: vi.fn(),
  })),
}));

// Mock aggregation utilities
vi.mock("../services/aggregation", () => ({
  computeDashboardStats: vi.fn((commitments) => ({
    total: commitments.length,
    atRisk: 0,
    dueToday: 0,
    completed: 0,
    overdue: 0,
  })),
  calculateDaysRemaining: vi.fn((deadline) => {
    if (!deadline) return null;
    return Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }),
  formatDeadlineLabel: vi.fn((daysRemaining) => {
    if (daysRemaining === null) return "No deadline";
    if (daysRemaining === 0) return "Today";
    if (daysRemaining === 1) return "Tomorrow";
    if (daysRemaining > 0) return `${daysRemaining} days left`;
    return `${Math.abs(daysRemaining)} days overdue`;
  }),
  determineRiskLevel: vi.fn((status, deadline, confidence) => {
    if (status === "OVERDUE" || status === "AT_RISK") return "HIGH";
    if (status === "COMPLETED") return "LOW";
    if (confidence < 0.4) return "HIGH";
    if (confidence < 0.75) return "MEDIUM";
    return "LOW";
  }),
  groupCommitmentsByStatus: vi.fn((commitments) => ({})),
  getRequesterStats: vi.fn((commitments) => []),
  getTimeBasedMetrics: vi.fn((commitments) => ({
    completionRate: 0,
    averageTimeToComplete: null,
    onTimeCompletionRate: 0,
  })),
}));

/**
 * Helper function to create mock commitment
 */
export function createMockCommitment(
  overrides: Record<string, any> = {}
): any {
  return {
    id: "commit_1",
    user_id: "user_1",
    title: "Test commitment",
    description: "Test description",
    requester: "test@example.com",
    source: "gmail",
    source_reference: "ref_1",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    confidence_score: 0.85,
    priority_score: 4,
    verification_method: "github_commit",
    linked_repo: "test/repo",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Helper function to create mock draft
 */
export function createMockDraft(overrides: Record<string, any> = {}): any {
  return {
    id: "draft_1",
    commitment_id: "commit_1",
    draft_type: "acknowledgement",
    content: "Test draft content",
    status: "queued",
    created_at: new Date(),
    sent_at: null,
    final_sent_content: null,
    ...overrides,
  };
}

/**
 * Helper function to create mock evidence
 */
export function createMockEvidence(overrides: Record<string, any> = {}): any {
  return {
    id: "evidence_1",
    commitment_id: "commit_1",
    evidence_type: "github_commit",
    evidence_reference: "sha:abc123",
    match_confidence: 0.85,
    detected_at: new Date(),
    ...overrides,
  };
}

/**
 * Helper function to create mock approval queue item
 */
export function createMockApprovalQueueItem(
  overrides: Record<string, any> = {}
): any {
  return {
    draft: createMockDraft(),
    commitment: createMockCommitment(),
    draftTypeLabel: "Acknowledgement",
    createdAtLabel: "5 minutes ago",
    isApprovable: true,
    ...overrides,
  };
}

/**
 * Helper function to create mock confirmation item
 */
export function createMockConfirmationItem(
  overrides: Record<string, any> = {}
): any {
  return {
    commitment: createMockCommitment(),
    confidenceScore: 0.65,
    confidenceTier: "MEDIUM",
    extractionReasoning:
      "Based on commitment language and deadline",
    sourcePreview: "I'll have this done by Friday",
    isActedUpon: false,
    ...overrides,
  };
}

/**
 * Helper function to create mock notification
 */
export function createMockNotification(
  overrides: Record<string, any> = {}
): any {
  return {
    id: "notif_1",
    eventType: "commitment_detected",
    commitment_id: "commit_1",
    title: "New commitment detected",
    message: "New commitment found in Gmail",
    timestamp: new Date(),
    isRead: false,
    actionLink: "/commitments/commit_1",
    severity: "info",
    ...overrides,
  };
}
