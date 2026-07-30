/**
 * Commitment Detail Modal Component
 *
 * Provides a slide-over modal detailing commitment info, evidence files,
 * timeline, and actions.
 */

import React from "react";
import type { Commitment } from "../../shared/types";
import {
  IconClose,
  IconCalendar,
  IconUser,
  IconCheck,
  IconAlertTriangle,
  IconFileText,
  IconClock,
  IconStar,
  IconTarget,
  IconShield,
} from "./Icons";
import { Button } from "./Button";
import { Badge } from "./Badge";

interface CommitmentDetailModalProps {
  commitment: Commitment | null;
  onClose: () => void;
}

export function CommitmentDetailModal({
  commitment,
  onClose,
}: CommitmentDetailModalProps): JSX.Element | null {
  if (!commitment) return null;

  const now = new Date();
  const deadline = commitment.deadline ? new Date(commitment.deadline) : null;
  const daysRemaining = deadline
    ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={
                  commitment.status === "COMPLETED"
                    ? "success"
                    : commitment.status === "OVERDUE"
                      ? "danger"
                      : "primary"
                }
              >
                {commitment.status}
              </Badge>
              <span className="text-xs text-slate-500 font-mono">
                ID: {commitment.id}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-50 leading-snug">
              {commitment.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Key Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <IconUser className="w-4 h-4 text-indigo-400" />
                <span>Requester</span>
              </div>
              <p className="text-sm font-bold text-slate-100 truncate">
                {commitment.requester}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <IconCalendar className="w-4 h-4 text-purple-400" />
                <span>Deadline</span>
              </div>
              <p className="text-sm font-bold text-slate-100">
                {deadline ? deadline.toLocaleDateString() : "No deadline"}
                {daysRemaining !== null && (
                  <span
                    className={`ml-2 text-xs font-normal ${
                      daysRemaining < 0
                        ? "text-rose-400"
                        : daysRemaining <= 2
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    ({daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`})
                  </span>
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <IconStar className="w-4 h-4 text-amber-400" />
                <span>Priority Score</span>
              </div>
              <p className="text-sm font-bold text-slate-100">
                {commitment.priority_score} / 5
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <IconTarget className="w-4 h-4 text-emerald-400" />
                <span>AI Confidence</span>
              </div>
              <p className="text-sm font-bold text-slate-100">
                {Math.round(commitment.confidence_score * 100)}%
              </p>
            </div>
          </div>

          {/* Source Context */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <IconFileText className="w-4 h-4 text-indigo-400" />
              <span>Extracted Source Channel</span>
            </h4>
            <p className="text-sm text-slate-200">
              Originating from <span className="font-semibold text-indigo-300">{commitment.source}</span> integration.
            </p>
          </div>

          {/* AI Autonomous Verification Status */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <IconShield className="w-4 h-4 text-indigo-400" />
                <span>BFF Autonomous Monitoring</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active Watch
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Shadow is actively monitoring your communications for evidence of completion or updates regarding this commitment.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<IconCheck className="w-4 h-4" />}
            onClick={() => {
              alert(`Marking commitment "${commitment.title}" as completed`);
              onClose();
            }}
          >
            Mark Completed
          </Button>
        </div>
      </div>
    </div>
  );
}
