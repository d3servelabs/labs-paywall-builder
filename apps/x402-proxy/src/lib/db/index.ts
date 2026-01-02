import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy initialization to avoid build-time errors
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure your Neon database connection."
    );
  }

  const sql: NeonQueryFunction<boolean, boolean> = neon(connectionString);
  _db = drizzle(sql, { schema, logger: true });
  return _db;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    const database = getDb();
    const value = database[prop as keyof typeof database];
    if (typeof value === "function") {
      return value.bind(database);
    }
    return value;
  },
});

// Export schema for convenience
export * from "./schema";

// Type for the database instance
export type Database = NeonHttpDatabase<typeof schema>;
