/**
 * Dashboard Initialization Hook
 *
 * Handles initial data loading and setup when the dashboard mounts.
 */

import { useEffect } from "react";
import { useDashboardStore } from "../store";
import { useRefreshDashboard } from "./useDashboardData";

/**
 * Initialize dashboard on component mount
 * Fetches all initial data and sets up polling if needed
 */
export function useDashboardInit(): {
  isReady: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const isLoading = useDashboardStore((s) => s.isLoading);
  const error = useDashboardStore((s) => s.error);
  const refreshDashboard = useRefreshDashboard();

  useEffect(() => {
    // Trigger initial data load
    refreshDashboard().catch(() => {
      // Error is already stored in the Zustand store
      // and displayed to the user in the UI
    });

    // Set up periodic refresh (every 5 minutes)
    const refreshInterval = setInterval(
      () => {
        refreshDashboard().catch(() => {
          // Error is already stored in the Zustand store
          // and displayed to the user in the UI
        });
      },
      5 * 60 * 1000
    );

    return () => clearInterval(refreshInterval);
  }, [refreshDashboard]);

  return {
    isReady: !isLoading,
    error: error,
    refresh: refreshDashboard,
  };
}
