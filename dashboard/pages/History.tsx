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
import { IconHistory, IconSearch, IconCheck, IconTarget } from "../components/Icons";
import { calculateDaysRemaining } from "../services/aggregation";

export function History(): JSX.Element {
  const { commitments, isLoading, error } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState("");

  useFetchCommitments({
    status: "COMPLETED",
    page: 1,
    pageSize: 50,
  });

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
    <div className="space-y-8 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight flex items-center gap-3">
            <span>History & Audit Archive</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {filteredCommitments.length} Completed
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Searchable log of verified completed commitments and archived records.
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <p className="font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Search Input */}
      <div className="relative group max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
          <IconSearch className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search history by title, requester, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
        />
      </div>

      {/* Summary Cards */}
      {filteredCommitments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Total</p>
            <p className="text-3xl font-black text-slate-50 mt-1">
              {filteredCommitments.length}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completion Rate</p>
            <p className="text-3xl font-black text-emerald-300 mt-1">100%</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Avg AI Confidence</p>
            <p className="text-3xl font-black text-indigo-300 mt-1">
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
        </div>
      )}

      {/* Empty state */}
      {filteredCommitments.length === 0 && !error ? (
        <EmptyState
          icon={<IconHistory className="w-8 h-8 text-emerald-400" />}
          title="No Completed Records Found"
          description={
            searchQuery
              ? `No matching records for "${searchQuery}"`
              : "Completed commitments will be archived here for reference."
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                {date}
              </h2>

              <div className="space-y-3">
                {items.map((commitment) => {
                  const daysRemaining = calculateDaysRemaining(
                    commitment.deadline
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
                      riskLevel="LOW"
                      evidenceCount={1}
                      hasPendingDraft={false}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
