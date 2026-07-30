/**
 * Dashboard Home Page
 *
 * Main dashboard view displaying commitments organized by status:
 * Pending, Upcoming, Overdue, Completed
 *
 * Integrates with Zustand store and fetches real data from backend API.
 */

import React, { useMemo, useCallback, useState } from "react";
import type { Commitment } from "../../shared/types/index.js";
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
import { CommitmentDetailModal } from "../components/CommitmentDetailModal";
import {
  IconDashboard,
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconRefresh,
  IconSparkles,
  IconEdit,
  IconConfirmation,
  IconArrowRight,
} from "../components/Icons";
import { useRouter } from "../routing/router";

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
        (c) =>
          c.status !== "COMPLETED" &&
          c.status !== "DISMISSED" &&
          c.status !== "OVERDUE" &&
          (!c.deadline || new Date(c.deadline) > now)
      );

    case "UPCOMING":
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return commitments.filter(
        (c) =>
          c.status !== "COMPLETED" &&
          c.status !== "DISMISSED" &&
          c.deadline &&
          new Date(c.deadline) > now &&
          new Date(c.deadline) <= sevenDaysFromNow
      );

    case "OVERDUE":
      return commitments.filter(
        (c) =>
          (c.status === "OVERDUE" || (c.deadline && new Date(c.deadline) <= now)) &&
          c.status !== "COMPLETED" &&
          c.status !== "DISMISSED"
      );

    case "COMPLETED":
      return commitments.filter((c) => c.status === "COMPLETED");

    case "ALL":
    default:
      return commitments.filter((c) => c.status !== "DISMISSED");
  }
}

/**
 * Calculate days remaining for a commitment
 */
function calculateDaysRemaining(deadline: Date | string | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const d = new Date(deadline);
  const diffMs = d.getTime() - now.getTime();
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
  const [activeView, setActiveView] = useState<ViewType>("PENDING");
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);

  const navigate = useRouter((state) => state.navigate);

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

  const query = useMemo(() => ({ view: activeView }), [activeView]);

  useFetchCommitments(query);
  useFetchStats();
  const refreshDashboard = useRefreshDashboard();

  const filteredCommitments = useMemo(
    () => filterCommitmentsByView(commitments, activeView),
    [commitments, activeView]
  );

  const viewCounts = useMemo(() => {
    return {
      PENDING: filterCommitmentsByView(commitments, "PENDING").length,
      UPCOMING: filterCommitmentsByView(commitments, "UPCOMING").length,
      OVERDUE: filterCommitmentsByView(commitments, "OVERDUE").length,
      COMPLETED: filterCommitmentsByView(commitments, "COMPLETED").length,
      ALL: filterCommitmentsByView(commitments, "ALL").length,
    };
  }, [commitments]);

  const handleRefresh = useCallback(async () => {
    await refreshDashboard();
  }, [refreshDashboard]);

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-5 h-5 text-rose-400" />
            <span className="font-semibold">Error loading commitments: {error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight flex items-center gap-3">
            <span>Commitment Operations</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <IconSparkles className="w-3.5 h-3.5" />
              Live AI
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time commitment tracking, autonomous verification, and execution queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />}
            onClick={handleRefresh}
            isLoading={isLoading}
          >
            Sync Data
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Commitments */}
          <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 shadow-xl group overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tracked</p>
                <h3 className="text-3xl font-black text-slate-50 mt-1">
                  {stats.total}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <IconDashboard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
              <span>All active & archived commitments</span>
            </p>
          </div>

          {/* At Risk */}
          <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-amber-500/40 transition-all duration-300 shadow-xl group overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-amber-400/90 uppercase tracking-wider">At Risk</p>
                <h3 className="text-3xl font-black text-amber-300 mt-1">
                  {stats.atRisk}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <IconAlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Low confidence or tight deadlines</p>
          </div>

          {/* Due Today */}
          <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-rose-500/40 transition-all duration-300 shadow-xl group overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-rose-400/90 uppercase tracking-wider">Due Today</p>
                <h3 className="text-3xl font-black text-rose-300 mt-1">
                  {stats.dueToday}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <IconClock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Action required immediately</p>
          </div>

          {/* Completed */}
          <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-emerald-500/40 transition-all duration-300 shadow-xl group overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-400/90 uppercase tracking-wider">Resolved</p>
                <h3 className="text-3xl font-black text-emerald-300 mt-1">
                  {stats.completed}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <IconCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Verified completed tasks</p>
          </div>
        </div>
      )}

      {/* Action Summaries Banner Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {approvalQueue.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 flex-shrink-0">
                <IconEdit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-100">
                  {approvalQueue.length} Pending AI Draft{approvalQueue.length !== 1 ? "s" : ""}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Awaiting review before dispatch
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<IconArrowRight className="w-4 h-4" />}
              onClick={() => navigate("approval-queue")}
            >
              Review Queue
            </Button>
          </div>
        )}

        {confirmationItems.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-orange-950/40 border border-amber-500/30 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                <IconConfirmation className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-100">
                  {confirmationItems.length} Medium-Confidence Item{confirmationItems.length !== 1 ? "s" : ""}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Needs one-tap confirmation
                </p>
              </div>
            </div>

            <Button
              variant="amber"
              size="sm"
              icon={<IconArrowRight className="w-4 h-4" />}
              onClick={() => navigate("confirmations")}
            >
              Confirm
            </Button>
          </div>
        )}
      </div>

      {/* View Filter Tabs */}
      {!isLoading && (
        <ViewTabs
          activeView={activeView}
          onViewChange={setActiveView}
          counts={viewCounts}
        />
      )}

      {/* Commitments List Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSkeleton count={3} type="card" />
        ) : filteredCommitments.length === 0 ? (
          <EmptyState
            title={
              activeView === "COMPLETED"
                ? "All commitments completed!"
                : activeView === "OVERDUE"
                  ? "Zero overdue commitments"
                  : `No ${activeView.toLowerCase()} commitments found`
            }
            description={
              activeView === "COMPLETED"
                ? "No completed records in this timeframe."
                : activeView === "OVERDUE"
                  ? "Great job! All your commitments are up to date."
                  : "Check back later or switch view filters."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
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
                  evidenceCount={0}
                  hasPendingDraft={hasPendingDraft}
                  onClick={() => setSelectedCommitment(commitment)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Commitment Detail Slide-over Modal */}
      <CommitmentDetailModal
        commitment={selectedCommitment}
        onClose={() => setSelectedCommitment(null)}
      />
    </div>
  );
}
