import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleDataApi } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Check if we're using Aurora Data API (when cluster ARN is available)
const isDataApi = process.env.DB_CLUSTER_ARN && process.env.DB_SECRET_ARN;

// Helper function to retry Aurora resuming operations
async function withAuroraRetry<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 5000): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a DatabaseResumingException
      const isDatabaseResuming = 
        error?.name === 'DatabaseResumingException' ||
        error?.message?.includes('resuming after being auto-paused') ||
        error?.message?.includes('Aurora DB instance') && error?.message?.includes('resuming');
      
      if (isDatabaseResuming && attempt < maxRetries) {
        console.log(`Aurora database is resuming (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Re-throw if not a resuming exception or max retries reached
      throw error;
    }
  }
  
  throw lastError!;
}

// Create the base database instance
const baseDb = isDataApi
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

// Create a Proxy to wrap all database operations with retry logic for Aurora Data API
export const db = isDataApi
  ? new Proxy(baseDb, {
      get(target, prop, receiver) {
        const originalMethod = Reflect.get(target, prop, receiver);
        
        // Only wrap methods that return promises (database operations)
        if (typeof originalMethod === 'function') {
          return function (...args: any[]) {
            const result = originalMethod.apply(target, args);
            
            // If the result is a promise, wrap it with retry logic
            if (result && typeof result.then === 'function') {
              return withAuroraRetry(() => originalMethod.apply(target, args));
            }
            
            return result;
          };
        }
        
        return originalMethod;
      }
    })
  : baseDb; // No need for retry logic with regular PostgreSQL 