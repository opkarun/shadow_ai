/**
 * View Tabs Component
 *
 * Displays tabs/filter chips for switching between different commitment views:
 * Pending, Upcoming, Overdue, Completed
 */

import React from "react";

export type ViewType = "PENDING" | "UPCOMING" | "OVERDUE" | "COMPLETED" | "ALL";

interface ViewTabsProps {
  /** Currently active view */
  activeView: ViewType;
  /** Callback when view changes */
  onViewChange: (view: ViewType) => void;
  /** Optional badge counts for each view */
  counts?: Record<ViewType, number>;
}

const VIEWS: Array<{
  id: ViewType;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: "PENDING",
    label: "Pending",
    icon: "📋",
    description: "Confirmed but not started",
  },
  {
    id: "UPCOMING",
    label: "Upcoming",
    icon: "📅",
    description: "Due in the next 7 days",
  },
  {
    id: "OVERDUE",
    label: "Overdue",
    icon: "🔴",
    description: "Past deadline without completion",
  },
  {
    id: "COMPLETED",
    label: "Completed",
    icon: "✓",
    description: "Finished and closed",
  },
];

export function ViewTabs({
  activeView,
  onViewChange,
  counts = { PENDING: 0, UPCOMING: 0, OVERDUE: 0, COMPLETED: 0, ALL: 0 },
}: ViewTabsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 pb-6 border-b border-slate-800/50">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`
            group
            flex items-center gap-2 px-4 py-2.5 rounded-lg
            text-sm font-medium transition-colors
            ${
              activeView === view.id
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
            }
          `}
          title={view.description}
        >
          <span className="text-base">{view.icon}</span>
          <span>{view.label}</span>
          {counts[view.id] > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-5 h-5 text-xs font-semibold rounded-full ${
                activeView === view.id
                  ? "bg-indigo-500/40 text-indigo-100"
                  : "bg-slate-800/50 text-slate-400 group-hover:bg-slate-700/50"
              }`}
            >
              {counts[view.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
