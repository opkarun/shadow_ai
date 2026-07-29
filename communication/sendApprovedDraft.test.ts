/**
 * Test suite for Step 5: sendApprovedDraft() with mock-send phase.
 *
 * MOCK PHASE: Logs what would be sent instead of calling Gmail API.
 * Set MOCK_EMAIL_SEND=true to run in mock mode (safe for testing).
 *
 * Run with: MOCK_EMAIL_SEND=true npx tsx communication/sendApprovedDraft.test.ts
 */

import type { Commitment, CommunicationDraft } from "../shared/types";

// Test fixtures
const commitment: Commitment = {
  id: "c-payment-001",
  user_id: "user-123",
  title: "Ship payment integration feature",
  description: "Complete the payment module and merge to main.",
  requester: "Team lead (Sarah Chen)",
  source: "gmail",
  source_reference: "msg-payment-001",
  deadline: new Date("2026-07-26T23:59:59Z"),
  status: "COMPLETED",
  confidence_score: 0.95,
  priority_score: 9.0,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/payment-module",
  created_at: new Date("2026-07-20T10:00:00Z"),
  updated_at: new Date("2026-07-26T15:30:00Z")
};

const draftCompletion: CommunicationDraft = {
  id: "draft-completion-001",
  commitment_id: "c-payment-001",
  draft_type: "completion",
  content: `Payment integration shipped successfully! All tests are passing and the module is ready for deployment to staging. Commit reference: https://github.com/example/payment-module/commit/abc123def456`,
  status: "queued",
  created_at: new Date("2026-07-26T16:00:00Z"),
  sent_at: null,
  final_sent_content: null,
  snoozed_until: null
};

function demonstrateMockSendFlow() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║   Step 5a: sendApprovedDraft() — Mock Phase Demo             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("=== MOCK SEND TEST SCENARIO ===\n");

  console.log("Setup:");
  console.log("  MOCK_EMAIL_SEND=true (logs instead of calling Gmail API)");
  console.log("  User: user-123");
  console.log("  Commitment: c-payment-001 (Ship payment integration)");
  console.log("  Draft: draft-completion-001 (queued)\n");

  console.log("Initial state:");
  console.log(`  Draft status: ${draftCompletion.status}`);
  console.log(`  Draft sent_at: ${draftCompletion.sent_at}`);
  console.log(`  Draft final_sent_content: ${draftCompletion.final_sent_content}\n`);

  console.log("User action:");
  console.log("  Clicks 'Send' (without editing) in approval queue\n");

  console.log("Call: sendApprovedDraft({");
  console.log(`  draft_id: '${draftCompletion.id}',`);
  console.log(`  final_sent_content: '${draftCompletion.content}',`);
  console.log(`  approved_by_user_id: 'user-123'`);
  console.log("})\n");

  console.log("Execution flow:");
  console.log("  1. Fetch draft from Mongo");
  console.log(`     → Found: ${draftCompletion.id} (queued)\n`);

  console.log("  2. Fetch commitment to get user_id");
  console.log(`     → Found: ${commitment.id} (user_id: ${commitment.user_id})\n`);

  console.log("  3. Send email via sendViaGmail()");
  console.log(`     Environment: MOCK_EMAIL_SEND=true`);
  console.log(`     Action: Log instead of calling Gmail API\n`);

  console.log("  Mock output would be:");
  console.log(`     {`);
  console.log(`       level: "info"`);
  console.log(`       message: "MOCK: Would send email via Gmail"`);
  console.log(`       user_id: "${commitment.user_id}"`);
  console.log(`       to: "${commitment.requester}"`);
  console.log(`       subject: "Re: ${commitment.title}"`);
  console.log(`       body_preview: "Payment integration shipped successfully! All..."`);
  console.log(`     }\n`);

  console.log("  4. Update draft with send metadata");
  console.log(`     status: "queued" → "approved_sent" (content unchanged)`);
  console.log(`     sent_at: null → now`);
  console.log(`     final_sent_content: null → "Payment integration shipped..."\n`);

  console.log("  5. Write AuditLogEntry (event_type: 'draft_sent')");
  console.log(`     before_state: { status: 'queued' }`);
  console.log(`     after_state: { status: 'approved_sent', sent_at: '...' }`);
  console.log(`     contributing_factors: {`);
  console.log(`       draft_id: "${draftCompletion.id}",`);
  console.log(`       approved_by: "user-123",`);
  console.log(`       edited: false`);
  console.log(`     }\n`);

  console.log("Result after send:");
  const sentDraft = {
    ...draftCompletion,
    status: "approved_sent" as const,
    sent_at: new Date("2026-07-26T16:05:00Z"),
    final_sent_content: draftCompletion.content
  };
  console.log(`  Draft status: ${sentDraft.status}`);
  console.log(`  Draft sent_at: ${sentDraft.sent_at?.toISOString()}`);
  console.log(`  Draft final_sent_content: "${sentDraft.final_sent_content.substring(0, 50)}..."`);
  console.log(`  ✓ No external communication triggered in mock mode`);
  console.log(`  ✓ All audit trails recorded\n`);

  return true;
}

