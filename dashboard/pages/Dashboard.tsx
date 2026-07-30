/**
 * Dashboard Home Page
 *
 * Main dashboard view displaying commitments organized by status:
 * Pending, Upcoming, Overdue, Completed
 *
 * Integrates with Zustand store and fetches real data from backend API.
 * Shows commitment cards with status badges, priority, confidence, and quick actions.
 */

import React, { useMemo, useCallback } from "react";
import type { Commitment } from "../../shared/types";
import { useDashboardStore } from "../store";
import {
  useFetchCommitments,
  useFetchStats,
  useRefreshDashboard,
} from "../hooks/useDashboardData";
import { ViewTabs, ViewType } from "../components/ViewTabs";
import { CommitmentCard } from "../components/CommitmentCard";
import { LoadingSkeleton, SkeletonHeader, SkeletonStats } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";

/**
 * Filter commitments by view type
 */
function filterCommitmentsByView(
  commitments: Commitment[],
  view: ViewType
): Commitment[] {
  const now = new Date();

  switch (view) {
    case "PENDING":
      return commitments.filter(
        (c) => c.status === "PENDING" && c.deadline && c.deadline > now
      );

    case "UPCOMING":
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return commitments.filter(
        (c) =>
          c.status === "PENDING" &&
          c.deadline &&
          c.deadline > now &&
          c.deadline <= sevenDaysFromNow
      );

    case "OVERDUE":
      return commitments.filter(
        (c) =>
          (c.status === "OVERDUE" || (c.deadline && c.deadline <= now)) &&
          c.status !== "COMPLETED"
      );

    case "COMPLETED":
      return commitments.filter((c) => c.status === "COMPLETED");

    case "ALL":
    default:
      return commitments;
  }
}

/**
 * Calculate days remaining for a commitment
 */
