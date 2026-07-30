/**
 * Main Content Area Component
 *
 * Responsive content wrapper with vertical scroll overflow and structured layout padding.
 */

import React, { ReactNode } from "react";

interface MainContentProps {
  /** Content to display */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function MainContent({
  children,
  className = "",
}: MainContentProps): JSX.Element {
  return (
    <main
      role="main"
      className={`
        w-full
        flex-1
        h-full
        overflow-y-auto
        bg-slate-950
        min-h-0
        ${className}
      `}
    >
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </main>
  );
}
