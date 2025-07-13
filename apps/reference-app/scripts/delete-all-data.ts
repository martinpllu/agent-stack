#!/usr/bin/env tsx

/**
 * Delete All Data Script
 * 
 * This script deletes all data from:
 * 1. OpenAuth DynamoDB table
 * 2. Aurora PostgreSQL database tables (users, tasks)
 * 
 * ⚠️  WARNING: This will permanently delete ALL data! ⚠️
 */

import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { readFileSync } from "fs";
import { createInterface } from "readline";
import { getDatabaseConfig, createRDSDataClient, withAuroraRetry } from "../app/db/client.js";

interface SST_Outputs {
  auth: {
    table: string;
  };
  database: {
    clusterArn: string;
    secretArn: string;
    database: string;
  };
}

// Read outputs to get resource information
const outputs: SST_Outputs = JSON.parse(readFileSync(".sst/outputs.json", "utf8"));

const dynamoTableName = outputs.auth.table;

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: "eu-west-1" });

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function confirmAction(message: string): Promise<boolean> {
  const answer = await askQuestion(`${message} (type "yes" to confirm): `);
  return answer.toLowerCase() === "yes";
}

async function deleteDynamoDBData(): Promise<void> {
  console.log(`\n🗑️  Deleting data from DynamoDB table: ${dynamoTableName}`);

  try {
    console.log("📋 Scanning DynamoDB table...");
    
    // Scan all items
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: dynamoTableName
    }));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log("✅ DynamoDB table is already empty");
      return;
    }

    console.log(`📊 Found ${scanResult.Items.length} items to delete`);

    // Delete in batches of 25 (DynamoDB limit)
    const batchSize = 25;
    for (let i = 0; i < scanResult.Items.length; i += batchSize) {
      const batch = scanResult.Items.slice(i, i + batchSize);
      
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            pk: item.pk,
            sk: item.sk
          }
        }
      }));

      await dynamoClient.send(new BatchWriteItemCommand({
        RequestItems: {
          [dynamoTableName]: deleteRequests
        }
      }));

      console.log(`🗑️  Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scanResult.Items.length / batchSize)}`);
    }

    console.log("✅ Successfully deleted all items from DynamoDB table");
  } catch (error: any) {
    console.error("❌ Error deleting DynamoDB data:", error.message);
    throw error;
  }
}

async function deleteAuroraData(): Promise<void> {
  // Get database configuration
  const dbConfig = getDatabaseConfig();
  
  console.log(`\n🗑️  Deleting data from Aurora database: ${dbConfig.database}`);

  // Create RDS client using centralized client with retry logic
  const rdsClient = createRDSDataClient(dbConfig);

  try {
    // Execute SQL to count records
    const countUsers = await withAuroraRetry(async () => {
      const result = await rdsClient.send(new ExecuteStatementCommand({
        resourceArn: dbConfig.resourceArn,
        secretArn: dbConfig.secretArn,
        database: dbConfig.database,
        sql: "SELECT COUNT(*) as count FROM users"
      }));
      return result.records?.[0]?.[0]?.longValue || 0;
    });

    const countTasks = await withAuroraRetry(async () => {
      const result = await rdsClient.send(new ExecuteStatementCommand({
        resourceArn: dbConfig.resourceArn,
        secretArn: dbConfig.secretArn,
        database: dbConfig.database,
        sql: "SELECT COUNT(*) as count FROM tasks"
      }));
      return result.records?.[0]?.[0]?.longValue || 0;
    });

    console.log(`📊 Found ${countUsers} users and ${countTasks} tasks to delete`);

    if (countUsers === 0 && countTasks === 0) {
      console.log("✅ Aurora database tables are already empty");
      return;
    }

    // Delete tasks first (due to foreign key constraints)
    console.log("🗑️  Deleting tasks...");
    await withAuroraRetry(async () => {
      await rdsClient.send(new ExecuteStatementCommand({
        resourceArn: dbConfig.resourceArn,
        secretArn: dbConfig.secretArn,
        database: dbConfig.database,
        sql: "DELETE FROM tasks"
      }));
    });

    // Delete users
    console.log("🗑️  Deleting users...");
    await withAuroraRetry(async () => {
      await rdsClient.send(new ExecuteStatementCommand({
        resourceArn: dbConfig.resourceArn,
        secretArn: dbConfig.secretArn,
        database: dbConfig.database,
        sql: "DELETE FROM users"
      }));
    });

    console.log("✅ Successfully deleted all data from Aurora database");
  } catch (error: any) {
    if (error.name === "DatabaseResumingException" || error.message?.includes("resuming after being auto-paused")) {
      console.error("❌ Aurora database is auto-paused. The retry logic should have handled this. Please try again in a moment.");
    } else {
      console.error("❌ Error deleting Aurora data:", error.message);
    }
    throw error;
  }
}

async function main() {
  console.log("⚠️  WARNING: This script will DELETE ALL DATA ⚠️");
  console.log("\nThis includes:");
  console.log("- All OpenAuth sessions and state from DynamoDB");
  console.log("- All users and tasks from Aurora PostgreSQL");
  console.log("\nThis action CANNOT be undone!");
  
  const confirmed = await confirmAction("\n❓ Are you absolutely sure you want to delete all data?");
  
  if (!confirmed) {
    console.log("\n❌ Operation cancelled");
    rl.close();
    return;
  }

  try {
    // Delete from DynamoDB
    await deleteDynamoDBData();
    
    // Delete from Aurora
    await deleteAuroraData();
    
    console.log("\n🎉 All data has been successfully deleted!");
  } catch (error) {
    console.error("\n❌ Failed to delete all data:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch(error => {
  console.error("Unexpected error:", error);
  process.exit(1);
});