function calculateDaysRemaining(deadline: Date | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine risk level based on confidence score and time remaining
 */
function determineRiskLevel(
  confidence: number,
  daysRemaining: number | null
): "LOW" | "MEDIUM" | "HIGH" {
  if (daysRemaining !== null && daysRemaining <= 0) return "HIGH";
  if (daysRemaining !== null && daysRemaining <= 2) return "MEDIUM";
  if (confidence < 0.5) return "HIGH";
  if (confidence < 0.75) return "MEDIUM";
  return "LOW";
}

export function Dashboard(): JSX.Element {
  const [activeView, setActiveView] = React.useState<ViewType>("PENDING");

  // Store hooks
  const {
    commitments,
    stats,
    approvalQueue,
    confirmationItems,
    isLoading,
    error,
    lastSyncedAt,
  } = useDashboardStore();

  // Memoize query to prevent infinite useEffect re-runs
  const query = useMemo(() => ({ view: activeView }), [activeView]);

  // Data fetching hooks
  useFetchCommitments(query);
  useFetchStats();
  const refreshDashboard = useRefreshDashboard();

  // Filter commitments by active view
  const filteredCommitments = useMemo(
    () => filterCommitmentsByView(commitments, activeView),
    [commitments, activeView]
  );

  // Calculate view counts
  const viewCounts = useMemo(() => {
    return {
      PENDING: filterCommitmentsByView(commitments, "PENDING").length,
      UPCOMING: filterCommitmentsByView(commitments, "UPCOMING").length,
      OVERDUE: filterCommitmentsByView(commitments, "OVERDUE").length,
      COMPLETED: filterCommitmentsByView(commitments, "COMPLETED").length,
      ALL: commitments.length,
    };
  }, [commitments]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    await refreshDashboard();
  }, [refreshDashboard]);

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <p className="font-medium">Error: {error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-xs text-red-300 hover:text-red-200 underline transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="space-y-2 border-b border-slate-800/50 pb-6">
        {isLoading ? (
          <SkeletonHeader />
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-50">
              Commitment Dashboard
            </h1>
            <p className="text-slate-400 text-sm">
              Track, verify, and manage all your commitments in one place
            </p>
          </>
        )}
      </div>

      {/* Key Metrics */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Commitments */}
          <div className="rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-slate-700/50 transition-all p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl opacity-40 group-hover:opacity-60 transition-opacity">
                📊
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</p>
                <p className="text-3xl font-bold text-slate-50 mt-1">
                  {stats.total}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">All commitments</p>
          </div>

          {/* At Risk */}
          <div className="rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-amber-500/30 transition-all p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl opacity-40 group-hover:opacity-60 transition-opacity">
                ⚠️
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">At Risk</p>
                <p className="text-3xl font-bold text-amber-300 mt-1">
                  {stats.atRisk}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Need attention</p>
          </div>

          {/* Due Today */}
          <div className="rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-red-500/30 transition-all p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl opacity-40 group-hover:opacity-60 transition-opacity">
                🔴
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Due Today</p>
                <p className="text-3xl font-bold text-red-300 mt-1">
                  {stats.dueToday}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Deadline today</p>
          </div>

          {/* Completed */}
          <div className="rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-green-500/30 transition-all p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl opacity-40 group-hover:opacity-60 transition-opacity">
                ✓
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-green-300 mt-1">
                  {stats.completed}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Closed this month</p>
          </div>
        </div>
      )}

      {/* View Tabs */}
      {!isLoading && (
        <ViewTabs
          activeView={activeView}
          onViewChange={setActiveView}
          counts={viewCounts}
        />
      )}

      {/* Commitments List */}
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSkeleton count={3} type="card" />
        ) : filteredCommitments.length === 0 ? (
          <EmptyState
            icon={
              activeView === "COMPLETED"
                ? "🎉"
                : activeView === "OVERDUE"
                  ? "✨"
                  : "📭"
            }
            title={
              activeView === "COMPLETED"
                ? "Great job!"
                : activeView === "OVERDUE"
                  ? "All caught up!"
                  : `No ${activeView.toLowerCase()} commitments`
            }
            description={
              activeView === "COMPLETED"
                ? "You've completed all commitments in this view"
                : activeView === "OVERDUE"
                  ? "No overdue commitments. Keep up the good work!"
                  : "Check other views or create a new commitment"
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredCommitments.map((commitment) => {
              const daysRemaining = calculateDaysRemaining(commitment.deadline);
              const riskLevel = determineRiskLevel(
                commitment.confidence_score,
                daysRemaining
              );
              const hasPendingDraft = approvalQueue.some(
                (item) => item.commitment.id === commitment.id
              );

              return (
                <CommitmentCard
                  key={commitment.id}
                  id={commitment.id}
                  title={commitment.title}
                  requester={commitment.requester}
                  daysRemaining={daysRemaining}
                  priority={commitment.priority_score}
                  confidence={commitment.confidence_score}
                  riskLevel={riskLevel}
                  evidenceCount={0} // TODO: Fetch evidence count from store
                  hasPendingDraft={hasPendingDraft}
                  onClick={() => {
                    // TODO: Navigate to commitment detail page
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      {!isLoading && (
        <div className="pt-8 border-t border-slate-800/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>Last synced:</span>
              {lastSyncedAt ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">
                    {lastSyncedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="inline-block w-2 h-2 bg-green-500/80 rounded-full"></span>
                </div>
              ) : (
                <span className="text-slate-500">Never</span>
              )}
            </div>
            <Button
              icon="🔄"
              onClick={handleRefresh}
              isLoading={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Pending Drafts Summary */}
      {approvalQueue.length > 0 && (
        <div className="rounded-lg bg-indigo-600/10 border border-indigo-500/20 p-6">
          <p className="text-sm font-medium text-indigo-300 mb-4">
            ✓ You have {approvalQueue.length} pending draft
            {approvalQueue.length !== 1 ? "s" : ""} awaiting approval
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              // TODO: Navigate to approval queue
            }}
          >
            Review drafts →
          </Button>
        </div>
      )}

      {/* Pending Confirmations Summary */}
      {confirmationItems.length > 0 && (
        <div className="rounded-lg bg-amber-600/10 border border-amber-500/20 p-6">
          <p className="text-sm font-medium text-amber-300 mb-4">
            ? You have {confirmationItems.length} medium-confidence commitment
            {confirmationItems.length !== 1 ? "s" : ""} awaiting confirmation
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // TODO: Navigate to confirmation inbox
            }}
          >
            Review confirmations →
          </Button>
        </div>
      )}
    </div>
  );
}
