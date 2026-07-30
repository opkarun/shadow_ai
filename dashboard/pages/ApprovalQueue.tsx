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
import {
  IconApproval,
  IconCheck,
  IconEdit,
  IconClock,
  IconClose,
  IconSparkles,
} from "../components/Icons";

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
  ): { label: string; variant: "primary" | "success" | "warning" | "info" } => {
    const labels: Record<
      string,
      { label: string; variant: "primary" | "success" | "warning" | "info" }
    > = {
      acknowledgement: { label: "Acknowledgement", variant: "primary" },
      completion: { label: "Completion Notice", variant: "success" },
      recovery: { label: "Recovery Plan", variant: "warning" },
      extension_request: { label: "Extension Request", variant: "info" },
    };
    return labels[type] || { label: type, variant: "primary" };
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in w-full">
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
            <span>Approval Queue</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {approvalQueue.length} Pending
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review, edit, and authorize AI-drafted responses before sending.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <p className="font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {approvalQueue.length === 0 && !error ? (
        <EmptyState
          icon={<IconApproval className="w-8 h-8 text-indigo-400" />}
          title="Approval Queue Clean!"
          description="All AI drafts have been reviewed and approved. New drafts will populate here automatically."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(draftsByType).map(([type, drafts]) => {
            const typeInfo = getDraftTypeLabel(type);

            return (
              <div key={type} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-200">
                    {typeInfo.label}
                  </h2>
                  <Badge variant={typeInfo.variant}>{drafts.length}</Badge>
                </div>

                <div className="space-y-4">
                  {drafts.map((item) => (
                    <Card key={item.draft.id} className="hover:border-indigo-500/40">
                      <div className="space-y-4">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-slate-100 text-base">
                              {item.commitment.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Recipient: <span className="font-semibold text-slate-200">{item.commitment.requester}</span>
                            </p>
                          </div>
                          <span className="text-xs font-mono text-slate-500 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                            {item.createdAtLabel}
                          </span>
                        </div>

                        {/* AI Draft Preview Container */}
                        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                              <IconSparkles className="w-3.5 h-3.5" />
                              AI Draft Content
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {item.draft.content}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2.5 pt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<IconCheck className="w-4 h-4" />}
                            onClick={() => alert(`Approved draft for ${item.commitment.title}`)}
                          >
                            Approve & Send
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<IconEdit className="w-4 h-4" />}
                            onClick={() => alert(`Opening editor for draft ${item.draft.id}`)}
                          >
                            Edit Draft
                          </Button>

                          <Button
                            size="sm"
                            variant="amber"
                            icon={<IconClock className="w-4 h-4" />}
                            onClick={() => alert(`Snoozed draft`)}
                          >
                            Snooze
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            icon={<IconClose className="w-4 h-4" />}
                            onClick={() => alert(`Discarded draft`)}
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
      )}
    </div>
  );
}
