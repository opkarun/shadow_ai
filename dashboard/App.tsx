/**
 * Shadow Dashboard App Component
 *
 * Main React application entry point for the Shadow dashboard.
 * Provides the shell layout (navigation, sidebar) and renders page content based on routing.
 *
 * Inputs: shared Commitment, Evidence, Draft, Integration, CalendarEvent, and AuditLogEntry data via BFF routes.
 * Output: the React dashboard with multiple pages and views.
 *
 * PRODUCT_SPEC.md Section 22 defines screens.
 */

import React, { useMemo, useEffect } from "react";
import { useCurrentPage, useRouter } from "./routing/router";
import { DashboardShell } from "./components/Layout/DashboardShell";
import { Dashboard } from "./pages/Dashboard";
import { ApprovalQueue } from "./pages/ApprovalQueue";
import { ConfirmationInbox } from "./pages/ConfirmationInbox";
import { NotificationCenter } from "./pages/NotificationCenter";
import { History } from "./pages/History";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { OAuthSuccess } from "./pages/OAuthSuccess";
import { OAuthError } from "./pages/OAuthError";
import "./globals.css";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  "approval-queue": "Approval Queue",
  confirmations: "Confirmation Inbox",
  notifications: "Notifications",
  history: "History & Archive",
  analytics: "Analytics",
  settings: "Settings",
};

export function App(): JSX.Element {
  const currentPage = useCurrentPage();
  const navigate = useRouter((state) => state.navigate);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/oauth-success") {
      navigate("oauth-success");
    } else if (path === "/oauth-error") {
      navigate("oauth-error");
    }
  }, [navigate]);

  // Full-screen pages (no shell)
  if (currentPage === "oauth-success") {
    return <OAuthSuccess />;
  }

  if (currentPage === "oauth-error") {
    return <OAuthError />;
  }

  const pageContent = useMemo(() => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "approval-queue":
        return <ApprovalQueue />;
      case "confirmations":
        return <ConfirmationInbox />;
      case "notifications":
        return <NotificationCenter />;
      case "history":
        return <History />;
      case "analytics":
        return <Analytics />;
      case "settings":
      case "settings-integrations":
      case "settings-stakeholders":
      case "settings-preferences":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }, [currentPage]);

  const pageTitle = PAGE_TITLES[currentPage] || "Dashboard";

  return (
    <DashboardShell title={pageTitle} showSearch={currentPage === "dashboard"}>
      {pageContent}
    </DashboardShell>
  );
}
