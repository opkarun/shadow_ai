/**
 * Dashboard State Management
 *
 * Zustand store for managing dashboard state including commitments, filters, and UI state.
 * PRODUCT_SPEC.md Section 22 requires filters and grouped views.
 */

import { create } from "zustand";
import type {
  Commitment,
  CommunicationDraft,
  Evidence,
  AuditLogEntry,
} from "../shared/types";
import type {
  DashboardViewType,
  CommitmentFilterState,
  ApprovalQueueItem,
  ConfirmationItem,
  NotificationItem,
} from "./types";

/**
 * Dashboard statistics aggregated from commitments
 */
export interface DashboardStats {
  total: number;
  atRisk: number;
  dueToday: number;
  completed: number;
  overdue: number;
}

/**
 * Dashboard store state and actions
 */
export interface DashboardStoreState {
  // Data
  commitments: Commitment[];
  evidence: Record<string, Evidence[]>;
  drafts: CommunicationDraft[];
  auditLogs: AuditLogEntry[];
  approvalQueue: ApprovalQueueItem[];
  confirmationItems: ConfirmationItem[];
  notifications: NotificationItem[];
  stats: DashboardStats;

  // UI state
  currentView: DashboardViewType;
  filters: CommitmentFilterState;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;

  // Actions
  setCommitments: (commitments: Commitment[]) => void;
  setEvidence: (evidence: Record<string, Evidence[]>) => void;
  setDrafts: (drafts: CommunicationDraft[]) => void;
  setAuditLogs: (logs: AuditLogEntry[]) => void;
  setApprovalQueue: (items: ApprovalQueueItem[]) => void;
  setConfirmationItems: (items: ConfirmationItem[]) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  setStats: (stats: DashboardStats) => void;

  setCurrentView: (view: DashboardViewType) => void;
  setFilters: (filters: CommitmentFilterState) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setLastSyncedAt: (date: Date | null) => void;

  reset: () => void;
}

const initialState = {
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
  currentView: "PENDING" as DashboardViewType,
  filters: {
    view: "PENDING" as DashboardViewType,
    sortBy: "priority_score" as const,
    sortOrder: "desc" as const,
    page: 1,
    pageSize: 20,
  },
  isLoading: false,
  error: null,
  lastSyncedAt: null,
};

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  ...initialState,

  setCommitments: (commitments: Commitment[]) => set({ commitments }),
  setEvidence: (evidence: Record<string, Evidence[]>) => set({ evidence }),
  setDrafts: (drafts: CommunicationDraft[]) => set({ drafts }),
  setAuditLogs: (auditLogs: AuditLogEntry[]) => set({ auditLogs }),
  setApprovalQueue: (approvalQueue: ApprovalQueueItem[]) =>
    set({ approvalQueue }),
  setConfirmationItems: (confirmationItems: ConfirmationItem[]) =>
    set({ confirmationItems }),
  setNotifications: (notifications: NotificationItem[]) =>
    set({ notifications }),
  setStats: (stats: DashboardStats) => set({ stats }),

  setCurrentView: (currentView: DashboardViewType) => set({ currentView }),
  setFilters: (filters: CommitmentFilterState) => set({ filters }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  setLastSyncedAt: (lastSyncedAt: Date | null) => set({ lastSyncedAt }),

  reset: () => set(initialState),
}));
