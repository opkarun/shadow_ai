import type { Commitment } from "../shared/types";

export interface DashboardState {
  commitments: Commitment[];
}

/**
 * Inputs: commitment data returned by dashboard/BFF routes.
 * Output: Zustand-backed dashboard state.
 *
 * PRODUCT_SPEC.md Section 22 requires filters and grouped views once dashboard logic is implemented.
 */
export function createDashboardStore(): DashboardState {
  // TODO: Initialize Zustand store when dashboard implementation begins.
  throw new Error("TODO: createDashboardStore is not implemented.");
}
