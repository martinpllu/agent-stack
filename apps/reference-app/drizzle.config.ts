import type { Config } from "drizzle-kit";

// Check if we're using Aurora Data API
const isDataApi = process.env.DB_CLUSTER_ARN && process.env.DB_SECRET_ARN;

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config; 