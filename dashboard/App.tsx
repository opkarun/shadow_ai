/**
 * Shadow Dashboard App Component
 *
 * Main React application entry point for the Shadow dashboard.
 * Provides the shell layout (navigation, sidebar) and renders page content based on routing.
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

  // ALL HOOKS MUST BE DECLARED UNCONDITIONALLY AT THE TOP
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

  // Full-screen pages (no shell) - Render after all hooks have run
  if (currentPage === "oauth-success") {
    return <OAuthSuccess />;
  }

  if (currentPage === "oauth-error") {
    return <OAuthError />;
  }

  return (
    <DashboardShell>
      {pageContent}
    </DashboardShell>
  );
}
