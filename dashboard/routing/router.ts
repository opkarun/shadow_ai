/**
 * Dashboard Router
 *
 * Simple client-side routing for the dashboard.
 * Manages current page and navigation state.
 */

import { create } from "zustand";

export type PageName =
  | "dashboard"
  | "commitments"
  | "commitment-detail"
  | "approval-queue"
  | "confirmations"
  | "notifications"
  | "history"
  | "analytics"
  | "settings"
  | "settings-integrations"
  | "settings-stakeholders"
  | "settings-preferences"
  | "oauth-success"
  | "oauth-error";

export interface RouterState {
  currentPage: PageName;
  selectedCommitmentId: string | null;
  searchQuery: string;

  navigate: (page: PageName, commitmentId?: string) => void;
  goBack: () => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  currentPage: "dashboard" as PageName,
  selectedCommitmentId: null,
  searchQuery: "",
};

export const useRouter = create<RouterState>((set, get) => ({
  ...INITIAL_STATE,

  navigate: (page: PageName, commitmentId?: string) => {
    set({
      currentPage: page,
      selectedCommitmentId: commitmentId || null,
      searchQuery: "",
    });
  },

  goBack: () => {
    const state = get();
    if (state.selectedCommitmentId) {
      set({ selectedCommitmentId: null });
    } else {
      set({ currentPage: "dashboard" });
    }
  },

  setSearchQuery: (searchQuery: string) => {
    set({ searchQuery });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));

/**
 * Helper hook to check current page
 */
export function useCurrentPage(): PageName {
  return useRouter((state) => state.currentPage);
}

/**
 * Helper hook to navigate
 */
export function useNavigate(): (page: PageName, commitmentId?: string) => void {
  return useRouter((state) => state.navigate);
}
