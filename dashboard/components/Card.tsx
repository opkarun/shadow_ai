/**
 * Card Component
 *
 * Reusable card wrapper with modern dark glassmorphism styling.
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
        rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 md:p-6 shadow-xl backdrop-blur-md
        transition-all duration-300
        ${
          isClickable
            ? "hover:bg-slate-900/80 hover:border-slate-700/80 hover:shadow-indigo-500/5 cursor-pointer"
            : ""
        }
        ${className}
      `}
      {...props}
    >
      {header && (
        <div className="mb-5 pb-4 border-b border-slate-800/80">{header}</div>
      )}

      <div>{children}</div>

      {footer && (
        <div className="mt-5 pt-4 border-t border-slate-800/80">{footer}</div>
      )}
    </div>
  );
}
