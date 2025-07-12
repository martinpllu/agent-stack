/**
 * Database Client - Aurora Data API Standardized
 * 
 * This application is standardized on Aurora Data API for all database operations.
 * Benefits:
 * - No connection pooling management required
 * - Automatic scaling with Aurora Serverless
 * - Built-in retry logic for auto-pause/resume scenarios
 * - Simplified credential management via AWS Secrets Manager
 * - Consistent behavior across all environments
 */
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import * as schema from "./schema";

// Validate required Aurora Data API environment variables
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
      'This application requires Aurora Data API configuration. Please ensure your SST deployment is configured correctly.'
    );
  }

  return required as {
    DB_CLUSTER_ARN: string;
    DB_SECRET_ARN: string;
    DB_DATABASE: string;
  };
}

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

// Create Aurora Data API database instance
const config = validateDataApiConfig();

console.log(`[Database] Initializing Aurora Data API connection`);
console.log(`[Database] Region: ${process.env.AWS_REGION || "us-east-1"}`);
console.log(`[Database] Database: ${config.DB_DATABASE}`);
console.log(`[Database] Cluster: ${config.DB_CLUSTER_ARN?.slice(-12) || 'unknown'}`);

const baseDb = drizzle(
  new RDSDataClient({
    region: process.env.AWS_REGION || "us-east-1",
  }),
  {
    database: config.DB_DATABASE,
    secretArn: config.DB_SECRET_ARN,
    resourceArn: config.DB_CLUSTER_ARN,
    schema,
  }
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

// Create the database instance with Aurora Data API retry logic
export const db = new Proxy(baseDb, {
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
}); 