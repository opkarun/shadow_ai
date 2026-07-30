/**
 * Top Navigation Bar Component
 *
 * Clean, modern header with logo, search, status, and user profile.
 */

import React, { useState } from "react";
import {
  IconSearch,
  IconNotification,
  IconSparkles,
  IconMenu,
  IconClose,
} from "../Icons";

interface TopNavProps {
  /** Mobile menu state handler */
  onMobileMenuToggle?: (open: boolean) => void;
  /** Whether mobile menu is open */
  mobileMenuOpen?: boolean;
}

export function TopNav({
  onMobileMenuToggle,
  mobileMenuOpen = false,
}: TopNavProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="w-full h-16 flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 z-30 relative select-none">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left side - Logo & Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-indigo-500/30 flex items-center justify-center font-bold text-white shadow-lg">
              <IconSparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                Shadow
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                AI Executive
              </span>
            </div>
          </div>
        </div>

        {/* Center - Search bar */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="w-full relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <IconSearch className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search commitments, stakeholders, drafts... (Press ⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-900/80 transition-all outline-none"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Notification button */}
          <button
            className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-all border border-transparent hover:border-slate-700/50"
            title="Notifications"
          >
            <IconNotification className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full ring-4 ring-slate-900 animate-pulse"></span>
          </button>

          {/* User profile */}
          <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
                A
              </div>
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 leading-none">
                Ayaan
              </span>
              <span className="text-[10px] text-slate-400 mt-1 leading-none">
                Executive Owner
              </span>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => onMobileMenuToggle?.(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-all border border-transparent hover:border-slate-700/50"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <IconClose className="w-5 h-5" />
            ) : (
              <IconMenu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
