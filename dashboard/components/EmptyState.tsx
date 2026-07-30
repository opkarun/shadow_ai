/**
 * Empty State Component
 *
 * Shows a friendly message when no content is available.
 */

import React, { ReactNode } from "react";

interface EmptyStateProps {
  /** Icon/emoji to display */
  icon?: string;
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
  icon = "📭",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps): JSX.Element {
  return (
    <div className={`py-12 text-center card ${className}`}>
      {icon && <div className="text-6xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      {description && <p className="text-slate-400 mb-6">{description}</p>}
      {action && <div className="flex justify-center gap-3">{action}</div>}
    </div>
  );
}
