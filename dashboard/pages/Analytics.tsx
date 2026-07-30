/**
 * Analytics & Insights Page
 *
 * Displays commitment performance metrics, completion velocity,
 * and stakeholder reliability stats.
 */

import React, { useMemo } from "react";
import { useDashboardStore } from "../store";
import { LoadingSkeleton, SkeletonHeader, SkeletonStats } from "../components/LoadingSkeleton";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import {
  IconAnalytics,
  IconCheck,
  IconClock,
  IconSparkles,
  IconUser,
  IconTarget,
} from "../components/Icons";
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

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight flex items-center gap-3">
            <span>Analytics & Intelligence</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <IconSparkles className="w-3.5 h-3.5" />
              Insights Engine
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Performance metrics, stakeholder velocity, and execution telemetry.
          </p>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completion Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IconCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-emerald-300 mt-2">
            {Math.round(metrics.completionRate)}%
          </p>
          <p className="text-xs text-slate-500 mt-2">Of total detected commitments</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">On-Time Accuracy</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <IconTarget className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-indigo-300 mt-2">
            {Math.round(metrics.onTimeCompletionRate)}%
          </p>
          <p className="text-xs text-slate-500 mt-2">Delivered before deadline</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Resolution Speed</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <IconClock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-purple-300 mt-2">
            {metrics.averageTimeToComplete ? `${metrics.averageTimeToComplete}d` : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-2">Days from detection to closure</p>
        </div>
      </div>

      {/* Stakeholder Breakdown Card */}
      <Card header={<h2 className="text-lg font-bold text-slate-100">Top Stakeholders & Requesters</h2>}>
        <div className="space-y-3">
          {topPerformers.length > 0 ? (
            topPerformers.map((stats, index) => (
              <div
                key={stats.requester}
                className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-100 text-sm">{stats.requester}</p>
                    <p className="text-xs text-slate-400">
                      {stats.completed} resolved of {stats.count} total
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-emerald-400">
                    {stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-center py-6 text-sm">
              No requester performance data recorded yet.
            </p>
          )}
        </div>
      </Card>

      {/* AI AI Strategy Recommendations */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 space-y-4">
        <h2 className="text-base font-bold text-indigo-200 flex items-center gap-2">
          <IconSparkles className="w-5 h-5 text-indigo-400" />
          <span>Autonomous Performance Recommendations</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="font-bold text-indigo-300 mb-1">Strong Delivery Velocity</p>
            <p className="text-slate-400 leading-relaxed">
              Your overall commitment resolution rate is solid. Keep automated draft approvals active for fast turnaround.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="font-bold text-amber-300 mb-1">Proactive Buffer Time</p>
            <p className="text-slate-400 leading-relaxed">
              Set automated extension requests 24 hours prior to deadline for critical priority tasks.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="font-bold text-emerald-300 mb-1">Evidence Linking</p>
            <p className="text-slate-400 leading-relaxed">
              Auto-link GitHub pull requests and Slack threads to auto-verify completions without manual status edits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
