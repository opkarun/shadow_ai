/**
 * Dashboard module configuration.
 * All tunable parameters for UI display, filtering, and default user preferences.
 * These should be environment-configurable in production, but sane defaults are provided.
 */

import type {
  DashboardViewType,
  DefaultFilterState,
  UserNotificationPreferences,
  UserRiskSettings,
} from "./types";

// ============================================================================
// DASHBOARD VIEW CONFIGURATION
// ============================================================================

/**
 * Default filter state for each dashboard view.
 *
 * Defines the default sort order, pagination, and display settings for
 * each view (PENDING, UPCOMING, OVERDUE, COMPLETED).
 * Based on PRODUCT_SPEC Section 22.
 */
export const DEFAULT_VIEW_FILTERS: Record<DashboardViewType, DefaultFilterState> = {
  PENDING: {
    view: "PENDING",
    sortBy: "priority_score",
    sortOrder: "desc",
    pageSize: 20,
  },

  UPCOMING: {
    view: "UPCOMING",
    sortBy: "deadline",
    sortOrder: "asc",
    pageSize: 20,
  },

  OVERDUE: {
    view: "OVERDUE",
    sortBy: "deadline",
    sortOrder: "asc",
    pageSize: 20,
  },

  COMPLETED: {
    view: "COMPLETED",
    sortBy: "created_at",
    sortOrder: "desc",
    pageSize: 20,
  },

  ALL: {
    view: "ALL",
    sortBy: "created_at",
    sortOrder: "desc",
    pageSize: 20,
  },
};

// ============================================================================
// DISPLAY CONFIGURATION
// ============================================================================

/**
 * Default pagination size for commitment lists.
 * Used when the user doesn't specify a custom pageSize.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum number of commitments to display per page.
 * Prevents UI slowdown from rendering huge lists.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Maximum number of notifications to fetch in one request.
 * Prevents notification center from becoming overwhelming.
 */
export const MAX_NOTIFICATIONS_PER_FETCH = 50;

/**
 * Maximum number of approval queue items to fetch.
 * Prevents overwhelming the user with too many pending drafts at once.
 */
export const MAX_APPROVAL_QUEUE_SIZE = 25;

/**
 * Maximum number of confirmation items to fetch.
 * User should handle these before seeing more.
 */
export const MAX_CONFIRMATION_ITEMS = 15;

// ============================================================================
// RISK LEVEL CONFIGURATION
// ============================================================================

/**
 * Risk score thresholds for UI display coloring and warnings.
 * Aligned with PRODUCT_SPEC Section 16 (Risk Detection and Escalation).
 */
export const RISK_LEVEL_THRESHOLDS = {
  // Low risk: score < 0.65
  LOW: 0.65,

  // Medium/high risk: score >= 0.65 and < 0.85
  MEDIUM: 0.85,

  // Critical risk: score >= 0.85
  CRITICAL: 1.0,
};

/**
 * Display colors and icons for each risk level.
 * Used by the UI to visually represent commitment status.
 */
export const RISK_LEVEL_DISPLAY = {
  LOW: {
    label: "Low Risk",
    color: "green",
    icon: "check-circle",
    backgroundColor: "bg-green-50",
    borderColor: "border-green-300",
    textColor: "text-green-700",
  },

  MEDIUM: {
    label: "At Risk",
    color: "amber",
    icon: "alert-circle",
    backgroundColor: "bg-amber-50",
    borderColor: "border-amber-300",
    textColor: "text-amber-700",
  },

  HIGH: {
    label: "Critical",
    color: "red",
    icon: "alert-triangle",
    backgroundColor: "bg-red-50",
    borderColor: "border-red-300",
    textColor: "text-red-700",
  },
};

/**
 * Display configuration for commitment status badges.
 * Maps each status to a color and label for UI display.
 */
