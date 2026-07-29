/**
 * Test setup for Verification module tests
 * Mocks database operations, Gemini API, state machine, and MongoDB connection
 */

import { vi } from "vitest";

// Mock MongoDB connection
vi.mock("../../shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

// Mock database models and state machine
vi.mock("../../shared/db/models", () => ({
  CommitmentModel: {
    findOne: vi.fn().mockImplementation((filter: any) => ({
      lean: vi.fn().mockResolvedValue({
        id: filter?.id || "commit_1",
        user_id: "user_1",
        title: "Test commitment",
        description: "Test",
        requester: "test@example.com",
        source: "github",
        source_reference: "ref_1",
        status: "PENDING",
        confidence_score: 0.85,
        priority_score: 4,
        verification_method: "github_commit",
        linked_repo: "test/repo",
        created_at: new Date(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      }),
    })),
    findOneAndUpdate: vi.fn().mockImplementation((filter: any, update: any) => ({
      exec: vi.fn().mockResolvedValue({
        id: filter?.id || "commit_1",
        user_id: "user_1",
        title: "Test commitment",
        description: "Test",
        requester: "test@example.com",
        source: "github",
        source_reference: "ref_1",
        status: update?.$set?.status || "PENDING",
        confidence_score: 0.85,
        priority_score: 4,
        verification_method: "github_commit",
        linked_repo: "test/repo",
        created_at: new Date(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      }),
    })),
  },
  AuditLogEntryModel: {
    create: vi.fn().mockImplementation((data: any) =>
      Promise.resolve({ id: "audit_1", ...data })
    ),
  },
}));

vi.mock("../../shared/db/stateMachine", () => ({
  transitionCommitmentStatus: vi
    .fn()
    .mockImplementation(
      async (commitmentId: string, nextStatus: string) => ({
        id: commitmentId,
        user_id: "user_1",
        title: "Test commitment",
        description: "Test",
        requester: "test@example.com",
        source: "github",
        source_reference: "ref_1",
        status: nextStatus,
        confidence_score: 0.85,
        priority_score: 4,
        verification_method: "github_commit",
        linked_repo: "test/repo",
        created_at: new Date(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      })
    ),
  commitmentStatusTransitions: {
    DETECTED: ["CONFIRMED", "DISMISSED"],
    CONFIRMED: ["PENDING"],
    PENDING: ["AT_RISK", "OVERDUE", "COMPLETED"],
    AT_RISK: ["OVERDUE", "COMPLETED"],
    OVERDUE: ["RECOVERED", "COMPLETED"],
    RECOVERED: ["PENDING", "COMPLETED"],
    COMPLETED: ["ARCHIVED"],
    ARCHIVED: [],
    DISMISSED: [],
  },
}));

// Mock Gemini integration
vi.mock("../geminiIntegration", () => ({
  analyzeEvidenceRelevance: vi.fn().mockResolvedValue({
    is_relevant: true,
    confidence_score: 0.85,
    reasoning: "Strong match based on keywords and repository",
    key_signals: ["commit message matches task", "repository matches"],
    concerns: [],
  }),
  detectCommitmentRisk: vi.fn().mockResolvedValue({
    risk_score: 0.45,
    is_at_risk: false,
    contributing_factors: {
      time_pressure: "Deadline in 7 days",
      evidence_status: "No evidence yet",
      activity_signals: "No recent commits",
      context_clues: "Standard priority",
    },
    recommendation: "Monitor progress",
  }),
  extractGitHubContext: vi.fn().mockResolvedValue({
    commits: [
      {
        sha: "abc123",
        message: "Implement feature",
        author: "user@example.com",
        date: "2026-07-29",
        key_keywords: ["implement", "feature"],
      },
    ],
    pull_requests: [],
    releases: [],
  }),
}));

// Mock logging
vi.mock("../../shared/utils", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
