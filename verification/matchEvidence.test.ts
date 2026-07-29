import { describe, it, expect } from "vitest";
import { matchEvidence } from "./matchEvidence.js";
import type { Commitment, Evidence } from "../shared/types/index.js";

// Test helper: create a commitment with defaults
function createCommitment(overrides: Partial<Commitment> = {}): Commitment {
  const now = new Date();
  return {
    id: "commit-1",
    user_id: "user-1",
    title: "Fix the login bug",
    description: "The authentication flow is broken in the mobile app",
    requester: "alice@example.com",
    source: "gmail",
    source_reference: "msg-123",
    deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    confidence_score: 0.9,
    priority_score: 0.7,
    verification_method: "github",
    linked_repo: "myorg/mobile-app",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("matchEvidence", () => {
  describe("GitHub commits", () => {
    it("should match commit with keyword in message and correct repo", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123def456",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              sha: "abc123def456",
              message: "Fix the login bug in mobile app authentication",
              author: { name: "Bob" },
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0]).toMatchObject({
        commitment_id: "commit-1",
        evidence_type: "github_commit",
        evidence_reference: "abc123def456",
      });
      expect(evidence[0].match_confidence).toBeGreaterThan(0.5);
    });

    it("should not match commit without keyword match", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123def456",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              sha: "abc123def456",
              message: "Update dependencies to latest versions",
              author: { name: "Bob" },
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      // No keyword match, so no evidence
      expect(evidence).toHaveLength(0);
    });

    it("should not match commit from wrong repository", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123def456",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "other-org",
            name: "other-repo",
          },
          commits: [
            {
              sha: "abc123def456",
              message: "Fix the login bug",
              author: { name: "Bob" },
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });

    it("should not match commits if commitment has no linked repo", () => {
      const commitment = createCommitment({ linked_repo: null });
      const event = {
        provider: "github" as const,
        reference: "abc123def456",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              sha: "abc123def456",
              message: "Fix the login bug",
              author: { name: "Bob" },
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });

    it("should handle nested owner structure", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123def456",
        received_at: new Date(),
        payload: {
          repository: {
            owner: { login: "myorg" },
            name: "mobile-app",
          },
          commits: [
            {
              sha: "abc123def456",
              message: "Fix the login bug",
              author: { name: "Bob" },
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].match_confidence).toBeGreaterThan(0.5);
    });
  });

  describe("GitHub pull requests", () => {
    it("should match PR with keyword in title and correct repo", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "https://github.com/myorg/mobile-app/pull/42",
        received_at: new Date(),
        payload: {
          action: "opened",
          pull_request: {
            number: 42,
            title: "Fix the login bug in authentication",
            body: "This PR addresses the authentication flow issue",
          },
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].evidence_type).toBe("github_pr");
      expect(evidence[0].match_confidence).toBeGreaterThan(0.5);
    });

    it("should not match PR without keyword", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "https://github.com/myorg/mobile-app/pull/42",
        received_at: new Date(),
        payload: {
          action: "opened",
          pull_request: {
            number: 42,
            title: "Update package dependencies",
            body: "Updating to latest versions",
          },
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });
  });

  describe("GitHub releases", () => {
    it("should match release with keyword", () => {
      const commitment = createCommitment({
        title: "Ship v1.5.0 release",
      });
      const event = {
        provider: "github" as const,
        reference: "v1.5.0",
        received_at: new Date(),
        payload: {
          action: "published",
          release: {
            tag_name: "v1.5.0",
            name: "v1.5.0 - Bug fixes and features",
            body: "This release ships the login bug fix and other improvements",
          },
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].evidence_type).toBe("github_release");
    });

    it("should not match release without event type marker", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "v1.5.0",
        received_at: new Date(),
        payload: {
          release: {
            tag_name: "v1.5.0",
            name: "v1.5.0",
            body: "Release notes",
          },
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
        },
      };

      const evidence = matchEvidence(commitment, event);

      // Missing action: "published" marker
      expect(evidence).toHaveLength(0);
    });
  });

  describe("Calendar events", () => {
    it("should match calendar event with matching title", () => {
      const commitment = createCommitment({
        verification_method: "calendar_attendance",
        title: "Team standup meeting",
      });
      const event = {
        provider: "google_calendar" as const,
        reference: "event-456",
        received_at: new Date(),
        payload: {
          title: "Team standup meeting",
          description: "Daily sync",
          start: "2026-07-30T09:00:00Z",
          end: "2026-07-30T09:30:00Z",
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].evidence_type).toBe("calendar_attendance");
      expect(evidence[0].match_confidence).toBeGreaterThan(0.7);
    });

    it("should match calendar event with matching requester in description", () => {
      const commitment = createCommitment({
        verification_method: "calendar_attendance",
        title: "Client meeting",
        requester: "alice",
      });
      const event = {
        provider: "google_calendar" as const,
        reference: "event-789",
        received_at: new Date(),
        payload: {
          title: "Important client meeting",
          description: "Meeting with alice and her team",
          start: "2026-07-30T14:00:00Z",
          end: "2026-07-30T15:00:00Z",
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].match_confidence).toBeGreaterThan(0.4);
    });

    it("should not match calendar event if verification method is not calendar", () => {
      const commitment = createCommitment({
        verification_method: "github",
        title: "Team standup meeting",
      });
      const event = {
        provider: "google_calendar" as const,
        reference: "event-456",
        received_at: new Date(),
        payload: {
          title: "Team standup meeting",
          description: "Daily sync",
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });

    it("should not match calendar event without meaningful content match", () => {
      const commitment = createCommitment({
        verification_method: "calendar_attendance",
        title: "Very specific meeting name",
      });
      const event = {
        provider: "google_calendar" as const,
        reference: "event-999",
        received_at: new Date(),
        payload: {
          title: "Random meeting",
          description: "Some other event",
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });
  });

  describe("Manual evidence", () => {
    it("should match manual confirmation with perfect confidence", () => {
      const commitment = createCommitment();
      const event = {
        provider: "manual" as const,
        reference: "user-confirmation-123",
        received_at: new Date(),
        payload: { confirmed: true },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].evidence_type).toBe("manual");
      expect(evidence[0].match_confidence).toBe(1.0);
    });
  });

  describe("Evidence structure", () => {
    it("should create evidence with all required fields", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date("2026-07-30T10:00:00Z"),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login bug",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      const e = evidence[0];

      expect(e).toHaveProperty("id");
      expect(typeof e.id).toBe("string");
      expect(e.id).toContain("evidence-");

      expect(e.commitment_id).toBe("commit-1");
      expect(e.evidence_type).toBe("github_commit");
      expect(e.evidence_reference).toBe("abc123");
      expect(typeof e.match_confidence).toBe("number");
      expect(e.match_confidence).toBeGreaterThanOrEqual(0);
      expect(e.match_confidence).toBeLessThanOrEqual(1);
      expect(e.detected_at).toEqual(event.received_at);
    });
  });

  describe("Repository matching", () => {
    it("should handle full GitHub URL format", () => {
      const commitment = createCommitment({
        linked_repo: "https://github.com/myorg/mobile-app",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login bug",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
    });

    it("should handle git+ssh URL format", () => {
      const commitment = createCommitment({
        linked_repo: "git@github.com:myorg/mobile-app.git",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login bug",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
    });

    it("should handle case-insensitive repo matching", () => {
      const commitment = createCommitment({
        linked_repo: "MyOrg/Mobile-App",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login bug",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
    });
  });

  describe("Keyword matching", () => {
    it("should score high when all keywords match", () => {
      const commitment = createCommitment({
        title: "Fix login authentication",
        description: "The authentication flow",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login and authentication flow in mobile app",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      // Should have high confidence due to keyword matches
      expect(evidence[0].match_confidence).toBeGreaterThan(0.6);
    });

    it("should score lower when only some keywords match", () => {
      const commitment = createCommitment({
        title: "Fix login and security issues",
        description: "The authentication and encryption flow",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login bug",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(1);
      // Should have medium confidence (some matches)
      expect(evidence[0].match_confidence).toBeGreaterThan(0.4);
      expect(evidence[0].match_confidence).toBeLessThan(0.8);
    });

    it("should filter out stop words from keyword matching", () => {
      const commitment = createCommitment({
        title: "The quick brown fox",
        description: "A very long and detailed description",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message:
                "Update the quick fox feature with long and detailed changes",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      // Should match on substantial keywords (quick, fox, etc.)
      // not on stop words (the, a, and, etc.)
      expect(evidence).toHaveLength(1);
      expect(evidence[0].match_confidence).toBeGreaterThan(0.4);
    });
  });

  describe("Confidence thresholds", () => {
    it("should return empty array if match confidence below threshold", () => {
      const commitment = createCommitment({
        title: "Very specific unique requirement",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Minor style update",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      // No keywords matched: confidence too low
      expect(evidence).toHaveLength(0);
    });

    it("should return evidence if match confidence meets minimum threshold", () => {
      const commitment = createCommitment({
        title: "Login fix and update",
      });
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [
            {
              message: "Fix the login issue",
            },
          ],
        },
      };

      const evidence = matchEvidence(commitment, event);

      // Login is a keyword match: should have minimum threshold
      expect(evidence).toHaveLength(1);
      expect(evidence[0].match_confidence).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty commit array", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [],
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });

    it("should handle missing commit message", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          repository: {
            owner: "myorg",
            name: "mobile-app",
          },
          commits: [{ sha: "abc123" }],
        },
      };

      const evidence = matchEvidence(commitment, event);

      // Empty message: no keywords to match
      expect(evidence).toHaveLength(0);
    });

    it("should handle unknown provider gracefully", () => {
      const commitment = createCommitment();
      const event = {
        provider: "unknown" as any,
        reference: "abc123",
        received_at: new Date(),
        payload: {},
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });

    it("should handle malformed GitHub event", () => {
      const commitment = createCommitment();
      const event = {
        provider: "github" as const,
        reference: "abc123",
        received_at: new Date(),
        payload: {
          // Missing repository and commits
          random_field: "value",
        },
      };

      const evidence = matchEvidence(commitment, event);

      expect(evidence).toHaveLength(0);
    });
  });
});
