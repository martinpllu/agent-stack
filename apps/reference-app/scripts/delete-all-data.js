#!/usr/bin/env node

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
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { readFileSync } from "fs";
import { createInterface } from "readline";

// Read outputs to get resource information
const outputs = JSON.parse(readFileSync(".sst/outputs.json", "utf8"));

const dynamoTableName = outputs.auth.table;
const auroraClusterArn = outputs.database.clusterArn;
const auroraSecretArn = outputs.database.secretArn;
const databaseName = outputs.database.database;

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: "eu-west-1" });
const rdsClient = new RDSDataClient({ region: "eu-west-1" });

// Helper function to retry Aurora resuming operations
async function withAuroraRetry(operation, maxRetries = 3, delayMs = 10000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if this is a DatabaseResumingException or Aurora resuming error
      const isDatabaseResuming = 
        error?.name === 'DatabaseResumingException' ||
        error?.message?.includes('resuming after being auto-paused') ||
        (error?.message?.includes('Aurora DB instance') && error?.message?.includes('resuming'));
      
      if (isDatabaseResuming && attempt < maxRetries) {
        console.log(`💤 Aurora database is resuming (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Re-throw if not a resuming exception or max retries reached
      throw error;
    }
  }
  
  throw lastError;
}

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function confirmAction(message) {
  const answer = await askQuestion(`${message} (type "yes" to confirm): `);
  return answer.toLowerCase() === "yes";
}

async function deleteDynamoDBData() {
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

    // Batch delete items (DynamoDB allows max 25 items per batch)
    const batches = [];
    for (let i = 0; i < scanResult.Items.length; i += 25) {
      const batch = scanResult.Items.slice(i, i + 25);
      batches.push(batch);
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 Deleting batch ${i + 1}/${batches.length} (${batch.length} items)...`);

      const deleteRequests = batch.map(item => {
        // Extract all keys from the item to build the primary key
        const keys = {};
        Object.keys(item).forEach(key => {
          keys[key] = item[key];
        });
        
        return {
          DeleteRequest: {
            Key: keys
          }
        };
      });

      await dynamoClient.send(new BatchWriteItemCommand({
        RequestItems: {
          [dynamoTableName]: deleteRequests
        }
      }));
    }

    console.log("✅ DynamoDB data deletion completed");
  } catch (error) {
    console.error("❌ Error deleting DynamoDB data:", error.message);
  }
}

async function deleteAuroraData() {
  console.log(`\n🗑️  Deleting data from Aurora database: ${databaseName}`);

  try {
    // Delete tasks first (due to foreign key constraint)
    console.log("🔄 Deleting tasks table data...");
    await withAuroraRetry(() => 
      rdsClient.send(new ExecuteStatementCommand({
        resourceArn: auroraClusterArn,
        secretArn: auroraSecretArn,
        database: databaseName,
        sql: "DELETE FROM tasks;"
      }))
    );

    console.log("🔄 Deleting users table data...");
    await withAuroraRetry(() =>
      rdsClient.send(new ExecuteStatementCommand({
        resourceArn: auroraClusterArn,
        secretArn: auroraSecretArn,
        database: databaseName,
        sql: "DELETE FROM users;"
      }))
    );

    // Reset sequences if they exist
    console.log("🔄 Resetting sequences...");
    try {
      await withAuroraRetry(() =>
        rdsClient.send(new ExecuteStatementCommand({
          resourceArn: auroraClusterArn,
          secretArn: auroraSecretArn,
          database: databaseName,
          sql: "ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;"
        }))
      );
      
      await withAuroraRetry(() =>
        rdsClient.send(new ExecuteStatementCommand({
          resourceArn: auroraClusterArn,
          secretArn: auroraSecretArn,
          database: databaseName,
          sql: "ALTER SEQUENCE IF EXISTS tasks_id_seq RESTART WITH 1;"
        }))
      );
    } catch (seqError) {
      // Sequences might not exist, that's okay
      console.log("ℹ️  No sequences to reset (this is normal for UUID primary keys)");
    }

    console.log("✅ Aurora data deletion completed");
  } catch (error) {
    console.error("❌ Error deleting Aurora data:", error.message);
    
    // Additional Aurora-specific error guidance
    if (error?.message?.includes('resuming') || error?.name === 'DatabaseResumingException') {
      console.error("ℹ️  This error occurred because Aurora was auto-paused and needed to resume.");
      console.error("ℹ️  The script includes retry logic, but the database may need more time to fully resume.");
      console.error("ℹ️  Try running the script again in a few minutes.");
    }
    
    console.error("Full error:", error);
  }
}

async function main() {
  console.log("🚨 DELETE ALL DATA SCRIPT 🚨");
  console.log("================================");
  console.log("This script will delete ALL data from:");
  console.log(`• DynamoDB table: ${dynamoTableName}`);
  console.log(`• Aurora database: ${databaseName} (users and tasks tables)`);
  console.log("");
  
  const confirmed = await confirmAction("🛑 Are you ABSOLUTELY SURE you want to delete ALL data?");
  if (!confirmed) {
    console.log("❌ Operation cancelled. No data was deleted.");
    rl.close();
    return;
  }

  console.log("\n🚀 Starting data deletion...");

  // Delete DynamoDB data
  await deleteDynamoDBData();

  // Delete Aurora data
  await deleteAuroraData();

  console.log("\n🎉 Data deletion process completed!");
  console.log("📊 Summary:");
  console.log("• OpenAuth DynamoDB table cleared");
  console.log("• Aurora users table cleared");
  console.log("• Aurora tasks table cleared");
  
  rl.close();
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n❌ Script interrupted. Exiting...');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  rl.close();
  process.exit(1);
});