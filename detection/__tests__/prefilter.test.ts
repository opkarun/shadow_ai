import { prefilterMessage, NormalizedGmailMessage, resetPrefilterEngine } from "../prefilter";

describe("Prefilter", () => {
  // Reset the dedup cache before each test to ensure test isolation.
  beforeEach(() => {
    resetPrefilterEngine();
  });

  // ========================================================================
  // TEST FIXTURES
  // ========================================================================

  let messageIdCounter = 0;

  const createMessage = (overrides: Partial<NormalizedGmailMessage> = {}) => {
    messageIdCounter++;
    return {
      id: overrides.id || `msg_${messageIdCounter}`,
      thread_id: "thread_1",
      from: "colleague@example.com",
      to: ["user@example.com"],
      subject: "Test Subject",
      body: "Test Body",
      received_at: new Date(),
      ...overrides,
    };
  };

  // ========================================================================
  // AUTO-FAIL CHECKS: Trivial Acks
  // ========================================================================

  describe("auto-fail: trivial acks", () => {
    it("rejects very short ack messages", () => {
      const msg = createMessage({
        subject: "Re: Project",
        body: "ok",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("commitment");
    });

    it("rejects emoji-only acks (short message)", () => {
      // A message with only an emoji and a subject will have minimal content.
      // The subject "Re: Update" + emoji "👍" is borderline, but word count is 3.
      // This actually passes the prefilter and relies on LLM for final filtering.
      const msg = createMessage({
        subject: "Re:",
        body: "👍",
      });
      const result = prefilterMessage(msg);
      // Only 2 words, below threshold
      expect(result.passes_prefilter).toBe(false);
    });

    it("rejects 'thanks' acks", () => {
      const msg = createMessage({
        subject: "Re: Report",
        body: "thanks",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
    });

    it("rejects 'sounds good' acks", () => {
      const msg = createMessage({
        subject: "Re: Meeting",
        body: "sounds good",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
    });
  });

  // ========================================================================
  // AUTO-FAIL CHECKS: Automated Senders
  // ========================================================================

  describe("auto-fail: automated senders", () => {
    it("rejects messages from noreply@", () => {
      const msg = createMessage({
        from: "noreply@github.com",
        subject: "Can you review this PR?",
        body: "I will send the code",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("Sender is automated");
    });

    it("rejects messages from notifications@", () => {
      const msg = createMessage({
        from: "notifications@jira.atlassian.net",
        subject: "Can you fix this issue?",
        body: "Please update the code",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("Sender is automated");
    });

    it("rejects messages from bot@", () => {
      const msg = createMessage({
        from: "bot@slack.com",
        subject: "Can you merge the PR?",
        body: "I'll handle it",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("Sender is automated");
    });

    it("rejects messages from system@", () => {
      const msg = createMessage({
        from: "system@company.com",
        subject: "Please deploy to production",
        body: "I will do it asap",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("Sender is automated");
    });
  });

  // ========================================================================
  // AUTO-FAIL CHECKS: System Notifications
  // ========================================================================

  describe("auto-fail: system notifications", () => {
    it("rejects calendar reminders", () => {
      const msg = createMessage({
        subject: "Calendar reminder: Team sync",
        body: "You have a meeting in 5 minutes",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("System/integration notification");
    });

    it("rejects meeting digest emails", () => {
      const msg = createMessage({
        subject: "Meeting digest",
        body: "Here are your upcoming meetings",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("System/integration notification");
    });

    it("rejects 'joined the channel' notifications", () => {
      const msg = createMessage({
        subject: "John joined the conversation",
        body: "John has been added to the discussion",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("System/integration notification");
    });

    it("rejects 'user was removed' notifications", () => {
      const msg = createMessage({
        subject: "Alice was removed from the channel",
        body: "Alice has been removed",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
      expect(result.reason).toContain("System/integration notification");
    });
  });

  // ========================================================================
  // AUTO-FAIL CHECKS: Deduplication
  // ========================================================================

  describe("auto-fail: deduplication", () => {
    it("rejects the same message if processed twice", () => {
      const msg = createMessage({
        id: "unique_msg_1",
        subject: "Can you send the report by Friday?",
        body: "I will get it to you",
      });

      // First pass should succeed (has commitment signals).
      const firstResult = prefilterMessage(msg);
      expect(firstResult.passes_prefilter).toBe(true);

      // Second pass with same ID should fail (already processed).
      const secondResult = prefilterMessage(msg);
      expect(secondResult.passes_prefilter).toBe(false);
      expect(secondResult.reason).toContain("already processed");
    });

    it("allows different messages with different IDs", () => {
      const msg1 = createMessage({
        id: "msg_a",
        subject: "Can you send the report?",
        body: "I will do it",
      });

      const msg2 = createMessage({
        id: "msg_b",
        subject: "Can you review this?",
        body: "I'll check it",
      });

      const result1 = prefilterMessage(msg1);
      const result2 = prefilterMessage(msg2);

      expect(result1.passes_prefilter).toBe(true);
      expect(result2.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // SIGNAL DETECTION: Request Patterns
  // ========================================================================

  describe("signals: request patterns", () => {
    it("passes messages with 'can you'", () => {
      const msg = createMessage({
        subject: "Can you send the presentation?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'could you'", () => {
      const msg = createMessage({
        subject: "Could you review this code?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'would you'", () => {
      const msg = createMessage({
        subject: "Would you publish the docs?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'please'", () => {
      const msg = createMessage({
        subject: "Please submit the report by tomorrow",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // SIGNAL DETECTION: Promise Patterns
  // ========================================================================

  describe("signals: promise patterns", () => {
    it("passes messages with 'I'll'", () => {
      const msg = createMessage({
        subject: "Update",
        body: "I'll send it by Friday",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'I will'", () => {
      const msg = createMessage({
        subject: "Task",
        body: "I will complete it today",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'on it'", () => {
      const msg = createMessage({
        subject: "Help needed",
        body: "Don't worry, I'm on it",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'will do'", () => {
      const msg = createMessage({
        subject: "Request",
        body: "Sure, will do",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // SIGNAL DETECTION: Action Verbs
  // ========================================================================

  describe("signals: action verbs", () => {
    it("passes messages with 'send'", () => {
      const msg = createMessage({
        subject: "Documents",
        body: "I need you to send the contract",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'review'", () => {
      const msg = createMessage({
        subject: "Code review",
        body: "Please review the pull request",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'publish'", () => {
      const msg = createMessage({
        subject: "Documentation",
        body: "Can you publish the guide?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'deploy'", () => {
      const msg = createMessage({
        subject: "Release",
        body: "Let's deploy to production",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'fix'", () => {
      const msg = createMessage({
        subject: "Bug",
        body: "We need to fix this issue",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'merge'", () => {
      const msg = createMessage({
        subject: "PR",
        body: "Can you merge this branch?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // SIGNAL DETECTION: Deadline Language
  // ========================================================================

  describe("signals: deadline language", () => {
    it("passes messages with 'by Friday'", () => {
      const msg = createMessage({
        subject: "Report",
        body: "Please send the report by Friday",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'tomorrow'", () => {
      const msg = createMessage({
        subject: "Presentation",
        body: "I need the slides tomorrow",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'tonight'", () => {
      const msg = createMessage({
        subject: "Code",
        body: "Can you finish this tonight?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'EOD'", () => {
      const msg = createMessage({
        subject: "Update",
        body: "Please update the doc by EOD",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'end of day'", () => {
      const msg = createMessage({
        subject: "Report",
        body: "Submit by end of day",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with time patterns like '3pm'", () => {
      const msg = createMessage({
        subject: "Meeting",
        body: "Can you send it before 3pm?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with weekday names", () => {
      const msg = createMessage({
        subject: "Task",
        body: "I need this by Tuesday morning",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes messages with 'ASAP'", () => {
      const msg = createMessage({
        subject: "Urgent",
        body: "Please fix this ASAP",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // SIGNAL DETECTION: Imperative Structure
  // ========================================================================

  describe("signals: imperative structure", () => {
    it("passes direct commands starting with action verbs", () => {
      const msg = createMessage({
        subject: "Task",
        body: "Upload the presentation tonight please.",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes commands addressed to 'you'", () => {
      const msg = createMessage({
        subject: "Help",
        body: "You need to send the report by Friday.",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes commands with 'please'", () => {
      const msg = createMessage({
        subject: "Request",
        body: "Submit the form please.",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe("edge cases", () => {
    it("is case-insensitive for request patterns", () => {
      const msg = createMessage({
        subject: "CAN YOU REVIEW THIS?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("handles mixed-case action verbs", () => {
      const msg = createMessage({
        subject: "Task",
        body: "Please SEND the file",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("handles messages with extra whitespace", () => {
      const msg = createMessage({
        subject: "Can   you   send   this?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes when BOTH subject and body have signals", () => {
      const msg = createMessage({
        subject: "Can you review?",
        body: "Please look at this by Friday",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes when only subject has signals", () => {
      const msg = createMessage({
        subject: "Can you send the document?",
        body: "Thanks",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes when only body has signals", () => {
      const msg = createMessage({
        subject: "Update",
        body: "Can you review this code by Friday?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("handles empty body gracefully", () => {
      const msg = createMessage({
        subject: "Can you help?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });

    it("handles empty subject gracefully", () => {
      const msg = createMessage({
        subject: "",
        body: "Can you send the file?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // LOGICAL OR BEHAVIOR (Recall-Oriented)
  // ========================================================================

  describe("logical OR: recall-oriented filtering", () => {
    it("passes if ANY signal matches, even if message is ambiguous", () => {
      const msg = createMessage({
        subject: "Vague subject",
        body: "Maybe you could look at this code sometime? It would be great if you could send the results by Friday.",
      });
      const result = prefilterMessage(msg);
      // Should pass because it has "send" + "by Friday" even though the rest is vague.
      expect(result.passes_prefilter).toBe(true);
    });

    it("passes if the message has just one strong signal", () => {
      const msg = createMessage({
        subject: "Thoughts?",
        body: "What do you think about this proposal? I need it by tomorrow.",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // REJECTION CASES: Messages with no commitment signals
  // ========================================================================

  describe("rejection: no commitment signals", () => {
    it("rejects purely informational messages without action words", () => {
      // Messages that don't contain any commitment-adjacent words
      const msg = createMessage({
        subject: "FYI: Project status",
        body: "The project is progressing well. We're on track.",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
    });

    it("rejects rhetorical questions", () => {
      const msg = createMessage({
        subject: "Question",
        body: "What do you think about our new design?",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
    });

    it("rejects pure discussion/brainstorm", () => {
      const msg = createMessage({
        subject: "Ideas",
        body: "Here are some thoughts on the architecture. Let's discuss.",
      });
      const result = prefilterMessage(msg);
      expect(result.passes_prefilter).toBe(false);
    });

    it("passes meeting scheduling with dates (recall-biased for LLM scoring)", () => {
      // Note: Prefilter is recall-biased. A message mentioning a future date has
      // a chance of containing a commitment, even without explicit request language.
      // Let it through to the LLM; the LLM will score it low if there's no real commitment.
      const msg = createMessage({
        subject: "Team meeting next Thursday at 2pm",
        body: "Join the team sync to discuss the roadmap.",
      });
      const result = prefilterMessage(msg);
      // Contains deadline language ("next Thursday"), so it passes (recall-biased)
      expect(result.passes_prefilter).toBe(true);
    });
  });

  // ========================================================================
  // ERROR HANDLING: Fail Open
  // ========================================================================

  describe("error handling: fail open", () => {
    it("returns the message unchanged in all results", () => {
      const msg = createMessage({
        subject: "Can you send the file?",
        body: "",
      });
      const result = prefilterMessage(msg);
      expect(result.message).toEqual(msg);
    });

    it("preserves message ID in results", () => {
      const msg = createMessage({
        id: "test_msg_123",
        subject: "Test",
        body: "Can you help?",
      });
      const result = prefilterMessage(msg);
      expect(result.message.id).toBe("test_msg_123");
    });
  });
});
