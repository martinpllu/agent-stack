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
import { readFileSync, existsSync } from 'fs';
import * as schema from "./schema";

// Database configuration interface
export interface DatabaseConfig {
  database: string;
  secretArn: string;
  resourceArn: string;
  region: string;
}

// SST outputs interface
interface SST_Outputs {
  database: {
    clusterArn: string;
    secretArn: string;
    database: string;
  };
}

// Load database configuration from environment or SST outputs
export function getDatabaseConfig(stage?: string): DatabaseConfig {
  // First try environment variables (for app and auth function)
  if (process.env.DB_CLUSTER_ARN && process.env.DB_SECRET_ARN && process.env.DB_DATABASE) {
    return {
      database: process.env.DB_DATABASE,
      secretArn: process.env.DB_SECRET_ARN,
      resourceArn: process.env.DB_CLUSTER_ARN,
      region: process.env.AWS_REGION || 'us-east-1'
    };
  }
  
  // For scripts, load from SST outputs
  const outputsPath = '.sst/outputs.json';
  if (!existsSync(outputsPath)) {
    throw new Error(
      'Database configuration not found. Either set environment variables (DB_CLUSTER_ARN, DB_SECRET_ARN, DB_DATABASE) ' +
      'or ensure .sst/outputs.json exists (run "npx sst dev" or "npx sst deploy")'
    );
  }
  
  const outputs: SST_Outputs = JSON.parse(readFileSync(outputsPath, 'utf8'));
  
  if (!outputs.database) {
    throw new Error('Database outputs not found in .sst/outputs.json');
  }
  
  // Use the stage-specific database name if stage is provided
  const databaseName = stage ? stage.replace(/-/g, "_") : outputs.database.database;
  
  return {
    database: databaseName,
    secretArn: outputs.database.secretArn,
    resourceArn: outputs.database.clusterArn,
    region: process.env.AWS_REGION || 'us-east-1'
  };
}

// Helper function to retry Aurora resuming operations
export async function withAuroraRetry<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 5000): Promise<T> {
  let lastError: Error;
  let hasRetried = false;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (hasRetried) {
        console.log(`[DB Retry] Aurora operation succeeded after retry (attempt ${attempt})`);
      }
      return result;
    } catch (error: unknown) {
      lastError = error as Error;
      
      // Check if this is a DatabaseResumingException
      const isDatabaseResuming = 
        (error as Error)?.name === 'DatabaseResumingException' ||
        (error as Error)?.message?.includes('resuming after being auto-paused') ||
        ((error as Error)?.message?.includes('Aurora DB instance') && (error as Error)?.message?.includes('resuming')) ||
        (error as Error)?.message?.includes('is resuming after being auto-paused');
      
      if (isDatabaseResuming && attempt < maxRetries) {
        hasRetried = true;
        console.log(`[DB Retry] Aurora database is resuming (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
        console.log(`[DB Retry] Error details: ${(error as Error)?.name || 'unknown'} - ${(error as Error)?.message || 'no message'}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Re-throw if not a resuming exception or max retries reached
      throw error;
    }
  }
  
  throw lastError!;
}

// Create RDS Data Client with configuration and retry logic
export function createRDSDataClient(config?: DatabaseConfig): RDSDataClient {
  const dbConfig = config || getDatabaseConfig();
  const baseClient = new RDSDataClient({
    region: dbConfig.region,
  });
  
  // Wrap the send method to add retry logic
  const originalSend = baseClient.send.bind(baseClient);
  baseClient.send = async function(command: any) {
    return withAuroraRetry(() => originalSend(command));
  };
  
  return baseClient;
}

// Create Drizzle database instance
export function createDrizzleDb(stage?: string) {
  const config = getDatabaseConfig(stage);
  
  console.log(`[Database] Initializing Aurora Data API connection`);
  console.log(`[Database] Region: ${config.region}`);
  console.log(`[Database] Database: ${config.database}`);
  console.log(`[Database] Cluster: ${config.resourceArn?.slice(-12) || 'unknown'}`);
  console.log(`[Database] Retry logic enabled: RDSDataClient wrapped with withAuroraRetry`);
  
  // The RDSDataClient already has retry logic, so we don't need proxy wrapping
  return drizzle(
    createRDSDataClient(config),
    {
      database: config.database,
      secretArn: config.secretArn,
      resourceArn: config.resourceArn,
      schema,
    }
  );
}

// Create the default database instance for app/auth usage
export const db = createDrizzleDb(); 