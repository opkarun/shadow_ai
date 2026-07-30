/**
 * Top Navigation Bar Component
 *
 * Header navigation bar with search, notifications, and quick actions.
 */

import React, { useState } from "react";

interface TopNavProps {
  /** Title of the current page */
  title?: string;
  /** Whether to show the search bar */
  showSearch?: boolean;
}

export function TopNav({
  title = "Dashboard",
  showSearch = true,
}: TopNavProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="fixed top-0 left-0 right-0 h-20 bg-slate-950/80 backdrop-blur border-b border-slate-800/50 z-50 w-full">
      <div className="h-full px-4 sm:px-6 md:px-8 flex items-center justify-between gap-6 w-full">
        {/* Left side - Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-50 truncate">{title}</h1>
        </div>

        {/* Center - Search bar */}
        {showSearch && (
          <div className="hidden lg:flex flex-shrink-0 w-80">
            <div className="w-full relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-slate-500 text-sm">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right side - Actions and User menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notification button */}
          <button
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Notifications"
          >
            <span className="text-lg">🔔</span>
            <span className="absolute -mt-6 ml-3 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Help button */}
          <button
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors hidden sm:flex items-center justify-center"
            title="Help"
          >
            <span className="text-lg">?</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 hidden sm:block mx-1"></div>

          {/* User menu button */}
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-semibold text-white text-sm">
              A
            </div>
            <span className="text-sm text-slate-300 hidden sm:inline">Ayaan</span>
          </button>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors">
            <span className="text-lg">☰</span>
          </button>
        </div>
      </div>
    </div>
  );
}
