/**
 * Prompts for Gemini extraction and scoring.
 * These define how the LLM should interpret and structure its responses.
 */

/**
 * System prompt for commitment extraction.
 * Guides Gemini to identify and extract commitments from email messages.
 */
export function buildExtractionSystemPrompt(): string {
  return `You are an expert at identifying and extracting commitments from email messages.

A commitment is a promise someone has made to do something by a certain time.

For each email message provided, extract ALL commitments you can identify.

Return a JSON object with this structure:
{
  "commitments": [
    {
      "owner": "Name of the person making the commitment",
      "task": "Specific deliverable or action (be concrete)",
      "deadline": "ISO 8601 date (YYYY-MM-DD) or null if unspecified",
      "priority": 3,
      "confidenceReasoning": "Why you're confident this is a real commitment",
      "source": "gmail",
      "description": "Full context and details of the commitment",
      "verificationMethod": "how to verify (github_commit, github_pr, manual, calendar_attendance)",
      "linkedRepo": "GitHub repo name if applicable (optional)"
    }
  ]
}

Priority scale (1-5):
- 1: Low priority, vague or optional
- 2: Below average, somewhat vague
- 3: Medium priority, clear but not urgent
- 4: High priority, urgent or from important requester
- 5: Critical, explicit deadline + clear requester + high importance

Confidence reasoning should explain:
- Presence of explicit deadline
- Clarity of the requester
- Specificity of the deliverable
- Explicit acceptance language

Include commitments even if some fields are uncertain:
- If deadline is unclear, set to null and explain in confidenceReasoning
- If sender is unclear, infer from context
- If task is vague, extract what you can and note the ambiguity

Return ONLY valid JSON, no extra text.`;
}

/**
 * Build the user prompt for extraction.
 * Formats the email messages for Gemini to process.
 */
export function buildExtractionUserPrompt(
  messages: Array<{ from: string; subject: string; body: string }>
): string {
  const formattedMessages = messages
    .map(
      (msg, idx) =>
        `Message ${idx + 1}:
From: ${msg.from}
Subject: ${msg.subject}
Body: ${msg.body}`
    )
    .join("\n\n---\n\n");

  return `Extract commitments from these email messages:

${formattedMessages}

Return JSON with extracted commitments.`;
}

/**
 * System prompt for confidence scoring.
 * Guides Gemini to assess how confident we should be in a commitment.
 */
export function buildScoringSystemPrompt(): string {
  return `You are an expert at assessing the confidence that a piece of text represents a real, actionable commitment.

For each candidate commitment provided, score its confidence on a 0-1 scale and assign a tier.

Return a JSON object with this structure:
{
  "confidence_score": 0.85,
  "confidence_tier": "HIGH",
  "factors": {
    "deadline_present": true,
    "deadline_specificity": "Explicit day and time",
    "requester_clarity": "Direct and clear",
    "action_verb_strength": "Strong (send, publish, deploy)",
    "deliverable_clarity": "Specific and measurable",
    "acceptance_language": "Explicit acceptance ('I will')",
    "ambiguity": "Low - all signals present",
    "weaknesses": []
  }
}

Confidence tiers:
- HIGH (>= 0.75): Strong deadline + clear requester + clear action + explicit acceptance
- MEDIUM (0.4-0.75): Some signals present, some missing or ambiguous
- LOW (< 0.4): Vague, no clear deadline, or no clear deliverable

Scoring factors:
- Explicit deadline (20%): By Friday, tonight, 3pm, etc.
- Clear requester (20%): Named sender, not automated/bulk
- Clear action verb (20%): send, review, publish, deploy, fix, merge, etc.
- Explicit acceptance (20%): "I'll", "I will", "on it", "will do"
- Direct addressing (10%): Message sent to user, not broadcast
- Penalties (10%): Vagueness, sarcasm, rhetorical tone

Return ONLY valid JSON, no extra text.`;
}

/**
 * Build the user prompt for scoring.
 * Formats a commitment candidate for Gemini to evaluate.
 */
export function buildScoringUserPrompt(commitmentText: string): string {
  return `Score the confidence of this commitment:

${commitmentText}

Return JSON with confidence score, tier, and reasoning.`;
}
