/**
 * Notification Center Page
 *
 * Shows chronological feed of system events:
 * risk flags, overdue transitions, evidence matches, etc.
 */

import React, { useMemo } from "react";
import { useDashboardStore } from "../store";
import { useFetchNotifications } from "../hooks/useDashboardData";
import { LoadingSkeleton, SkeletonHeader } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";

export function NotificationCenter(): JSX.Element {
  const { notifications, isLoading, error } = useDashboardStore();

  useFetchNotifications();

  const groupedNotifications = useMemo(() => {
    return notifications.reduce(
      (acc, notification) => {
        const date = new Date(notification.timestamp).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(notification);
        return acc;
      },
      {} as Record<string, typeof notifications>
    );
  }, [notifications]);

  const getEventIcon = (eventType: string): string => {
    const icons: Record<string, string> = {
      commitment_detected: "📝",
      commitment_confirmed: "✓",
      evidence_matched: "🔗",
      commitment_at_risk: "⚠️",
      commitment_overdue: "🔴",
      draft_generated: "📄",
      draft_approved: "✓",
      draft_sent: "📤",
      integration_error: "❌",
      verification_complete: "✓",
    };
    return icons[eventType] || "📌";
  };

  const getSeverityColor = (
    severity: string
  ): { bg: string; border: string; text: string } => {
    const colors: Record<
      string,
      { bg: string; border: string; text: string }
    > = {
      error: {
        bg: "bg-red-500/20",
        border: "border-red-500/30",
        text: "text-red-300",
      },
      warning: {
        bg: "bg-amber-500/20",
        border: "border-amber-500/30",
        text: "text-amber-300",
      },
      info: {
        bg: "bg-blue-500/20",
        border: "border-blue-500/30",
        text: "text-blue-300",
      },
    };
    return colors[severity] || colors.info;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in w-full">
        <SkeletonHeader />
        <LoadingSkeleton count={4} type="list" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl font-bold text-slate-50">
          Notification Center
        </h1>
        <p className="text-slate-400 text-sm">
          Chronological feed of important events and system updates
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {/* Empty state */}
      {notifications.length === 0 && !error ? (
        <EmptyState
          icon="🔔"
          title="No notifications"
          description="You're all caught up. New events will appear here."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-4">
            <div className="card flex-1">
              <p className="text-slate-300">
                <span className="font-semibold text-white">
                  {notifications.length}
                </span>{" "}
                total events
              </p>
            </div>
            <button className="btn btn-secondary">Mark all as read</button>
          </div>

          {/* Notifications by date */}
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {date}
                </h2>

                {/* Timeline */}
                <div className="space-y-2">
                  {items.map((notification, index) => {
                    const severity = notification.severity || "info";
                    const severityColors = getSeverityColor(severity);
                    const icon = getEventIcon(notification.eventType);

                    return (
                      <div
                        key={notification.id}
                        className="relative flex gap-4"
                      >
                        {/* Timeline line */}
                        {index < items.length - 1 && (
                          <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-slate-700/50"></div>
                        )}

                        {/* Timeline dot and content */}
                        <div className="relative">
                          <div
                            className={`
                            w-8 h-8 rounded-full
                            flex items-center justify-center
                            text-lg flex-shrink-0
                            ${
                              notification.isRead
                                ? "bg-slate-800 text-slate-500"
                                : "bg-indigo-600 text-white"
                            }
                          `}
                          >
                            {icon}
                          </div>
                        </div>

                        {/* Notification card */}
                        <Card
                          className={`flex-1 ${
                            !notification.isRead
                              ? "border-indigo-500/30 bg-indigo-600/10"
                              : ""
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-100">
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  severity === "error"
                                    ? "danger"
                                    : severity === "warning"
                                      ? "warning"
                                      : "info"
                                }
                              >
                                {severity}
                              </Badge>
                            </div>

                            {/* Time */}
                            <p className="text-xs text-slate-500">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>

                            {/* Action link if available */}
                            {notification.actionLink && (
                              <button className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                View Details →
                              </button>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
