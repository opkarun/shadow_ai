/**
 * Approval Queue Page
 *
 * Shows pending AI-drafted communications awaiting user approval.
 * Allows users to approve, edit, discard, or snooze drafts.
 */

import React, { useMemo } from "react";
import { useDashboardStore } from "../store";
import { useFetchApprovalQueue } from "../hooks/useDashboardData";
import { LoadingSkeleton, SkeletonHeader } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";

export function ApprovalQueue(): JSX.Element {
  const { approvalQueue, isLoading, error } = useDashboardStore();

  useFetchApprovalQueue();

  const draftsByType = useMemo(() => {
    return approvalQueue.reduce(
      (acc, item) => {
        const type = item.draft.draft_type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      },
      {} as Record<string, typeof approvalQueue>
    );
  }, [approvalQueue]);

  const getDraftTypeLabel = (
    type: string
  ): { label: string; icon: string; color: string } => {
    const labels: Record<
      string,
      { label: string; icon: string; color: string }
    > = {
      acknowledgement: {
        label: "Acknowledgement",
        icon: "✓",
        color: "bg-blue-500/20",
      },
      completion: { label: "Completion", icon: "🎉", color: "bg-green-500/20" },
      recovery: { label: "Recovery", icon: "⚡", color: "bg-amber-500/20" },
      extension_request: {
        label: "Extension Request",
        icon: "⏱️",
        color: "bg-purple-500/20",
      },
    };
    return labels[type] || { label: type, icon: "📝", color: "bg-slate-500/20" };
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
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
          Approval Queue
        </h1>
        <p className="text-slate-400 text-sm">
          Review and approve AI-drafted communications before sending
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {/* Empty state */}
      {approvalQueue.length === 0 && !error ? (
        <EmptyState
          icon="✨"
          title="All caught up!"
          description="No pending communications. New drafts will appear here when generated."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="card">
            <p className="text-slate-300">
              <span className="font-semibold text-white">
                {approvalQueue.length}
              </span>{" "}
              communication{approvalQueue.length !== 1 ? "s" : ""} pending approval
            </p>
          </div>

          {/* Drafts by type */}
          <div className="space-y-6">
            {Object.entries(draftsByType).map(([type, drafts]) => {
              const typeInfo = getDraftTypeLabel(type);

              return (
                <div key={type} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <h2 className="text-xl font-semibold text-slate-200">
                      {typeInfo.label}
                    </h2>
                    <Badge variant="primary">{drafts.length}</Badge>
                  </div>

                  {/* Draft cards */}
                  <div className="space-y-3">
                    {drafts.map((item) => (
                      <Card key={item.draft.id} className="hover:bg-white/10">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-100 truncate">
                                {item.commitment.title}
                              </p>
                              <p className="text-sm text-slate-400 truncate">
                                To: {item.commitment.requester}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {item.createdAtLabel}
                            </span>
                          </div>

                          {/* Draft preview */}
                          <div className="bg-slate-900/50 rounded p-3 border border-slate-700/50">
                            <p className="text-sm text-slate-300 line-clamp-3">
                              {item.draft.content}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              icon="✓"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon="✏️"
                            >
                              Edit & Send
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon="⏱️"
                            >
                              Snooze
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="✕"
                            >
                              Discard
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
