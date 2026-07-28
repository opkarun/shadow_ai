import type { Router } from "express";

/**
 * Inputs: an Express Router owned by the dashboard/BFF module.
 * Output: the same router with dashboard-facing routes registered.
 *
 * PRODUCT_SPEC.md Section 21 defines the conceptual REST surface; route handlers belong here or in module owners.
 */
export function registerDashboardRoutes(_router: Router): Router {
  // TODO: Register dashboard/BFF routes without bypassing shared/db state transitions.
  throw new Error("TODO: registerDashboardRoutes is not implemented.");
}
