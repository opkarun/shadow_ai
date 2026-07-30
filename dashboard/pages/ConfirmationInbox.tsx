/**
 * Confirmation Inbox Page
 *
 * Shows medium-confidence commitments awaiting one-tap confirmation.
 * Allows users to quickly confirm or dismiss suspected commitments.
 */

import React from "react";
import { useDashboardStore } from "../store";
import { useFetchConfirmationInbox } from "../hooks/useDashboardData";
import { LoadingSkeleton, SkeletonHeader } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";

export function ConfirmationInbox(): JSX.Element {
  const { confirmationItems, isLoading, error } = useDashboardStore();

  useFetchConfirmationInbox();

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
          Confirmation Inbox
        </h1>
        <p className="text-slate-400 text-sm">
          Review and confirm medium-confidence commitments detected from your messages
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {/* Empty state */}
      {confirmationItems.length === 0 && !error ? (
        <EmptyState
          icon="✅"
          title="No pending confirmations"
          description="All detected medium-confidence commitments have been reviewed."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="card">
            <p className="text-slate-300">
              <span className="font-semibold text-white">
                {confirmationItems.length}
              </span>{" "}
              commitment{confirmationItems.length !== 1 ? "s" : ""} awaiting confirmation
            </p>
          </div>

          {/* Confirmation items */}
          <div className="space-y-4">
            {confirmationItems.map((item) => (
              <Card key={item.commitment.id}>
                <div className="space-y-4">
                  {/* Header with confidence */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">
                        {item.commitment.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        From: {item.commitment.requester}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.confidenceScore >= 0.75
                          ? "success"
                          : item.confidenceScore >= 0.5
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {Math.round(item.confidenceScore * 100)}%
                    </Badge>
                  </div>

                  {/* Extraction reasoning */}
                  <div className="bg-slate-900/50 rounded p-3 border border-slate-700/50">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Why we think this is a commitment:
                    </p>
                    <p className="text-sm text-slate-300">
                      {item.extractionReasoning}
                    </p>
                  </div>

                  {/* Source preview */}
                  <div className="bg-slate-900/50 rounded p-3 border border-slate-700/50">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      From the message:
                    </p>
                    <p className="text-sm text-slate-300 italic truncate-2">
                      "{item.sourcePreview}"
                    </p>
                  </div>

                  {/* Commitment details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Deadline</p>
                      <p className="text-slate-200 font-medium">
                        {item.commitment.deadline
                          ? new Date(item.commitment.deadline).toLocaleDateString()
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Source</p>
                      <p className="text-slate-200 font-medium">
                        {item.commitment.source}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="primary"
                      icon="✓"
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="✕"
                    >
                      Not a commitment
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
