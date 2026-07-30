import mongoose from "mongoose";
import { getEnv } from "../utils/env";
let connectionPromise = null;
export function connectMongo() {
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(getEnv("MONGO_URI"));
    }
    return connectionPromise;
}
export async function disconnectMongo() {
    if (connectionPromise) {
        await mongoose.disconnect();
        connectionPromise = null;
    }
}
