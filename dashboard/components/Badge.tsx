/**
 * Badge Component
 *
 * Reusable badge component for displaying status, labels, and counts.
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
  /** Optional icon/emoji prefix */
  icon?: ReactNode;
  /** Optional className override */
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  primary: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  secondary: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  success: "bg-green-500/20 text-green-300 border-green-500/30",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  danger: "bg-red-500/20 text-red-300 border-red-500/30",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export function Badge({
  children,
  variant = "primary",
  icon,
  className = "",
}: BadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${VARIANT_STYLES[variant]} ${className}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
    </span>
  );
}
