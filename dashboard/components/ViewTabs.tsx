/**
 * View Tabs Component
 *
 * Modern pill-style tab selector for switching commitment views:
 * Pending, Upcoming, Overdue, Completed
 */

import React from "react";
import {
  IconClock,
  IconCalendar,
  IconAlertTriangle,
  IconCheck,
} from "./Icons";

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
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: "PENDING",
    label: "Pending",
    icon: <IconClock className="w-4 h-4" />,
    description: "Confirmed active commitments",
  },
  {
    id: "UPCOMING",
    label: "Upcoming",
    icon: <IconCalendar className="w-4 h-4" />,
    description: "Due in the next 7 days",
  },
  {
    id: "OVERDUE",
    label: "Overdue",
    icon: <IconAlertTriangle className="w-4 h-4" />,
    description: "Past deadline requiring action",
  },
  {
    id: "COMPLETED",
    label: "Completed",
    icon: <IconCheck className="w-4 h-4" />,
    description: "Finished and resolved",
  },
];

export function ViewTabs({
  activeView,
  onViewChange,
  counts = { PENDING: 0, UPCOMING: 0, OVERDUE: 0, COMPLETED: 0, ALL: 0 },
}: ViewTabsProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80">
      {VIEWS.map((view) => {
        const isActive = activeView === view.id;
        const count = counts[view.id] || 0;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              group relative flex items-center gap-2 px-4 py-2 rounded-xl
              text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer outline-none select-none
              ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }
            `}
            title={view.description}
          >
            <span
              className={`transition-transform duration-200 ${
                isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-slate-300"
              }`}
            >
              {view.icon}
            </span>
            <span>{view.label}</span>

            {count > 0 && (
              <span
                className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
