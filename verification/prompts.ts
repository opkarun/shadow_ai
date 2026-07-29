/**
 * Prompts for Gemini evidence analysis and verification.
 * These define how the LLM should analyze whether specific evidence supports a commitment.
 */

import type { Commitment, Evidence, EvidenceType } from "../shared/types";

/**
 * System prompt for evidence relevance analysis.
 * Guides Gemini to assess if a piece of evidence (commit, PR, calendar event) relates to a commitment.
 */
export function buildEvidenceAnalysisSystemPrompt(): string {
  return `You are an expert at determining whether specific evidence (GitHub commits, pull requests, releases, calendar events) proves that a commitment has been completed.

For each evidence item and commitment pair provided, analyze whether the evidence actually supports the claim that the commitment was fulfilled.

Return a JSON object with this structure:
{
  "is_relevant": true,
  "confidence_score": 0.85,
  "reasoning": "Detailed explanation of the relevance assessment",
  "key_signals": ["signal 1", "signal 2"],
  "concerns": []
}

Confidence scoring guidance:
- HIGH (0.75+): Strong evidence that clearly matches the commitment
  - Exact repo match + specific keyword match in commit/PR title
  - Calendar event title explicitly mentions the commitment task
  - Release description directly references the deliverable
- MEDIUM (0.5-0.75): Evidence appears related but with some ambiguity
  - Repo matches but keyword match is indirect
  - Commit message mentions related task but not explicitly
  - Calendar event timing aligns but title is generic
- LOW (< 0.5): Weak or questionable relevance
  - Generic commits (refactor, update docs) without clear link
  - Calendar event in the right repo but no clear task match
  - Possible false positive that needs user confirmation

Key matching strategies:
1. For commits/PRs: Match the commit message or PR title against the commitment task keywords
2. For releases: Check if the release description or version notes mention the commitment deliverable
3. For calendar events: Match the event title against the commitment task and check timing
4. Penalize generic changes (e.g., "fix", "update") without task-specific context
5. Reward explicit linking (commit message includes commitment ID or very specific task name)

Return ONLY valid JSON, no extra text.`;
}

/**
 * Build the user prompt for evidence analysis.
 * Formats commitment and evidence for Gemini to evaluate relevance.
 */
export function buildEvidenceAnalysisUserPrompt(
  commitment: Commitment,
  evidence: Evidence,
  additionalContext?: {
    commitMessage?: string;
    prTitle?: string;
    prDescription?: string;
    releaseNotes?: string;
    calendarTitle?: string;
    calendarDescription?: string;
  }
): string {
  let prompt = `Analyze whether this evidence supports the following commitment:

COMMITMENT:
- ID: ${commitment.id}
- Title: ${commitment.title}
- Description: ${commitment.description}
- Deadline: ${commitment.deadline ? commitment.deadline.toISOString().split("T")[0] : "No deadline specified"}
- Verification Method: ${commitment.verification_method}
- Linked Repository: ${commitment.linked_repo || "None"}

EVIDENCE:
- Type: ${evidence.evidence_type}
- Reference: ${evidence.evidence_reference}
- Detected At: ${evidence.detected_at.toISOString().split("T")[0]}`;

  if (additionalContext) {
    if (additionalContext.commitMessage) {
      prompt += `\n- Commit Message: ${additionalContext.commitMessage}`;
    }
    if (additionalContext.prTitle || additionalContext.prDescription) {
      prompt += `\n- PR Title: ${additionalContext.prTitle || "N/A"}`;
      prompt += `\n- PR Description: ${additionalContext.prDescription || "N/A"}`;
    }
    if (additionalContext.releaseNotes) {
      prompt += `\n- Release Notes: ${additionalContext.releaseNotes}`;
    }
    if (additionalContext.calendarTitle || additionalContext.calendarDescription) {
      prompt += `\n- Calendar Event Title: ${additionalContext.calendarTitle || "N/A"}`;
      prompt += `\n- Calendar Description: ${additionalContext.calendarDescription || "N/A"}`;
    }
  }

  prompt += `

Determine if this evidence proves the commitment was completed.
Return JSON with confidence score, relevance assessment, and reasoning.`;

  return prompt;
}

/**
 * System prompt for risk detection analysis.
 * Guides Gemini to help assess whether a commitment is at risk based on available evidence and activity.
 */
