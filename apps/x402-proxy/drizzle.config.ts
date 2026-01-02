import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: 'postgresql://neondb_owner:npg_gHjV7e6DIkpK@ep-sparkling-firefly-a45za8i2-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  },
});
