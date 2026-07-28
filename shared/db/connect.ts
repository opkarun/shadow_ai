import mongoose from "mongoose";
import { getEnv } from "../utils/env";

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectMongo(): Promise<typeof mongoose> {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(getEnv("MONGO_URI"));
  }

  return connectionPromise;
}

export async function disconnectMongo(): Promise<void> {
  if (connectionPromise) {
    await mongoose.disconnect();
    connectionPromise = null;
  }
}
