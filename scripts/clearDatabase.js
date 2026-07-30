import { connectMongo } from "../shared/db/connect.js";
import { CommitmentModel, EvidenceModel, CommunicationDraftModel, AuditLogEntryModel, IntegrationModel, } from "../shared/db/models.js";
async function clearDatabase() {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongo();
        console.log("Clearing commitments...");
        await CommitmentModel.deleteMany({});
        console.log("Clearing evidence...");
        await EvidenceModel.deleteMany({});
        console.log("Clearing drafts...");
        await CommunicationDraftModel.deleteMany({});
        console.log("Clearing audit logs...");
        await AuditLogEntryModel.deleteMany({});
        console.log("Clearing integrations...");
        await IntegrationModel.deleteMany({});
        console.log("✅ Database cleared successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Error clearing database:", error);
        process.exit(1);
    }
}
clearDatabase();
