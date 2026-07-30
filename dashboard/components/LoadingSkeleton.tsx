/**
 * Loading Skeleton Component
 *
 * Shows beautiful loading skeleton screens while data is being fetched.
 */

import React from "react";

interface LoadingSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Type of skeleton to show */
  type?: "card" | "list" | "grid";
}

/**
 * Skeleton card component - shows a placeholder for a commitment card
 */
function SkeletonCard(): JSX.Element {
  return (
    <div className="card space-y-4 animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-6 bg-slate-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-2/4"></div>
      </div>

      {/* Badges skeleton */}
      <div className="flex gap-2">
        <div className="h-7 bg-slate-700/50 rounded-full w-20"></div>
        <div className="h-7 bg-slate-700/50 rounded-full w-20"></div>
        <div className="h-7 bg-slate-700/50 rounded-full w-20"></div>
      </div>

      {/* Footer skeleton */}
      <div className="flex justify-between pt-2">
        <div className="h-4 bg-slate-700/50 rounded w-2/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton list item component
 */
function SkeletonListItem(): JSX.Element {
  return (
    <div className="py-4 border-b border-white/10 space-y-3 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-slate-700/50 rounded w-2/3"></div>
          <div className="h-4 bg-slate-700/50 rounded w-1/3"></div>
        </div>
        <div className="h-12 bg-slate-700/50 rounded w-12 flex-shrink-0"></div>
      </div>
    </div>
  );
}

export function LoadingSkeleton({
  count = 3,
  type = "card",
}: LoadingSkeletonProps): JSX.Element {
  if (type === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Default: card layout
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a header section
 */
export function SkeletonHeader(): JSX.Element {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-700/50 rounded w-1/3"></div>
      <div className="h-6 bg-slate-700/50 rounded w-2/3"></div>
    </div>
  );
}

/**
 * Skeleton for stats/metrics
 */
export function SkeletonStats(): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-2"
        >
          <div className="h-5 bg-slate-700/50 rounded w-2/3"></div>
          <div className="h-8 bg-slate-700/50 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
