/**
 * Main Content Area Component
 *
 * Responsive content wrapper that adjusts for sidebar and top navigation.
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
      className={`
        flex-1
        overflow-y-auto
        overflow-x-hidden
        bg-slate-950
        ${className}
      `}
    >
      <div className="min-h-full px-6 sm:px-8 lg:px-10 py-8">
        {children}
      </div>
    </main>
  );
}
