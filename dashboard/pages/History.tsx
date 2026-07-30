/**
 * History / Archive Page
 *
 * Shows completed and archived commitments for audit/reference.
 * Supports searching and filtering.
 */

import React, { useState, useMemo } from "react";
import { useDashboardStore } from "../store";
import { useFetchCommitments } from "../hooks/useDashboardData";
import { LoadingSkeleton, SkeletonHeader } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { CommitmentCard } from "../components/CommitmentCard";
import { Badge } from "../components/Badge";
import { calculateDaysRemaining, determineRiskLevel } from "../services/aggregation";

export function History(): JSX.Element {
  const { commitments, isLoading, error } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch completed/archived commitments
  useFetchCommitments({
    status: "COMPLETED",
    page: 1,
    pageSize: 50,
  });

  // Filter and search
  const filteredCommitments = useMemo(() => {
    return commitments
      .filter((c) => c.status === "COMPLETED" || c.status === "ARCHIVED")
      .filter(
        (c) =>
          !searchQuery ||
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [commitments, searchQuery]);

  // Group by completion date
  const groupedByDate = useMemo(() => {
    return filteredCommitments.reduce(
      (acc, commitment) => {
        const date = new Date(commitment.updated_at).toLocaleDateString(
          undefined,
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );

        if (!acc[date]) acc[date] = [];
        acc[date].push(commitment);
        return acc;
      },
      {} as Record<string, typeof commitments>
    );
  }, [filteredCommitments]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in w-full">
        <SkeletonHeader />
        <LoadingSkeleton count={3} type="card" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl font-bold text-slate-50">
          History & Archive
        </h1>
        <p className="text-slate-400 text-sm">
          Review completed and archived commitments for audit and reference
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-slate-500">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search completed commitments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-smooth"
          />
        </div>
        <button className="btn btn-secondary">Filter</button>
      </div>

      {/* Summary */}
      {filteredCommitments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-slate-400">Total</p>
            <p className="text-3xl font-bold text-slate-100 mt-2">
              {filteredCommitments.length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-400">Completion Rate</p>
            <p className="text-3xl font-bold text-green-300 mt-2">
              {filteredCommitments.length > 0 ? "100%" : "0%"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-400">Avg. Confidence</p>
            <p className="text-3xl font-bold text-blue-300 mt-2">
              {filteredCommitments.length > 0
                ? Math.round(
                    (filteredCommitments.reduce(
                      (sum, c) => sum + c.confidence_score,
                      0
                    ) /
                      filteredCommitments.length) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-400">Status</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="success">
                {
                  filteredCommitments.filter((c) => c.status === "COMPLETED")
                    .length
                }
              </Badge>
              <Badge variant="secondary">
                {
                  filteredCommitments.filter((c) => c.status === "ARCHIVED")
                    .length
                }
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredCommitments.length === 0 && !error ? (
        <EmptyState
          icon="📚"
          title="No completed commitments yet"
          description={
            searchQuery
              ? `No matches for "${searchQuery}"`
              : "Complete some commitments to see them here"
          }
        />
      ) : (
        <>
          {/* Commitments by date */}
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date} className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {date}
                </h2>

                <div className="space-y-4">
                  {items.map((commitment) => {
                    const daysRemaining = calculateDaysRemaining(
                      commitment.deadline
                    );
                    const riskLevel = determineRiskLevel(
                      commitment.status,
                      commitment.deadline,
                      commitment.confidence_score
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
                        hasPendingDraft={false}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
