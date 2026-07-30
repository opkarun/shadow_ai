/**
 * Custom hooks for fetching and managing dashboard data
 *
 * Handles async data fetching with loading and error states.
 * Integrates with the Zustand store for state management.
 */

import { useEffect, useCallback, useRef } from "react";
import { dashboardApi } from "../services/api";
import { useDashboardStore } from "../store";
import type { CommitmentListQuery } from "../types";
import type { Commitment } from "../../shared/types/index.js";

/**
 * Parse and validate API commitment response.
 * Converts ISO date strings to Date objects and validates required fields.
 * Ensures the object matches the Commitment interface exactly.
 */
function parseCommitment(data: unknown): Commitment {
  const raw = data as Record<string, unknown>;

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid commitment: not an object");
  }

  // Validate required fields exist and have correct types
  const id = raw.id;
  const status = raw.status;
  const createdAt = raw.created_at;
  const updatedAt = raw.updated_at;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Invalid commitment: id must be a non-empty string");
  }

  if (typeof status !== "string" || !status.trim()) {
    throw new Error("Invalid commitment: status must be a non-empty string");
  }

  if (!createdAt) {
    throw new Error("Invalid commitment: created_at is required");
  }

  if (!updatedAt) {
    throw new Error("Invalid commitment: updated_at is required");
  }

  // Parse and return with proper types
  return {
    id,
    user_id: String(raw.user_id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    requester: String(raw.requester ?? ""),
    source: String(raw.source ?? "manual") as any,
    source_reference: String(raw.source_reference ?? ""),
    deadline: raw.deadline ? new Date(raw.deadline as string) : null,
    status: status as any,
    confidence_score: Number(raw.confidence_score ?? 0),
    priority_score: Number(raw.priority_score ?? 0),
    verification_method: String(raw.verification_method ?? ""),
    linked_repo: raw.linked_repo ? String(raw.linked_repo) : null,
    created_at: new Date(createdAt as string),
    updated_at: new Date(updatedAt as string),
  };
}

/**
 * Hook to fetch commitments list
 */
export function useFetchCommitments(query?: CommitmentListQuery): void {
  const setCommitments = useDashboardStore((s) => s.setCommitments);
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const setLastSyncedAt = useDashboardStore((s) => s.setLastSyncedAt);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await dashboardApi.getCommitments(query);

        if (isMountedRef.current) {
          const parsedCommitments = response.commitments.map(parseCommitment);
          setCommitments(parsedCommitments);
          setLastSyncedAt(new Date());
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch commitments";
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [query, setCommitments, setLoading, setError, setLastSyncedAt]);
}

/**
 * Hook to fetch dashboard statistics
 */
export function useFetchStats(): void {
  const setStats = useDashboardStore((s) => s.setStats);
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const stats = await dashboardApi.getStatistics();

        if (isMountedRef.current) {
          setStats(stats);
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch statistics";
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [setStats, setLoading, setError]);
}

/**
 * Hook to fetch approval queue
 */
export function useFetchApprovalQueue(): void {
  const setApprovalQueue = useDashboardStore((s) => s.setApprovalQueue);
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await dashboardApi.getApprovalQueue();

        if (isMountedRef.current) {
          setApprovalQueue(response.items);
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch approval queue";
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [setApprovalQueue, setLoading, setError]);
}

/**
 * Hook to fetch confirmation inbox
 */
export function useFetchConfirmationInbox(): void {
  const setConfirmationItems = useDashboardStore((s) => s.setConfirmationItems);
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await dashboardApi.getConfirmationInbox();

        if (isMountedRef.current) {
          setConfirmationItems(response.items);
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch confirmations";
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [setConfirmationItems, setLoading, setError]);
}

/**
 * Hook to fetch notifications
 */
export function useFetchNotifications(): void {
  const setNotifications = useDashboardStore((s) => s.setNotifications);
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await dashboardApi.getNotifications();

        if (isMountedRef.current) {
          const parsedNotifications = response.notifications.map((n: any) => ({
            ...n,
            timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
          }));
          setNotifications(parsedNotifications);
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch notifications";
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [setNotifications, setLoading, setError]);
}

/**
 * Hook to refresh all dashboard data (triggers Gmail scan + fetches latest store items)
 */
export function useRefreshDashboard(): () => Promise<void> {
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const setCommitments = useDashboardStore((s) => s.setCommitments);
  const setStats = useDashboardStore((s) => s.setStats);
  const setApprovalQueue = useDashboardStore((s) => s.setApprovalQueue);
  const setConfirmationItems = useDashboardStore((s) => s.setConfirmationItems);
  const setNotifications = useDashboardStore((s) => s.setNotifications);
  const setLastSyncedAt = useDashboardStore((s) => s.setLastSyncedAt);

  return useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Trigger real-time Gmail scan
      await dashboardApi.syncGmail();

      // Fetch all data in parallel
      const [commitmentResponse, stats, approvalQueue, confirmations, notifications] =
        await Promise.all([
          dashboardApi.getCommitments(),
          dashboardApi.getStatistics(),
          dashboardApi.getApprovalQueue(),
          dashboardApi.getConfirmationInbox(),
          dashboardApi.getNotifications(),
        ]);

      setCommitments(
        commitmentResponse.commitments.map(parseCommitment)
      );
      setStats(stats);
      setApprovalQueue(approvalQueue.items);
      setConfirmationItems(confirmations.items);
      setNotifications(notifications.notifications);
      setLastSyncedAt(new Date());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    setLoading,
    setError,
    setCommitments,
    setStats,
    setApprovalQueue,
    setConfirmationItems,
    setNotifications,
    setLastSyncedAt,
  ]);
}
