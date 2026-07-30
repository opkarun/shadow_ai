/**
 * Dashboard Shell Component
 *
 * Main layout wrapper that provides the overall dashboard structure:
 * - Top navigation
 * - Sidebar
 * - Main content area
 * - Responsive design
 */

import React, { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";

interface DashboardShellProps {
  /** Page title shown in top nav */
  title?: string;
  /** Content to display in main area */
  children: ReactNode;
  /** Whether to show search in top nav */
  showSearch?: boolean;
  /** Additional content classes */
  contentClassName?: string;
}

export function DashboardShell({
  title = "Dashboard",
  children,
  showSearch = true,
  contentClassName,
}: DashboardShellProps): JSX.Element {
  return (
    <div className="bg-slate-950 h-screen flex flex-col overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse opacity-20 delay-1000"></div>
      </div>

      {/* Top Navigation - Fixed at top, full width */}
      <TopNav title={title} showSearch={showSearch} />

      {/* Body: Sidebar + Content side-by-side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fixed width, scrollable */}
        <Sidebar />

        {/* Main Content - Flexible, takes remaining width */}
        <MainContent className={contentClassName}>{children}</MainContent>
      </div>
    </div>
  );
}
