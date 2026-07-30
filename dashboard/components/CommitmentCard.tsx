/**
 * Commitment Card Component
 *
 * Displays a single commitment with status badges, priority, confidence score,
 * and time remaining information.
 */

import React from "react";

interface CommitmentCardProps {
  /** Commitment ID */
  id: string;
  /** Commitment title */
  title: string;
  /** Requester name/email */
  requester: string;
  /** Days remaining until deadline */
  daysRemaining: number | null;
  /** Priority score (0-5) */
  priority: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Risk level badge */
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  /** Number of evidence items */
  evidenceCount: number;
  /** Whether there's a pending draft */
  hasPendingDraft: boolean;
  /** Click handler */
  onClick?: () => void;
}

const RISK_COLORS = {
  LOW: {
    bg: "bg-green-500/20",
    border: "border-green-500/30",
    text: "text-green-300",
    icon: "✓",
  },
  MEDIUM: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    text: "text-amber-300",
    icon: "⚠️",
  },
  HIGH: {
    bg: "bg-red-500/20",
    border: "border-red-500/30",
    text: "text-red-300",
    icon: "🔴",
  },
};

const PRIORITY_COLORS = [
  { bg: "bg-gray-500/20", text: "text-gray-300", label: "No Priority" },
  { bg: "bg-blue-500/20", text: "text-blue-300", label: "Low" },
  { bg: "bg-green-500/20", text: "text-green-300", label: "Medium" },
  { bg: "bg-amber-500/20", text: "text-amber-300", label: "High" },
  { bg: "bg-red-500/20", text: "text-red-300", label: "Critical" },
];

export function CommitmentCard({
  id,
  title,
  requester,
  daysRemaining,
  priority,
  confidence,
  riskLevel,
  evidenceCount,
  hasPendingDraft,
  onClick,
}: CommitmentCardProps): JSX.Element {
  const priorityConfig = PRIORITY_COLORS[Math.min(priority, 4)];
  const riskConfig = RISK_COLORS[riskLevel];

  // Format days remaining
  const deadlineLabel =
    daysRemaining === null
      ? "No deadline"
      : daysRemaining === 0
        ? "Today"
        : daysRemaining === 1
          ? "Tomorrow"
          : daysRemaining < 0
            ? `${Math.abs(daysRemaining)} days overdue`
            : `${daysRemaining} days left`;

  return (
    <button
      onClick={onClick}
      className="w-full text-left card-hover animate-slide-in-up group"
    >
      <div className="flex flex-col gap-4">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-100 group-hover:text-white transition-smooth truncate">
              {title}
            </h3>
            <p className="text-sm text-slate-400 truncate mt-1">{requester}</p>
          </div>

          {/* Action badges */}
          <div className="flex gap-2 flex-shrink-0">
            {hasPendingDraft && (
              <span
                className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-xs font-medium text-indigo-300"
                title="Pending draft approval"
              >
                📝
              </span>
            )}
          </div>
        </div>

        {/* Status and metrics row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Risk level badge */}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${riskConfig.bg} ${riskConfig.border} ${riskConfig.text}`}
          >
            <span>{riskConfig.icon}</span>
            <span>
              {riskLevel === "LOW"
                ? "Low Risk"
                : riskLevel === "MEDIUM"
                  ? "At Risk"
                  : "Critical"}
            </span>
          </span>

          {/* Priority badge */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${priorityConfig.bg} ${priorityConfig.text} border-white/10`}
          >
            ⭐ {priorityConfig.label}
          </span>

          {/* Confidence badge */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
              confidence >= 0.75
                ? "bg-green-500/20 text-green-300 border-green-500/30"
                : confidence >= 0.5
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-red-500/20 text-red-300 border-red-500/30"
            }`}
          >
            🎯 {Math.round(confidence * 100)}%
          </span>
        </div>

        {/* Footer with deadline and evidence */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {/* Deadline */}
            <span
              className={`${
                daysRemaining !== null && daysRemaining < 0
                  ? "text-red-400"
                  : daysRemaining !== null && daysRemaining <= 2
                    ? "text-amber-400"
                    : "text-slate-400"
              }`}
            >
              📅 {deadlineLabel}
            </span>

            {/* Evidence count */}
            {evidenceCount > 0 && (
              <span className="text-slate-400 flex items-center gap-1">
                ✓ {evidenceCount} evidence
              </span>
            )}
          </div>

          {/* Arrow indicator */}
          <span className="text-slate-500 group-hover:text-indigo-400 transition-smooth">
            →
          </span>
        </div>
      </div>
    </button>
  );
}
