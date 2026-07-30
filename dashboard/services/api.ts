/**
 * Dashboard API Client
 *
 * Handles all HTTP requests to backend BFF routes for fetching and updating data.
 * Provides a clean abstraction over fetch calls with error handling.
 */

import type {
  Commitment,
  Evidence,
  CommunicationDraft,
  AuditLogEntry,
} from "../../shared/types/index.js";
import type {
  CommitmentListQuery,
  CommitmentListResponse,
  ApprovalQueueResponse,
  ConfirmationInboxResponse,
  NotificationCenterResponse,
  CommitmentDetail,
} from "../types";

/**
 * Base API configuration
 */
const API_BASE = "/api";
const TIMEOUT_MS = 30000;

/**
 * Utility to fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API Client for Dashboard
 */
export const dashboardApi = {
  /**
   * Fetch list of commitments with optional filters
   */
  async getCommitments(
    query?: CommitmentListQuery
  ): Promise<CommitmentListResponse> {
    const params = new URLSearchParams();

    if (query?.view) params.append("view", query.view);
    if (query?.status) params.append("status", query.status);
    if (query?.searchQuery) params.append("q", query.searchQuery);
    if (query?.minConfidence)
      params.append("minConfidence", String(query.minConfidence));
    if (query?.minPriority) params.append("minPriority", String(query.minPriority));
    if (query?.requester) params.append("requester", query.requester);
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);
    if (query?.page) params.append("page", String(query.page));
    if (query?.pageSize) params.append("pageSize", String(query.pageSize));

    const url = `${API_BASE}/commitments?${params.toString()}`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Trigger Gmail message scan & AI detection
   */
  async syncGmail(): Promise<{ processedMessagesCount: number; detectedCommitmentsCount: number }> {
    const url = `${API_BASE}/integrations/sync/gmail`;
    try {
      const response = await fetchWithTimeout(url, { method: "POST" });
      return response.json();
    } catch (e) {
      console.warn("Gmail sync failed or skipped:", e);
      return { processedMessagesCount: 0, detectedCommitmentsCount: 0 };
    }
  },

  /**
   * Fetch detailed view of a single commitment
   */
  async getCommitmentDetail(commitmentId: string): Promise<CommitmentDetail> {
    const url = `${API_BASE}/commitments/${commitmentId}`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Fetch evidence for a commitment
   */
  async getEvidence(commitmentId: string): Promise<Evidence[]> {
    const url = `${API_BASE}/commitments/${commitmentId}/evidence`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Fetch approval queue (pending communication drafts)
   */
  async getApprovalQueue(): Promise<ApprovalQueueResponse> {
    const url = `${API_BASE}/drafts?status=queued`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Fetch confirmation inbox (medium-confidence candidates)
   */
  async getConfirmationInbox(): Promise<ConfirmationInboxResponse> {
    const url = `${API_BASE}/confirmations`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Fetch notification center items
   */
  async getNotifications(): Promise<NotificationCenterResponse> {
    const url = `${API_BASE}/notifications`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Fetch dashboard statistics
   */
  async getStatistics(): Promise<{
    total: number;
    atRisk: number;
    dueToday: number;
    completed: number;
    overdue: number;
  }> {
    const url = `${API_BASE}/stats`;
    const response = await fetchWithTimeout(url);
    return response.json();
  },

  /**
   * Confirm a commitment (from confirmation inbox)
   */
  async confirmCommitment(commitmentId: string): Promise<Commitment> {
    const url = `${API_BASE}/commitments/${commitmentId}/confirm`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Dismiss a commitment
   */
  async dismissCommitment(commitmentId: string): Promise<Commitment> {
    const url = `${API_BASE}/commitments/${commitmentId}/dismiss`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Approve a communication draft
   */
  async approveDraft(draftId: string): Promise<CommunicationDraft> {
    const url = `${API_BASE}/drafts/${draftId}/approve`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Discard a communication draft
   */
  async discardDraft(draftId: string): Promise<CommunicationDraft> {
    const url = `${API_BASE}/drafts/${draftId}/discard`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Snooze a communication draft
   */
  async snoozeDraft(
    draftId: string,
    durationMs: number
  ): Promise<CommunicationDraft> {
    const url = `${API_BASE}/drafts/${draftId}/snooze`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMs }),
    });
    return response.json();
  },

  /**
   * Edit and send a communication draft
   */
  async sendDraft(
    draftId: string,
    content: string
  ): Promise<CommunicationDraft> {
    const url = `${API_BASE}/drafts/${draftId}/send`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return response.json();
  },

  /**
   * Mark a commitment as completed
   */
  async markCommitmentComplete(commitmentId: string): Promise<Commitment> {
    const url = `${API_BASE}/commitments/${commitmentId}/mark-complete`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Update commitment (manual override)
   */
  async updateCommitment(
    commitmentId: string,
    updates: Partial<Commitment>
  ): Promise<Commitment> {
    const url = `${API_BASE}/commitments/${commitmentId}`;
    const response = await fetchWithTimeout(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return response.json();
  },
};
