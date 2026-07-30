/**
 * Dashboard Shell Component
 *
 * Main layout wrapper that provides the overall dashboard structure:
 * - Top navigation (fixed flex top item)
 * - Responsive Sidebar
 * - Main content area
 */

import React, { ReactNode, useState } from "react";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";

interface DashboardShellProps {
  /** Content to display in main area */
  children: ReactNode;
  /** Additional content classes */
  contentClassName?: string;
}

export function DashboardShell({
  children,
  contentClassName,
}: DashboardShellProps): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 relative font-sans">
      {/* Background ambient lighting gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none"></div>
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px] pointer-events-none"></div>
      </div>

      {/* Top Navigation Bar */}
      <TopNav
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuToggle={setMobileMenuOpen}
      />

      {/* Workspace Area: Sidebar + Main Content */}
      <div className="w-full flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 h-full flex-shrink-0 z-20">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay & Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-40 md:hidden flex flex-col bg-slate-950/95 backdrop-blur-2xl animate-fade-in">
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNavItemClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content View */}
        <MainContent className={contentClassName}>{children}</MainContent>
      </div>
    </div>
  );
}
