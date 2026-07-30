/**
 * Card Component
 *
 * Reusable card wrapper with glassmorphism styling.
 */

import React, { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Optional header */
  header?: ReactNode;
  /** Optional footer */
  footer?: ReactNode;
  /** Whether card is clickable */
  isClickable?: boolean;
  /** Optional className override */
  className?: string;
}

export function Card({
  children,
  header,
  footer,
  isClickable = false,
  className = "",
  ...props
}: CardProps): JSX.Element {
  return (
    <div
      className={`
        rounded-lg bg-slate-900/30 border border-slate-800/50 p-6
        ${isClickable ? "card-hover cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {header && (
        <div className="mb-6 pb-6 border-b border-slate-800/50">{header}</div>
      )}

      <div>{children}</div>

      {footer && (
        <div className="mt-6 pt-6 border-t border-slate-800/50">{footer}</div>
      )}
    </div>
  );
}
