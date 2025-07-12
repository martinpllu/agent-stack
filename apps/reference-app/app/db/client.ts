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
  let hasRetried = false;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (hasRetried) {
        console.log(`[DB Retry] Aurora operation succeeded after retry (attempt ${attempt})`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a DatabaseResumingException
      const isDatabaseResuming = 
        error?.name === 'DatabaseResumingException' ||
        error?.message?.includes('resuming after being auto-paused') ||
        (error?.message?.includes('Aurora DB instance') && error?.message?.includes('resuming')) ||
        error?.message?.includes('is resuming after being auto-paused');
      
      if (isDatabaseResuming && attempt < maxRetries) {
        hasRetried = true;
        console.log(`[DB Retry] Aurora database is resuming (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
        console.log(`[DB Retry] Error details: ${error?.name || 'unknown'} - ${error?.message || 'no message'}`);
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

// Helper function to wrap any thenable (query builder) with retry logic
function wrapWithRetry<T>(queryBuilder: T): T {
  if (!queryBuilder || typeof queryBuilder !== 'object') {
    return queryBuilder;
  }
  
  return new Proxy(queryBuilder as any, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);
      
      // If this is the 'then' method (promise execution), wrap with retry
      if (prop === 'then' && typeof originalValue === 'function') {
        return function(onResolve?: any, onReject?: any) {
          return withAuroraRetry(() => target[prop](onResolve, onReject));
        };
      }
      
      // If this is a function that might return another query builder, wrap the result
      if (typeof originalValue === 'function') {
        return function (...args: any[]) {
          const result = originalValue.apply(target, args);
          
          // If the result looks like a query builder (has a then method), wrap it
          if (result && typeof result === 'object' && typeof result.then === 'function') {
            return wrapWithRetry(result);
          }
          
          return result;
        };
      }
      
      return originalValue;
    }
  });
}

// Create the database instance with retry logic for Aurora Data API
export const db = isDataApi
  ? new Proxy(baseDb, {
      get(target, prop, receiver) {
        const originalMethod = Reflect.get(target, prop, receiver);
        
        // Wrap database methods to apply retry logic to query builders
        if (typeof originalMethod === 'function') {
          return function (...args: any[]) {
            const result = originalMethod.apply(target, args);
            
            // If the result is a query builder, wrap it with retry logic
            if (result && typeof result === 'object' && typeof result.then === 'function') {
              return wrapWithRetry(result);
            }
            
            return result;
          };
        }
        
        return originalMethod;
      }
    })
  : baseDb; // No need for retry logic with regular PostgreSQL 