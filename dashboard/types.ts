/**
 * Dashboard Module - Local Types
 *
 * Defines interfaces and types specific to the Dashboard module for UI state management,
 * filtering, and presentation logic.
 * All shared types (Commitment, Evidence, CommunicationDraft, Integration, etc.) are
 * imported from shared/types and never redefined here.
 */

import type {
  Commitment,
  CommitmentStatus,
  Evidence,
  CommunicationDraft,
  CommunicationDraftType,
  Integration,
  IntegrationProvider,
  User,
  AuditLogEntry,
} from "../shared/types";

// ============================================================================
// DASHBOARD VIEWS AND FILTERS
// ============================================================================

/** Enumeration of dashboard view types for filtering and display organization. */
export type DashboardViewType =
  | "PENDING"
  | "UPCOMING"
  | "OVERDUE"
  | "COMPLETED"
  | "ALL";

/** Enumeration of sort order options for commitment lists. */
export type SortOrder = "asc" | "desc";

/** Enumeration of commitment sort fields. */
export type CommitmentSortField =
  | "deadline"
  | "priority_score"
  | "confidence_score"
  | "created_at"
  | "status";

/**
 * Filter criteria for querying and displaying commitments on the dashboard.
 *
 * Used by the UI to construct queries against the BFF API and organize
 * commitment lists with consistent filtering logic across all views.
 */
export interface CommitmentFilterState {
  /** View type filter (groups commitments by temporal/status buckets) */
  view: DashboardViewType;

  /** Optional status filter (if more granular control is needed) */
  status?: CommitmentStatus;

  /** Search query (matches title, description, requester) */
  searchQuery?: string;

  /** Minimum confidence score threshold (0.0 - 1.0) */
  minConfidence?: number;

  /** Minimum priority score threshold (0 - 5) */
  minPriority?: number;

  /** Filter by requester email/name */
  requester?: string;

  /** Filter by commitment source (gmail, github, manual) */
  source?: string;

  /** Sort field and order */
  sortBy: CommitmentSortField;
  sortOrder: SortOrder;

  /** Pagination parameters */
  page: number;
  pageSize: number;
}

/**
 * Default filter state for a new dashboard view.
 */
export interface DefaultFilterState {
  view: DashboardViewType;
  sortBy: CommitmentSortField;
  sortOrder: SortOrder;
  pageSize: number;
}

// ============================================================================
// COMMITMENT DISPLAY TYPES
// ============================================================================

/**
 * UI-optimized commitment representation for dashboard display.
 *
 * Enriched with computed fields (like days remaining) that are useful for display
 * but derive from the base Commitment type.
 */
export interface CommitmentCard {
  /** Base commitment data */
  commitment: Commitment;

  /** Days remaining until deadline (null if no deadline) */
  daysRemaining: number | null;

  /** Percentage of time elapsed (0-1) */
  timeElapsedPercentage: number;

  /** Risk level for UI display (LOW, MEDIUM, HIGH) */
  riskLevel: "LOW" | "MEDIUM" | "HIGH";

  /** Number of evidence items linked to this commitment */
  evidenceCount: number;

  /** Whether this commitment has a pending draft awaiting approval */
  hasPendingDraft: boolean;

  /** Relative deadline label for human-readable display ("2 days", "overdue", etc.) */
  deadlineLabel: string;

  /** Whether the deadline is in the past */
  isPastDeadline: boolean;
}

/**
 * Detailed view of a commitment with full evidence timeline and draft history.
 *
 * Returned by the commitment detail API route and displayed in the detail screen.
 */
export interface CommitmentDetail {
  /** Base commitment data */
  commitment: Commitment;

  /** All evidence items linked to this commitment, newest first */
  evidence: Evidence[];

  /** All communication drafts related to this commitment, newest first */
  drafts: CommunicationDraft[];

  /** Audit log entries for this commitment, newest first */
  auditHistory: AuditLogEntry[];

  /** Related commitments (same requester, overlapping deadline, etc.) */
  relatedCommitments?: Commitment[];
}

// ============================================================================
// APPROVAL QUEUE AND CONFIRMATION INBOX TYPES
// ============================================================================

/**
 * A communication draft awaiting user approval or action.
 *
 * Presented in the Approval Queue screen with inline editing and actions
 * (approve as-is, edit, discard, snooze).
 */
export interface ApprovalQueueItem {
  /** The draft itself */
  draft: CommunicationDraft;

  /** The commitment this draft relates to */
  commitment: Commitment;

  /** Draft type metadata (tone, goal, trigger) for UI display */
  draftTypeLabel: string;

  /** Time relative to now ("5 minutes ago", "1 hour ago") */
  createdAtLabel: string;

  /** Whether the draft can still be approved (not expired/superseded) */
  isApprovable: boolean;
}

/**
 * A medium-confidence commitment awaiting user confirmation.
 *
 * Presented in the Confirmation Inbox screen where users can quickly
 * confirm or reject suspected commitments with one tap per item.
 */
export interface ConfirmationItem {
  /** The commitment being requested for confirmation */
  commitment: Commitment;

  /** Extraction confidence score (0.0 - 1.0) */
  confidenceScore: number;

  /** Confidence tier label for display (HIGH, MEDIUM, LOW) */
  confidenceTier: string;

  /** Explanation of why this commitment was extracted */
  extractionReasoning: string;

  /** Source message preview (snippet of original email/message) */
  sourcePreview: string;

  /** Whether the user has already acted on this (for disabling actions) */
  isActedUpon: boolean;
}

// ============================================================================
// NOTIFICATION AND NOTIFICATION CENTER TYPES
// ============================================================================