export const STATUS_DISPLAY = {
  DETECTED: { label: "Detected", color: "blue", icon: "inbox" },
  CONFIRMED: { label: "Confirmed", color: "blue", icon: "check" },
  PENDING: { label: "Pending", color: "indigo", icon: "clock" },
  AT_RISK: { label: "At Risk", color: "amber", icon: "alert" },
  OVERDUE: { label: "Overdue", color: "red", icon: "alert-triangle" },
  COMPLETED: { label: "Completed", color: "green", icon: "check-circle" },
  ARCHIVED: { label: "Archived", color: "gray", icon: "archive" },
  RECOVERED: { label: "Recovered", color: "emerald", icon: "thumbs-up" },
  DISMISSED: { label: "Dismissed", color: "gray", icon: "x-circle" },
};

/**
 * Display configuration for confidence score tiers.
 * Aligned with PRODUCT_SPEC Section 10 (Confidence Scoring).
 */
export const CONFIDENCE_TIER_DISPLAY = {
  HIGH: {
    label: "High Confidence",
    color: "green",
    threshold: 0.75,
    icon: "star",
  },

  MEDIUM: {
    label: "Medium Confidence",
    color: "amber",
    threshold: 0.4,
    icon: "help-circle",
  },

  LOW: {
    label: "Low Confidence",
    color: "gray",
    threshold: 0.0,
    icon: "question-mark",
  },
};

/**
 * Display configuration for priority scores.
 * Priority ranges from 0 (low) to 5 (critical).
 */
export const PRIORITY_LEVEL_DISPLAY = {
  0: { label: "No Priority", color: "gray", icon: "minus-circle" },
  1: { label: "Very Low", color: "gray", icon: "chevron-down" },
  2: { label: "Low", color: "green", icon: "chevron-down" },
  3: { label: "Normal", color: "blue", icon: "minus-circle" },
  4: { label: "High", color: "amber", icon: "chevron-up" },
  5: { label: "Critical", color: "red", icon: "alert-triangle" },
};

// ============================================================================
// DEADLINE DISPLAY CONFIGURATION
// ============================================================================

/**
 * Thresholds for deadline-relative labels.
 * Used to display human-friendly deadline descriptions.
 */
export const DEADLINE_THRESHOLDS = {
  // Show "Today" for deadlines within same calendar day
  TODAY_MS: 24 * 60 * 60 * 1000,

  // Show "Tomorrow" for deadlines within 48 hours
  TOMORROW_MS: 48 * 60 * 60 * 1000,

  // Show "This Week" for deadlines within 7 days
  THIS_WEEK_MS: 7 * 24 * 60 * 60 * 1000,

  // Show "This Month" for deadlines within 30 days
  THIS_MONTH_MS: 30 * 24 * 60 * 60 * 1000,

  // Show "Overdue" for past deadlines
  OVERDUE_MS: 0,
};

// ============================================================================
// DEFAULT USER PREFERENCES
// ============================================================================

/**
 * Default notification preferences for new users.
 * Users can override these in settings.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  notifyOnDetection: true,
  notifyOnRisk: true,
  notifyOnOverdue: true,
  notifyOnDraftGenerated: true,
  digestMode: false,
  digestFrequency: "daily",
  quietHoursStart: "22:00", // 10 PM
  quietHoursEnd: "08:00", // 8 AM
  timezone: "America/New_York", // Can be overridden by browser timezone
};

/**
 * Default risk settings for new users.
 * Based on PRODUCT_SPEC Section 16 (Risk Detection and Escalation).
 */
export const DEFAULT_RISK_SETTINGS: UserRiskSettings = {
  // Risk window is 25% of commitment duration or 2 hours, whichever is greater
  riskWindowPercentage: 0.25,

  // Minimum 2 hours remaining to trigger risk warning
  minDaysRemainingForRisk: 2 / 24, // Expressed as days

  // At-risk threshold: 0.65 (from verification config)
  atRiskThreshold: 0.65,

  // Critical-risk threshold: 0.85 (from verification config)
  criticalRiskThreshold: 0.85,

  // Auto-queue recovery drafts when deadline is missed
  autoQueueRecoveryDrafts: true,
};

// ============================================================================
// COMMITMENT SOURCE DISPLAY CONFIGURATION
// ============================================================================

