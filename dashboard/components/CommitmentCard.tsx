/**
 * Commitment Card Component
 *
 * Displays a single commitment with status badges, priority, confidence score,
 * and time remaining information.
 */

import React from "react";
import {
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconStar,
  IconTarget,
  IconCalendar,
  IconArrowRight,
  IconEdit,
} from "./Icons";

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

const RISK_CONFIG = {
  LOW: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: <IconCheck className="w-3.5 h-3.5 text-emerald-400" />,
    label: "Low Risk",
  },
  MEDIUM: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    icon: <IconAlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    label: "At Risk",
  },
  HIGH: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    icon: <IconAlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
    label: "Critical Risk",
  },
};

const PRIORITY_LABELS = [
  "No Priority",
  "Low Priority",
  "Medium Priority",
  "High Priority",
  "Critical",
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
  const riskConfig = RISK_CONFIG[riskLevel];
  const priorityIndex = Math.min(Math.max(priority, 0), 4);

  // Format deadline label
  const deadlineLabel =
    daysRemaining === null
      ? "No deadline"
      : daysRemaining === 0
        ? "Due Today"
        : daysRemaining === 1
          ? "Due Tomorrow"
          : daysRemaining < 0
            ? `${Math.abs(daysRemaining)} days overdue`
            : `${daysRemaining} days left`;

  return (
    <div
      onClick={onClick}
      className="group relative w-full p-5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 hover:border-indigo-500/40 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
    >
      {/* Top accent glow on hover */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="flex flex-col gap-4">
        {/* Title & Actions Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-200 transition-colors truncate">
                {title}
              </h3>
            </div>
            <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5">
              <span className="text-slate-500">From:</span>
              <span className="font-medium text-slate-300">{requester}</span>
            </p>
          </div>

          {/* Pending draft tag */}
          {hasPendingDraft && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-semibold text-indigo-300 shadow-sm"
              title="Draft pending approval"
            >
              <IconEdit className="w-3.5 h-3.5" />
              <span>Draft Ready</span>
            </span>
          )}
        </div>

        {/* Status Pill Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Risk Level Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${riskConfig.bg} ${riskConfig.border} ${riskConfig.text}`}
          >
            {riskConfig.icon}
            <span>{riskConfig.label}</span>
          </span>

          {/* Priority Score */}
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <IconStar className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>{PRIORITY_LABELS[priorityIndex]}</span>
          </span>

          {/* Confidence Score Meter */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <IconTarget className="w-3.5 h-3.5 text-indigo-400" />
            <span>{Math.round(confidence * 100)}% Confidence</span>
          </span>
        </div>

        {/* Footer Meta Details */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/50 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            {/* Deadline */}
            <div
              className={`flex items-center gap-1.5 font-medium ${
                daysRemaining !== null && daysRemaining < 0
                  ? "text-rose-400"
                  : daysRemaining !== null && daysRemaining <= 2
                    ? "text-amber-400"
                    : "text-slate-400"
              }`}
            >
              <IconCalendar className="w-3.5 h-3.5" />
              <span>{deadlineLabel}</span>
            </div>

            {/* Evidence Count */}
            {evidenceCount > 0 && (
              <div className="flex items-center gap-1 text-slate-400">
                <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{evidenceCount} Evidence files</span>
              </div>
            )}
          </div>

          {/* View arrow */}
          <div className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300 font-semibold group-hover:translate-x-1 transition-transform">
            <span>View</span>
            <IconArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
