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
import {
  IconConfirmation,
  IconCheck,
  IconClose,
  IconSparkles,
  IconTarget,
  IconCalendar,
} from "../components/Icons";

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
    <div className="space-y-8 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight flex items-center gap-3">
            <span>Confirmation Inbox</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {confirmationItems.length} Awaiting
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            One-tap confirmation for medium-confidence commitments detected from emails and chat.
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <p className="font-semibold">Error loading confirmations: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {confirmationItems.length === 0 && !error ? (
        <EmptyState
          icon={<IconConfirmation className="w-8 h-8 text-amber-400" />}
          title="No Pending Confirmations"
          description="All detected medium-confidence commitments have been verified."
        />
      ) : (
        <div className="space-y-4">
          {confirmationItems.map((item) => (
            <Card key={item.commitment.id} className="hover:border-amber-500/40">
              <div className="space-y-4">
                {/* Header with confidence meter */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-100 text-base">
                      {item.commitment.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      From: <span className="font-semibold text-slate-200">{item.commitment.requester}</span>
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
                    icon={<IconTarget className="w-3.5 h-3.5" />}
                  >
                    {Math.round(item.confidenceScore * 100)}% Confidence
                  </Badge>
                </div>

                {/* AI Reasoning */}
                <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <IconSparkles className="w-3.5 h-3.5" />
                    AI Detection Reasoning
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.extractionReasoning}
                  </p>
                </div>

                {/* Source Message Preview */}
                <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80">
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    Extracted Quote:
                  </p>
                  <p className="text-xs text-slate-300 italic">
                    "{item.sourcePreview}"
                  </p>
                </div>

                {/* Meta details */}
                <div className="flex items-center gap-6 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <IconCalendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Deadline:{" "}
                      <strong className="text-slate-200">
                        {item.commitment.deadline
                          ? new Date(item.commitment.deadline).toLocaleDateString()
                          : "Unspecified"}
                      </strong>
                    </span>
                  </div>
                  <div>
                    Source Channel:{" "}
                    <strong className="text-slate-200">{item.commitment.source}</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<IconCheck className="w-4 h-4" />}
                    onClick={() => alert(`Confirmed commitment: ${item.commitment.title}`)}
                  >
                    Confirm Commitment
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<IconClose className="w-4 h-4" />}
                    onClick={() => alert(`Dismissed detection`)}
                  >
                    Not a Commitment
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