/** Enumeration of notification event types. */
export type NotificationEventType =
  | "commitment_detected"
  | "commitment_confirmed"
  | "evidence_matched"
  | "commitment_at_risk"
  | "commitment_overdue"
  | "draft_generated"
  | "draft_approved"
  | "draft_sent"
  | "integration_error"
  | "verification_complete";

/**
 * A notification item for the Notification Center.
 *
 * Chronological feed of significant system events:
 * risk flags, overdue transitions, evidence matches, etc.
 */
export interface NotificationItem {
  /** Unique notification ID */
  id: string;

  /** Type of event */
  eventType: NotificationEventType;

  /** Related commitment ID (if applicable) */
  commitment_id?: string;

  /** Human-readable notification title */
  title: string;

  /** Detailed description of the event */
  message: string;

  /** When the event occurred */
  timestamp: Date;

  /** Whether the user has marked this as read */
  isRead: boolean;

  /** Optional action link (route/deep link) */
  actionLink?: string;

  /** Severity level for color/prominence in UI */
  severity: "info" | "warning" | "error";
}

// ============================================================================
// USER SETTINGS AND PREFERENCES
// ============================================================================

/**
 * Map of requester email/name to importance score (0-5).
 *
 * Used by the Priority Engine to boost commitments from high-importance
 * requesters (manager, key client, etc.).
 */
export interface StakeholderImportanceMap {
  [stakeholder: string]: number;
}

/**
 * User preferences for notifications and dashboard behavior.
 *
 * Returned by the user settings API and stored in the User model.
 */
export interface UserNotificationPreferences {
  /** Notify via push when new commitment detected */
  notifyOnDetection: boolean;

  /** Notify via push when commitment goes at-risk */
  notifyOnRisk: boolean;

  /** Notify via push when deadline passes without completion */
  notifyOnOverdue: boolean;

  /** Notify via push when draft is generated and awaiting approval */
  notifyOnDraftGenerated: boolean;

  /** Prefer email digest instead of real-time push notifications */
  digestMode: boolean;

  /** Digest frequency if digestMode is true ("daily" | "weekly") */
  digestFrequency?: "daily" | "weekly";

  /** Do not notify outside these hours (e.g., 8am - 6pm) */
  quietHoursStart?: string; // HH:MM format

  /** Do not notify outside these hours */
  quietHoursEnd?: string; // HH:MM format

  /** Timezone for deadline calculations and display */
  timezone?: string;
}

/**
 * User settings for risk detection and deadline-based behavior.
 *
 * Allows users to customize how Shadow interprets risk and overdue status.
 */
export interface UserRiskSettings {
  /** Custom risk window percentage (default 25% of commitment duration) */
  riskWindowPercentage?: number;

  /** Minimum days remaining to trigger a risk warning (default 2 hours) */
  minDaysRemainingForRisk?: number;

  /** Custom threshold for "at-risk" score (default 0.65) */
  atRiskThreshold?: number;

  /** Custom threshold for "critical-risk" score (default 0.85) */
  criticalRiskThreshold?: number;

  /** Auto-queue recovery drafts when deadline is missed */
  autoQueueRecoveryDrafts?: boolean;
}

/**
 * Complete user dashboard settings and preferences.
 *
 * Aggregates all user-configurable dashboard behavior.
 */
export interface UserDashboardSettings {
  /** User account info */
  user: User;

  /** Notification preferences */
  notificationPreferences: UserNotificationPreferences;

  /** Risk thresholds and behavior */
  riskSettings: UserRiskSettings;

  /** Stakeholder importance scores */
  stakeholderImportance: StakeholderImportanceMap;

  /** Whether to show the 3D commitment view (if available) */
  enable3DView?: boolean;

  /** Whether to show tutorial/help overlays */
  showTutorials?: boolean;
}

// ============================================================================
// DASHBOARD STATE AND QUERY TYPES
// ============================================================================

/**
 * Query parameters for fetching commitment list from BFF.
 *
 * Mirrors CommitmentFilterState for API consumption.
 */
export interface CommitmentListQuery {
  view?: DashboardViewType;
  status?: CommitmentStatus;
  searchQuery?: string;
  minConfidence?: number;
  minPriority?: number;
  requester?: string;
  source?: string;
  sortBy?: CommitmentSortField;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

/**
 * Response from commitment list API route.
 *
 * Paginated list of commitment cards with metadata.
 */
export interface CommitmentListResponse {
  /** Array of commitment cards */
  commitments: CommitmentCard[];

  /** Total count of commitments matching the filter */
  total: number;

  /** Current page number */
  page: number;

  /** Total number of pages */
  pageCount: number;

  /** Whether there are more pages */
  hasNextPage: boolean;
}

/**
 * Response from approval queue API route.
 *
 * List of pending drafts awaiting user action.
 */
export interface ApprovalQueueResponse {
  /** Array of drafts awaiting approval */
  items: ApprovalQueueItem[];

  /** Total count of pending approvals */
  totalPending: number;

  /** By draft type for quick filtering in UI */
  countByType: Partial<Record<CommunicationDraftType, number>>;
}

/**
 * Response from confirmation inbox API route.
 *
 * List of medium-confidence commitments awaiting confirmation.
 */
export interface ConfirmationInboxResponse {
  /** Array of pending confirmations */
  items: ConfirmationItem[];

  /** Total count of pending confirmations */
  totalPending: number;
}

/**
 * Response from notification center API route.
 *
 * Chronological list of recent events.
 */
export interface NotificationCenterResponse {
  /** Array of notifications, newest first */
  notifications: NotificationItem[];

  /** Total count of unread notifications */
  unreadCount: number;

  /** Whether there are more notifications to load */
  hasMore: boolean;
}
