/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar for the Dashboard.
 * Contains navigation links, user profile, and integration status.
 */

import React from "react";
import { useRouter, useCurrentPage } from "../../routing/router";
import { useDashboardStore } from "../../store";

interface SidebarProps {
  /** Whether the sidebar is collapsed on mobile */
  isCollapsed?: boolean;
}

/**
 * Navigation item in the sidebar
 */
interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  onClick: () => void;
  isActive?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps): JSX.Element {
  const navigate = useRouter((state) => state.navigate);
  const currentPage = useCurrentPage();
  const { approvalQueue, confirmationItems } = useDashboardStore();

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "📊",
      onClick: () => navigate("dashboard"),
      isActive: currentPage === "dashboard",
    },
    {
      id: "approval-queue",
      label: "Approval Queue",
      icon: "✓",
      onClick: () => navigate("approval-queue"),
      badge: approvalQueue.length,
      isActive: currentPage === "approval-queue",
    },
    {
      id: "confirmations",
      label: "Confirmations",
      icon: "?",
      onClick: () => navigate("confirmations"),
      badge: confirmationItems.length,
      isActive: currentPage === "confirmations",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
      onClick: () => navigate("notifications"),
      isActive: currentPage === "notifications",
    },
    {
      id: "history",
      label: "History",
      icon: "📚",
      onClick: () => navigate("history"),
      isActive: currentPage === "history",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "📈",
      onClick: () => navigate("analytics"),
      isActive: currentPage === "analytics",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
      onClick: () => navigate("settings"),
      isActive: currentPage === "settings",
    },
  ];

  return (
    <div
      className={`flex-shrink-0 border-r border-slate-800/50 overflow-y-auto overflow-x-hidden ${
        isCollapsed ? "w-20" : "w-64"
      } hidden md:flex flex-col bg-slate-950`}
    >
      {/* Logo section */}
      <div className="px-6 py-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white">
            S
          </div>
          {!isCollapsed && (
            <div>
              <p className="font-semibold text-slate-100 text-sm">Shadow</p>
              <p className="text-xs text-slate-500">Commitments</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group text-sm ${
                item.isActive
                  ? "bg-indigo-600/20 text-indigo-300"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </div>

              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-indigo-600/50 text-indigo-200 flex-shrink-0 ml-2">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer section */}
      <div className="px-3 py-4 border-t border-slate-800/50 space-y-3">
        {/* Status indicator */}
        {!isCollapsed && (
          <div className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
            <p className="text-xs text-slate-400 font-medium mb-1.5">
              Sync Status
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
              <p className="text-xs text-slate-300">Connected</p>
            </div>
          </div>
        )}

        {/* User profile */}
        <button className="w-full px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-semibold text-white text-sm flex-shrink-0">
            A
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100 truncate">
                Ayaan
              </p>
              <p className="text-xs text-slate-500 truncate">
                ayaan@example.com
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
