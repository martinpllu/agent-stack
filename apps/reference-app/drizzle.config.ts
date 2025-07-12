import type { Config } from "drizzle-kit";

// Validate Aurora Data API configuration
function validateDataApiConfig(): {
  DB_CLUSTER_ARN: string;
  DB_SECRET_ARN: string;
  DB_DATABASE: string;
} {
  const required = {
    DB_CLUSTER_ARN: process.env.DB_CLUSTER_ARN,
    DB_SECRET_ARN: process.env.DB_SECRET_ARN,
    DB_DATABASE: process.env.DB_DATABASE
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Aurora Data API environment variables: ${missing.join(', ')}\n` +
      'Drizzle Kit requires Aurora Data API configuration for this application.'
    );
  }

  return required as {
    DB_CLUSTER_ARN: string;
    DB_SECRET_ARN: string;
    DB_DATABASE: string;
  };
}

const config = validateDataApiConfig();

export default {
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  driver: "aws-data-api",
  dbCredentials: {
    database: config.DB_DATABASE,
    secretArn: config.DB_SECRET_ARN,
    resourceArn: config.DB_CLUSTER_ARN,
  },
  // Additional configuration for Drizzle Studio
  introspect: {
    casing: 'preserve'
  }
} satisfies Config; 