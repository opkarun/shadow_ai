/**
 * Empty State Component
 *
 * Friendly empty state display with icon glowing badge and optional action button.
 */

import React, { ReactNode } from "react";
import { IconSparkles } from "./Icons";

interface EmptyStateProps {
  /** Icon to display (ReactNode SVG or string) */
  icon?: ReactNode;
  /** Heading text */
  title: string;
  /** Description text */
  description?: string;
  /** Optional action button */
  action?: ReactNode;
  /** Optional className */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={`py-16 px-6 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-md flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
        {icon || <IconSparkles className="w-8 h-8" />}
      </div>

      <h3 className="text-lg font-bold text-slate-100 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="flex justify-center gap-3">{action}</div>}
    </div>
  );
}
