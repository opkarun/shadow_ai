/**
 * Analytics & Insights Page
 *
 * Shows commitment analytics, metrics, and insights.
 */

import React, { useMemo } from "react";
import { useDashboardStore } from "../store";
import { LoadingSkeleton, SkeletonHeader, SkeletonStats } from "../components/LoadingSkeleton";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import {
  getTimeBasedMetrics,
  getRequesterStats,
} from "../services/aggregation";

export function Analytics(): JSX.Element {
  const { commitments, isLoading } = useDashboardStore();

  const metrics = useMemo(
    () => getTimeBasedMetrics(commitments),
    [commitments]
  );

  const requesterStats = useMemo(
    () => getRequesterStats(commitments),
    [commitments]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in w-full">
        <SkeletonHeader />
        <SkeletonStats />
        <LoadingSkeleton count={2} type="card" />
      </div>
    );
  }

  const topPerformers = requesterStats
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5);

  const leastReliable = requesterStats
    .sort((a, b) => {
      const aRate = a.count > 0 ? a.completed / a.count : 0;
      const bRate = b.count > 0 ? b.completed / b.count : 0;
      return aRate - bRate;
    })
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl font-bold text-slate-50">
          Analytics & Insights
        </h1>
        <p className="text-slate-400 text-sm">
          Track your commitment performance and trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div>
            <p className="text-sm text-slate-400 font-medium">Completion Rate</p>
            <p className="text-4xl font-bold text-green-300 mt-3">
              {Math.round(metrics.completionRate)}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Of all commitments completed
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-slate-400 font-medium">
              On-Time Completion
            </p>
            <p className="text-4xl font-bold text-blue-300 mt-3">
              {Math.round(metrics.onTimeCompletionRate)}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Finished before deadline
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-slate-400 font-medium">
              Avg. Time to Complete
            </p>
            <p className="text-4xl font-bold text-purple-300 mt-3">
              {metrics.averageTimeToComplete || "—"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {metrics.averageTimeToComplete ? "days" : "No data"}
            </p>
          </div>
        </Card>
      </div>

      {/* Commitment breakdown */}
      <Card header={<h2 className="text-lg font-semibold">Commitment Breakdown</h2>}>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300">By Requester</span>
              <span className="text-sm text-slate-500">
                {requesterStats.length} requesters
              </span>
            </div>
            <div className="space-y-2">
              {requesterStats.slice(0, 5).map((stats) => (
                <div
                  key={stats.requester}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-300 truncate">
                    {stats.requester}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Badge variant="success" className="text-xs px-2 py-0.5">
                        {stats.completed}
                      </Badge>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {stats.count}
                      </Badge>
                    </div>
                    <span className="text-slate-500 w-12 text-right">
                      {stats.count > 0
                        ? Math.round((stats.completed / stats.count) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Top performers */}
      <Card header={<h2 className="text-lg font-semibold">Top Performers</h2>}>
        <div className="space-y-3">
          {topPerformers.length > 0 ? (
            topPerformers.map((stats, index) => (
              <div
                key={stats.requester}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100 truncate">
                      {stats.requester}
                    </p>
                    <p className="text-xs text-slate-400">
                      {stats.completed} of {stats.count} completed
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-green-300">
                    {stats.count > 0
                      ? Math.round((stats.completed / stats.count) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-center py-4">
              No commitment data yet
            </p>
          )}
        </div>
      </Card>

      {/* Tips & recommendations */}
      <Card
        className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-indigo-500/20"
        header={
          <h2 className="text-lg font-semibold text-indigo-300">
            💡 Tips & Recommendations
          </h2>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="font-medium text-slate-100 mb-1">
              📊 Your completion rate is strong
            </p>
            <p className="text-sm text-slate-300">
              Keep up the momentum by continuing to track your commitments
              consistently.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-100 mb-1">
              ⏰ Review time management
            </p>
            <p className="text-sm text-slate-300">
              Focus on meeting deadlines earlier to reduce stress and increase
              buffer time.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-100 mb-1">
              📧 Prioritize high-confidence commitments
            </p>
            <p className="text-sm text-slate-300">
              These are most likely to be real commitments and should take
              priority in your schedule.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
