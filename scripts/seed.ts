import { connectMongo, disconnectMongo } from "../shared/db/connect";
import {
  CommitmentModel,
  EvidenceModel,
  CommunicationDraftModel,
  AuditLogEntryModel,
  IntegrationModel,
} from "../shared/db/models";

const MOCK_USER_ID = "user_demo_001";

async function seed() {
  try {
    console.log("🌱 Seeding database...");
    await connectMongo();

    // Clear existing data
    await CommitmentModel.deleteMany({ user_id: MOCK_USER_ID });
    await EvidenceModel.deleteMany({});
    await CommunicationDraftModel.deleteMany({});
    await AuditLogEntryModel.deleteMany({});

    // Create sample commitments
    const commitments = [
      {
        id: "commit_001",
        user_id: MOCK_USER_ID,
        title: "Implement user authentication system",
        description: "Need to add JWT-based authentication to the API with refresh tokens",
        requester: "alice@example.com",
        source: "gmail",
        source_reference: "msg_123",
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        confidence_score: 0.92,
        priority_score: 5,
        verification_method: "github_commit",
        linked_repo: "myorg/myapp",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        id: "commit_002",
        user_id: MOCK_USER_ID,
        title: "Review pull request for database optimization",
        description: "Please review the PR #234 for database query optimization",
        requester: "bob@example.com",
        source: "github",
        source_reference: "issue_456",
        deadline: new Date(Date.now() + 5 * 60 * 60 * 1000),
        status: "OVERDUE",
        confidence_score: 0.85,
        priority_score: 4,
        verification_method: "github_pr",
        linked_repo: "myorg/myapp",
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: "commit_003",
        user_id: MOCK_USER_ID,
        title: "Deploy to production",
        description: "Deploy the latest release to production environment",
        requester: "charlie@example.com",
        source: "gmail",
        source_reference: "msg_789",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        confidence_score: 0.78,
        priority_score: 3,
        verification_method: "calendar_attendance",
        linked_repo: null,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      },
      {
        id: "commit_004",
        user_id: MOCK_USER_ID,
        title: "Send meeting notes to stakeholders",
        description: "Compile and distribute meeting minutes from Q3 planning session",
        requester: "diana@example.com",
        source: "gmail",
        source_reference: "msg_101",
        deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
        confidence_score: 0.88,
        priority_score: 2,
        verification_method: "manual",
        linked_repo: null,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: "commit_005",
        user_id: MOCK_USER_ID,
        title: "Complete documentation update",
        description: "Update API documentation with new endpoints",
        requester: "eve@example.com",
        source: "github",
        source_reference: "issue_222",
        deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
        confidence_score: 0.81,
        priority_score: 2,
        verification_method: "github_commit",
        linked_repo: "myorg/docs",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    await CommitmentModel.insertMany(commitments);
    console.log(`✓ Created ${commitments.length} commitments`);

    // Create sample evidence
    const evidence = [
      {
        id: "evid_001",
        commitment_id: "commit_001",
        evidence_type: "github_commit" as const,
        evidence_reference: "abc123def456",
        match_confidence: 0.95,
        detected_at: new Date(),
      },
      {
        id: "evid_002",
        commitment_id: "commit_004",
        evidence_type: "calendar_attendance" as const,
        evidence_reference: "event_789",
        match_confidence: 0.88,
        detected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    await EvidenceModel.insertMany(evidence);
    console.log(`✓ Created ${evidence.length} evidence items`);

    // Create sample drafts
    const drafts = [
      {
        id: "draft_001",
        commitment_id: "commit_001",
        draft_type: "acknowledgement" as const,
        content:
          "Thanks for reaching out. I've received your request to implement JWT-based authentication. I'll start on this right away and aim to have it completed within 2 days.",
        status: "queued" as const,
        created_at: new Date(),
        sent_at: null,
        final_sent_content: null,
      },
      {
        id: "draft_002",
        commitment_id: "commit_004",
        draft_type: "completion" as const,
        content:
          "Great news! I've compiled and sent the meeting notes from our Q3 planning session to all stakeholders. The summary and action items are now available in the shared drive.",
        status: "approved_sent" as const,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        final_sent_content:
          "Great news! I've compiled and sent the meeting notes from our Q3 planning session to all stakeholders. The summary and action items are now available in the shared drive.",
      },
    ];

    await CommunicationDraftModel.insertMany(drafts);
    console.log(`✓ Created ${drafts.length} drafts`);

    // Create sample audit logs
    const auditLogs = [
      {
        id: "audit_001",
        commitment_id: "commit_001",
        event_type: "status_change" as const,
        before_state: { status: "DETECTED" },
        after_state: { status: "PENDING" },
        contributing_factors: { reason: "User confirmed" },
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        id: "audit_002",
        commitment_id: "commit_004",
        event_type: "draft_generated" as const,
        before_state: { status: "PENDING" },
        after_state: { draft_id: "draft_002" },
        contributing_factors: { reason: "Automatic draft generation" },
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ];

    await AuditLogEntryModel.insertMany(auditLogs);
    console.log(`✓ Created ${auditLogs.length} audit logs`);

    console.log("✅ Database seeded successfully!");
    await disconnectMongo();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
