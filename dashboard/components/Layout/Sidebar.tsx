/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar for the Dashboard.
 * Displays page navigation, live metrics badges, and connection status.
 */

import React from "react";
import { useRouter, useCurrentPage } from "../../routing/router";
import { useDashboardStore } from "../../store";
import {
  IconDashboard,
  IconApproval,
  IconConfirmation,
  IconNotification,
  IconHistory,
  IconAnalytics,
  IconSettings,
  IconShield,
} from "../Icons";

interface SidebarProps {
  /** Called when a nav item is clicked (for closing mobile menu) */
  onNavItemClick?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeVariant?: "indigo" | "amber" | "purple";
  onClick: () => void;
  isActive?: boolean;
}

export function Sidebar({ onNavItemClick }: SidebarProps): JSX.Element {
  const navigate = useRouter((state) => state.navigate);
  const currentPage = useCurrentPage();
  const { approvalQueue, confirmationItems } = useDashboardStore();

  const handleNavClick = (page: string) => {
    navigate(page as any);
    onNavItemClick?.();
  };

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <IconDashboard className="w-5 h-5" />,
      onClick: () => handleNavClick("dashboard"),
      isActive: currentPage === "dashboard",
    },
    {
      id: "approval-queue",
      label: "Approval Queue",
      icon: <IconApproval className="w-5 h-5" />,
      onClick: () => handleNavClick("approval-queue"),
      badge: approvalQueue.length,
      badgeVariant: "indigo",
      isActive: currentPage === "approval-queue",
    },
    {
      id: "confirmations",
      label: "Confirmations",
      icon: <IconConfirmation className="w-5 h-5" />,
      onClick: () => handleNavClick("confirmations"),
      badge: confirmationItems.length,
      badgeVariant: "amber",
      isActive: currentPage === "confirmations",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <IconNotification className="w-5 h-5" />,
      onClick: () => handleNavClick("notifications"),
      isActive: currentPage === "notifications",
    },
    {
      id: "history",
      label: "History & Archive",
      icon: <IconHistory className="w-5 h-5" />,
      onClick: () => handleNavClick("history"),
      isActive: currentPage === "history",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <IconAnalytics className="w-5 h-5" />,
      onClick: () => handleNavClick("analytics"),
      isActive: currentPage === "analytics",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <IconSettings className="w-5 h-5" />,
      onClick: () => handleNavClick("settings"),
      isActive: currentPage.startsWith("settings"),
    },
  ];

  return (
    <aside className="w-full h-full flex flex-col bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 select-none">
      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Overview
          </p>
        </div>

        {navItems.map((item) => {
          const isActive = item.isActive;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium relative group ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white shadow-lg shadow-indigo-500/10 border border-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              {/* Active Pill Indicator */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-r-full"></span>
              )}

              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`transition-colors ${
                    isActive
                      ? "text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                    item.badgeVariant === "amber"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
        {/* System Status Card */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block absolute inset-0 animate-ping opacity-75"></span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">BFF Engine</p>
              <p className="text-[10px] text-slate-400">Autonomous Active</p>
            </div>
          </div>
          <IconShield className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </aside>
  );
}
