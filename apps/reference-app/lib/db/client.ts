import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleDataApi } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Check if we're using Aurora Data API (when cluster ARN is available)
const isDataApi = process.env.DB_CLUSTER_ARN && process.env.DB_SECRET_ARN;

export const db = isDataApi
  ? drizzleDataApi(
      new RDSDataClient({
        region: process.env.AWS_REGION || "us-east-1",
      }),
      {
        database: process.env.DB_DATABASE!,
        secretArn: process.env.DB_SECRET_ARN!,
        resourceArn: process.env.DB_CLUSTER_ARN!,
        schema,
      }
    )
  : drizzle(
      new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
      { schema }
    ); 