/**
 * Display configuration for commitment sources.
 * Used to show where each commitment came from.
 */
export const SOURCE_DISPLAY = {
  gmail: {
    label: "Email",
    icon: "mail",
    color: "blue",
  },

  github: {
    label: "GitHub",
    icon: "github",
    color: "gray",
  },

  manual: {
    label: "Manual",
    icon: "plus-circle",
    color: "indigo",
  },

  calendar: {
    label: "Calendar",
    icon: "calendar",
    color: "purple",
  },
};

/**
 * Display configuration for evidence types.
 * Used to show how a commitment was verified.
 */
export const EVIDENCE_TYPE_DISPLAY = {
  github_commit: {
    label: "GitHub Commit",
    icon: "git-commit",
    color: "gray",
  },

  github_pr: {
    label: "GitHub PR",
    icon: "git-pull-request",
    color: "gray",
  },

  github_release: {
    label: "GitHub Release",
    icon: "package",
    color: "gray",
  },

  manual: {
    label: "Manual",
    icon: "check-circle",
    color: "green",
  },

  calendar_attendance: {
    label: "Calendar",
    icon: "calendar",
    color: "purple",
  },
};

// ============================================================================
// DRAFT TYPE DISPLAY CONFIGURATION
// ============================================================================

/**
 * Display configuration for communication draft types.
 * Used to show what action each draft will take.
 */
export const DRAFT_TYPE_DISPLAY = {
  acknowledgement: {
    label: "Acknowledgement",
    description: "Confirming receipt and understanding",
    icon: "inbox",
    color: "blue",
  },

  completion: {
    label: "Completion",
    description: "Notifying completion and closing the loop",
    icon: "check-circle",
    color: "green",
  },

  recovery: {
    label: "Recovery",
    description: "Apologizing and proposing a new timeline",
    icon: "alert-triangle",
    color: "red",
  },

  extension_request: {
    label: "Extension Request",
    description: "Requesting more time before deadline",
    icon: "clock",
    color: "amber",
  },
};

// ============================================================================
// INTEGRATION DISPLAY CONFIGURATION
// ============================================================================

/**
 * Display configuration for integrations.
 * Used to show connected accounts and integration status.
 */
export const INTEGRATION_DISPLAY = {
  gmail: {
    label: "Gmail",
    icon: "mail",
    color: "red",
    description: "Extract commitments from email conversations",
  },

  github: {
    label: "GitHub",
    icon: "github",
    color: "gray",
    description: "Track commits, PRs, and releases for verification",
  },

  google_calendar: {
    label: "Google Calendar",
    icon: "calendar",
    color: "blue",
    description: "Create calendar events for commitments and detect calendar-based evidence",
  },
};

// ============================================================================
// ANIMATION AND TRANSITION CONFIGURATION
// ============================================================================

/**
 * Animation duration constants for UI transitions.
 * Keeps animations consistent across the dashboard.
 */
export const ANIMATION_DURATIONS = {
  // Fast: 150ms for subtle transitions
  FAST: 150,

  // Normal: 300ms for most transitions
  NORMAL: 300,

  // Slow: 500ms for important/prominent transitions
  SLOW: 500,
};

// ============================================================================
// ACCESSIBILITY AND LAYOUT
// ============================================================================

/**
 * Maximum width for the dashboard content area.
 * Prevents layout from becoming too wide on very large screens.
 */
export const DASHBOARD_MAX_WIDTH = "1400px";

/**
 * Breakpoints for responsive design (in pixels).
 * Matches Tailwind conventions but allows dashboard-specific overrides.
 */
export const DASHBOARD_BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
  ultrawide: 1920,
};

/**
 * Character limits for truncation in UI.
 * Prevents very long text from breaking layouts.
 */
export const TEXT_TRUNCATION = {
  // Commitment title in list view
  titleMaxLength: 50,

  // Description preview in commitment card
  descriptionMaxLength: 100,

  // Requester name in list
  requesterMaxLength: 30,

  // Draft preview in approval queue
  draftPreviewMaxLength: 150,
};
