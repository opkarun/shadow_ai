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
import { Button } from "../components/Button";
import {
  IconNotification,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconSparkles,
} from "../components/Icons";

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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in w-full">
        <SkeletonHeader />
        <LoadingSkeleton count={4} type="list" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight flex items-center gap-3">
            <span>Notification Feed</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {notifications.length} Events
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Chronological audit feed of AI detections, risk flags, and state transitions.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => alert("All notifications marked read")}>
          Mark All Read
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <p className="font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {notifications.length === 0 && !error ? (
        <EmptyState
          icon={<IconNotification className="w-8 h-8 text-indigo-400" />}
          title="All Caught Up"
          description="No recent system notifications or activity flags."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                {date}
              </h2>

              <div className="space-y-3 pl-2 border-l-2 border-slate-800/80">
                {items.map((notification) => {
                  const severity = notification.severity || "info";

                  return (
                    <div key={notification.id} className="relative pl-6 group">
                      <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:scale-125 transition-transform"></div>

                      <Card
                        className={`transition-all ${
                          !notification.isRead
                            ? "bg-slate-900/60 border-indigo-500/30"
                            : "bg-slate-950/40 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-100 text-sm">
                              {notification.title}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono block pt-1">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </span>
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
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
