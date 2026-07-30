/**
 * Badge Component
 *
 * Reusable badge component for status indicators, counts, and pill tags.
 */

import React, { ReactNode } from "react";

type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  /** Content of the badge */
  children: ReactNode;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Optional icon prefix */
  icon?: ReactNode;
  /** Optional className override */
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  primary: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  secondary: "bg-slate-800 text-slate-300 border-slate-700",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  info: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export function Badge({
  children,
  variant = "primary",
  icon,
  className = "",
}: BadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${VARIANT_STYLES[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
