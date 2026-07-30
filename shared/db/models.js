import { Schema, model } from "mongoose";
import mongoose from "mongoose";
const schemaOptions = {
    strict: "throw",
    versionKey: false
};
const userSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    connected_accounts: { type: Schema.Types.Mixed, required: true },
    notification_preferences: { type: Schema.Types.Mixed, required: true },
    stakeholder_importance_map: { type: Schema.Types.Mixed, required: true }
}, schemaOptions);
const commitmentSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requester: { type: String, required: true, index: true },
    source: { type: String, enum: ["gmail", "github", "manual"], required: true, index: true },
    source_reference: { type: String, required: true },
    deadline: { type: Date, required: false, default: null },
    status: {
        type: String,
        enum: [
            "DETECTED",
            "CONFIRMED",
            "PENDING",
            "AT_RISK",
            "OVERDUE",
            "COMPLETED",
            "ARCHIVED",
            "DISMISSED"
        ],
        required: true,
        index: true
    },
    confidence_score: { type: Number, required: true },
    priority_score: { type: Number, required: true },
    verification_method: { type: String, required: true },
    linked_repo: { type: String, required: false, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
}, schemaOptions);
const evidenceSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    commitment_id: { type: String, required: true, index: true },
    evidence_type: {
        type: String,
        enum: ["github_commit", "github_pr", "github_release", "manual", "calendar_attendance"],
        required: true
    },
    evidence_reference: { type: String, required: true },
    match_confidence: { type: Number, required: true },
    detected_at: { type: Date, required: true }
}, schemaOptions);
const communicationDraftSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    commitment_id: { type: String, required: true, index: true },
    draft_type: {
        type: String,
        enum: ["acknowledgement", "completion", "recovery", "extension_request"],
        required: true
    },
    content: { type: String, required: true },
    status: {
        type: String,
        enum: ["queued", "approved_sent", "edited_sent", "discarded", "snoozed"],
        required: true,
        index: true
    },
    created_at: { type: Date, required: true },
    sent_at: { type: Date, required: false, default: null },
    final_sent_content: { type: String, required: false, default: null }
}, schemaOptions);
const integrationSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    provider: {
        type: String,
        enum: ["gmail", "github", "google_calendar"],
        required: true,
        index: true
    },
    auth_token: { type: String, required: true },
    scopes: { type: [String], required: true },
    status: { type: String, enum: ["connected", "revoked", "error"], required: true },
    last_synced_at: { type: Date, required: false, default: null }
}, schemaOptions);
const calendarEventSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    commitment_id: { type: String, required: true, index: true },
    external_event_id: { type: String, required: true },
    title: { type: String, required: true },
    start_time: { type: Date, required: true },
    status: { type: String, enum: ["created", "updated", "removed"], required: true }
}, schemaOptions);
const auditLogEntrySchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    commitment_id: { type: String, required: true, index: true },
    event_type: {
        type: String,
        enum: ["status_change", "priority_recalc", "evidence_matched", "draft_generated", "draft_sent"],
        required: true,
        index: true
    },
    before_state: { type: Schema.Types.Mixed, required: true },
    after_state: { type: Schema.Types.Mixed, required: true },
    contributing_factors: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, required: true }
}, schemaOptions);
export const UserModel = mongoose.models.User ?? model("User", userSchema);
export const CommitmentModel = mongoose.models.Commitment ?? model("Commitment", commitmentSchema);
export const EvidenceModel = mongoose.models.Evidence ?? model("Evidence", evidenceSchema);
export const CommunicationDraftModel = mongoose.models.CommunicationDraft ?? model("CommunicationDraft", communicationDraftSchema);
export const IntegrationModel = mongoose.models.Integration ?? model("Integration", integrationSchema);
export const CalendarEventModel = mongoose.models.CalendarEvent ?? model("CalendarEvent", calendarEventSchema);
export const AuditLogEntryModel = mongoose.models.AuditLogEntry ?? model("AuditLogEntry", auditLogEntrySchema);
