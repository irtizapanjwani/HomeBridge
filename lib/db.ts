// The shared MongoDB connection, used by both HomeBridge and the VEKAT site.
//
// Set MONGODB_URI (an Atlas connection string) and, optionally, MONGODB_DB.
// Both sites point at the SAME database, so a person who registers on either one has a single
// record and a single reference. See lib/members.ts for the collections and their shape.

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "homebridge";

/**
 * Serverless functions are recycled constantly, and each cold start would otherwise open a new
 * pool and exhaust the cluster's connection limit. In development the module is re-evaluated on
 * every edit, so the promise is kept on globalThis; in production the module scope is enough.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

function connect(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (and to the host's environment variables).");
  }
  const client = new MongoClient(uri, {
    // Fail fast rather than hanging a request for 30 seconds when the cluster is unreachable.
    serverSelectionTimeoutMS: 8_000,
    retryWrites: true,
  });
  return client.connect();
}

export function getClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) global._mongoClientPromise = connect();
    return global._mongoClientPromise;
  }
  if (!clientPromise) clientPromise = connect();
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

/** True when a connection string is configured at all, so routes can fail with a clear message. */
export const isDbConfigured = () => Boolean(uri);
