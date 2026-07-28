import { randomUUID } from "node:crypto";
import { connectMongo } from "./connect";
import { AuditLogEntryModel, CommitmentModel } from "./models";
import type { Commitment, CommitmentStatus } from "../types";

export const commitmentStatusTransitions = {
  DETECTED: ["CONFIRMED", "DISMISSED"],
  CONFIRMED: ["PENDING"],
  PENDING: ["AT_RISK", "OVERDUE", "COMPLETED"],
  AT_RISK: ["OVERDUE", "COMPLETED"],
  OVERDUE: ["RECOVERED", "COMPLETED"],
  RECOVERED: ["PENDING", "COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  DISMISSED: []
} as const satisfies Record<CommitmentStatus, readonly CommitmentStatus[]>;

export type StatusTransitionEvidence = Record<string, unknown>;

export async function transitionCommitmentStatus(
  commitmentId: string,
  nextStatus: CommitmentStatus,
  evidence: StatusTransitionEvidence = {}
): Promise<Commitment> {
  await connectMongo();

  const existing = await CommitmentModel.findOne({ id: commitmentId }).lean<Commitment>().exec();

  if (!existing) {
    throw new Error(`Commitment not found: ${commitmentId}`);
  }

  const allowedNextStatuses = commitmentStatusTransitions[existing.status];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new Error(`Invalid commitment status transition: ${existing.status} -> ${nextStatus}`);
  }

  const now = new Date();
  const updated = await CommitmentModel.findOneAndUpdate(
    { id: commitmentId },
    { $set: { status: nextStatus, updated_at: now } },
    { new: true, runValidators: true, lean: true }
  ).exec();

  if (!updated) {
    throw new Error(`Commitment disappeared during transition: ${commitmentId}`);
  }

  await AuditLogEntryModel.create({
    id: randomUUID(),
    commitment_id: commitmentId,
    event_type: "status_change",
    before_state: { status: existing.status },
    after_state: { status: nextStatus },
    contributing_factors: evidence,
    timestamp: now
  });

  return updated as Commitment;
}