export function buildRiskDetectionSystemPrompt(): string {
  return `You are an expert at assessing commitment risk based on time remaining, evidence collected, and activity patterns.

For each commitment provided, analyze the risk that it will not be completed by the deadline.

Return a JSON object with this structure:
{
  "risk_score": 0.75,
  "is_at_risk": true,
  "contributing_factors": {
    "time_pressure": "Deadline in 2 days with no evidence yet",
    "evidence_status": "No completion evidence found",
    "activity_signals": "No recent commits in linked repository",
    "context_clues": "High-priority commitment from manager"
  },
  "recommendation": "Proactively offer deadline extension or risk escalation"
}

Risk scoring guidance:
- Score 0.0-0.33: Low risk - Good progress, evidence found, or deadline far away
- Score 0.33-0.66: Medium risk - Some time pressure, minimal evidence, but still in reasonable window
- Score 0.66-1.0: High risk - Deadline imminent, no evidence, or activity has stalled

Factors that increase risk:
- Significant proportion of time elapsed with minimal evidence
- Deadline approaching (< 24-48 hours remaining) with no signals
- Linked repository shows no activity as deadline nears
- Previous evidence of delays on similar commitments

Factors that decrease risk:
- Strong evidence of progress (recent commits, PR activity)
- Significant time remaining
- Task is simple/low-effort
- Evidence of active work in progress

Return ONLY valid JSON, no extra text.`;
}

/**
 * Build the user prompt for risk detection analysis.
 * Formats commitment and evidence context for Gemini to assess risk.
 */
export function buildRiskDetectionUserPrompt(
  commitment: Commitment,
  evidenceCount: number,
  timeDaysRemaining: number,
  totalTaskDaysEstimate: number,
  recentGitHubActivity: {
    lastCommitDaysAgo: number | null;
    lastPRDaysAgo: number | null;
    isLinkedRepo: boolean;
  },
  userContext?: {
    onTimeCompletionRate?: number;
    requesterImportance?: string;
  }
): string {
  let prompt = `Assess the risk level for this commitment:

COMMITMENT:
- ID: ${commitment.id}
- Title: ${commitment.title}
- Status: ${commitment.status}
- Deadline: ${commitment.deadline ? commitment.deadline.toISOString().split("T")[0] : "No deadline"}
- Verification Method: ${commitment.verification_method}
- Linked Repository: ${commitment.linked_repo || "None"}

PROGRESS:
- Evidence Found: ${evidenceCount} pieces
- Time Remaining: ${timeDaysRemaining} days
- Original Estimate: ${totalTaskDaysEstimate} days
- Time Elapsed: ${totalTaskDaysEstimate - timeDaysRemaining} days (${Math.round(((totalTaskDaysEstimate - timeDaysRemaining) / totalTaskDaysEstimate) * 100)}%)`;

  if (recentGitHubActivity.isLinkedRepo) {
    prompt += `\n- Last Commit: ${recentGitHubActivity.lastCommitDaysAgo !== null ? `${recentGitHubActivity.lastCommitDaysAgo} days ago` : "No commits yet"}`;
    prompt += `\n- Last PR: ${recentGitHubActivity.lastPRDaysAgo !== null ? `${recentGitHubActivity.lastPRDaysAgo} days ago` : "No PRs yet"}`;
  }

  if (userContext) {
    if (userContext.onTimeCompletionRate !== undefined) {
      prompt += `\n- Historical On-Time Rate: ${Math.round(userContext.onTimeCompletionRate * 100)}%`;
    }
    if (userContext.requesterImportance) {
      prompt += `\n- Requester Priority: ${userContext.requesterImportance}`;
    }
  }

  prompt += `

Assess the risk that this commitment will NOT be completed by the deadline.
Return JSON with risk score, contributing factors, and recommendation.`;

  return prompt;
}

/**
 * System prompt for GitHub search/context analysis.
 * Guides Gemini to help extract and understand GitHub commit/PR information.
 */
export function buildGitHubContextSystemPrompt(): string {
  return `You are an expert at extracting meaningful information from GitHub commits, pull requests, and releases.

When provided with GitHub metadata (commits, PRs, releases), extract the key information relevant to commitment verification.

Return a JSON object with this structure:
{
  "commits": [
    {
      "sha": "abc123...",
      "message": "Full commit message",
      "author": "Author Name",
      "date": "2024-01-15",
      "key_keywords": ["keyword1", "keyword2"]
    }
  ],
  "pull_requests": [
    {
      "number": 42,
      "title": "PR Title",
      "description": "Full description",
      "merged": true,
      "merged_at": "2024-01-15",
      "key_keywords": ["keyword1", "keyword2"]
    }
  ],
  "releases": [
    {
      "tag": "v1.0.0",
      "name": "Release name",
      "description": "Release notes",
      "published_at": "2024-01-15",
      "key_keywords": ["keyword1", "keyword2"]
    }
  ]
}

For each item, extract the key keywords that indicate what work was done.
Focus on action verbs (fix, implement, add, remove) and deliverable names.

Return ONLY valid JSON, no extra text.`;
}

/**
 * Build the user prompt for GitHub context analysis.
 * Formats raw GitHub data for Gemini to extract relevant information.
 */
export function buildGitHubContextUserPrompt(
  githubData: string
): string {
  return `Extract and analyze the following GitHub data:

${githubData}

Return JSON with commits, pull requests, and releases with their key information.`;
}