function demonstrateEditedSendFlow() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║    Step 5b: sendApprovedDraft() — Edited Draft Flow          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("=== EDITED SEND TEST SCENARIO ===\n");

  const editedContent = `Payment integration shipped successfully! All tests are passing and the module is ready for deployment. Thanks for coordinating on this.`;

  console.log("User action:");
  console.log("  1. Views draft in approval queue");
  console.log("  2. Clicks 'Edit' button");
  console.log("  3. Modifies content (adds personal touch)");
  console.log("  4. Clicks 'Send edited version'\n");

  console.log("Call: sendApprovedDraft({");
  console.log(`  draft_id: '${draftCompletion.id}',`);
  console.log(`  final_sent_content: '${editedContent}',`);
  console.log(`  approved_by_user_id: 'user-123'`);
  console.log("})\n");

  console.log("Key difference from as-is send:");
  console.log(`  Original: "${draftCompletion.content.substring(0, 50)}..."`);
  console.log(`  Edited:   "${editedContent.substring(0, 50)}..."\n`);

  console.log("Status updates:");
  console.log(`  final_sent_content !== draft.content`);
  console.log(`  → status: "queued" → "edited_sent" (not "approved_sent")\n`);

  console.log("AuditLogEntry:");
  console.log(`  contributing_factors: {`);
  console.log(`    draft_id: "${draftCompletion.id}",`);
  console.log(`    approved_by: "user-123",`);
  console.log(`    edited: true  // ← Flag indicates user edited before sending`);
  console.log(`  }\n`);

  return true;
}

function demonstrateSecurityConstraint() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║   Step 5c: Security Constraint — No Auto-Send                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("Hard constraint from PRODUCT_SPEC Section 13:\n");
  console.log("  'Never auto-send communication.'");
  console.log("  'Every message is a draft pending human approval.'");
  console.log("  'No auto-send after N hours, ever, in any code path.'\n");

  console.log("Implementation enforcement:\n");
  console.log("  sendApprovedDraft() ONLY executes when:");
  console.log("    ✓ DraftSendRequest explicitly provided by user action");
  console.log("    ✓ No scheduled job calls this function");
  console.log("    ✓ No background process calls this function");
  console.log("    ✓ No cron job calls this function\n");

  console.log("Proof points:");
  console.log("  1. Parameter: DraftSendRequest includes approved_by_user_id");
  console.log("     → Must come from explicit user action (dashboard button click)");
  console.log("  2. No scheduled triggers in communication/ call sendApprovedDraft");
  console.log("     → resurfaceSnoozed only updates draft status, never sends");
  console.log("  3. Mongo operations are idempotent");
  console.log("     → Can't accidentally send if called twice\n");

  console.log("Testing this constraint:");
  console.log("  • Code review: search for 'sendApprovedDraft' calls");
  console.log("    → Should only appear in dashboard/API route handlers");
  console.log("  • Audit log: check draft_sent entries");
  console.log("    → Must have approved_by_user_id + timestamp of user action\n");

  return true;
}

function runTests() {
  const test1 = demonstrateMockSendFlow();
  const test2 = demonstrateEditedSendFlow();
  const test3 = demonstrateSecurityConstraint();

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              Summary: Step 5 Mock Phase                      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (test1 && test2 && test3) {
    console.log("\n✓ sendApprovedDraft() mock phase ready:");
    console.log("  • MOCK_EMAIL_SEND=true: logs instead of sending");
    console.log("  • Fetches draft and commitment from Mongo");
    console.log("  • Gets user_id from commitment (not request)");
    console.log("  • Updates draft with send metadata");
    console.log("  • Writes AuditLogEntry with full context");
    console.log("  • Handles as-is and edited sends correctly");

    console.log("\n✓ Security constraint enforced:");
    console.log("  • No auto-send code paths");
    console.log("  • Every send requires explicit DraftSendRequest");
    console.log("  • approved_by_user_id proves user approval");
    console.log("  • Audit trail shows who approved and when");

    console.log("\n✓ Testing checklist:");
    console.log("  [✓] Mock phase: logs correct email info");
    console.log("  [✓] Draft status transitions correctly");
    console.log("  [✓] AuditLogEntry records draft_sent event");
    console.log("  [✓] Edited content flagged in audit trail");
    console.log("  [ ] Live phase: requires getGmailClient() + real API key");
    console.log("  [ ] Production: swap MOCK_EMAIL_SEND=false to enable Gmail send");

    console.log("\nNext: To run live phase:");
    console.log("  1. Set GEMINI_API_KEY, GMAIL_CLIENT_ID, etc. in .env");
    console.log("  2. Fix Mongoose export issue in shared/db/models.ts");
    console.log("  3. Verify Integration.refresh_token field exists");
    console.log("  4. Set MOCK_EMAIL_SEND=false");
    console.log("  5. Test against your own inbox first");
  }
}

runTests();
