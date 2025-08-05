#!/usr/bin/env tsx

import { Command } from 'commander';
import { ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { getDatabaseConfig, createRDSDataClient, withAuroraRetry } from "../app/db/client.js";

// Format and display query results
function formatResults(result: any): void {
  if (!result.records || result.records.length === 0) {
    console.log('📝 Query executed successfully. No rows returned.');
    return;
  }

  // Get column names from the first record
  const firstRecord = result.records[0];
  const columns = result.columnMetadata?.map((col: any) => col.name) || 
                 Object.keys(firstRecord).map((_, i) => `col_${i}`);

  // Create table
  console.log('\n📊 Results:');
  console.log('─'.repeat(80));
  
  // Header
  const headerRow = columns.map((col: any) => col.padEnd(20)).join(' | ');
  console.log(headerRow);
  console.log('─'.repeat(80));
  
  // Data rows
  result.records.forEach((record: any) => {
    const values = record.map((field: any) => {
      // Handle different field types
      if (field.stringValue !== undefined) return field.stringValue;
      if (field.longValue !== undefined) return field.longValue.toString();
      if (field.booleanValue !== undefined) return field.booleanValue.toString();
      if (field.isNull) return 'NULL';
      return JSON.stringify(field);
    });
    
    const row = values.map((val: any) => String(val).padEnd(20)).join(' | ');
    console.log(row);
  });
  
  console.log('─'.repeat(80));
  console.log(`📈 ${result.records.length} row(s) returned`);
}

// Execute SQL query
async function executeQuery(sql: string, stage: string, databaseOverride: string | null = null): Promise<void> {
  if (!stage) {
    console.error('❌ Stage is required. Specify --stage <stage-name>');
    console.error('Examples:');
    console.error('  pnpm sql "SELECT * FROM users;" --stage dev');
    console.error('  pnpm sql "SELECT * FROM users;" --stage staging');
    console.error('  pnpm sql "CREATE DATABASE newstage;" --stage dev --db postgres');
    process.exit(1);
  }

  try {
    // Get database configuration using centralized client
    const config = getDatabaseConfig(stage);
    
    // Override database name if specified
    if (databaseOverride) {
      config.database = databaseOverride;
    }
    
    console.log(`🔍 Executing: ${sql}`);
    console.log(`🎯 Stage: ${stage}`);
    console.log(`🗃️  Database: ${config.database}`);
    console.log('⏳ Running query...');
    
    // Create RDS client using centralized client
    const client = createRDSDataClient(config);
    
    // Execute query with retry logic
    const result = await withAuroraRetry(async () => {
      return await client.send(new ExecuteStatementCommand({
        resourceArn: config.resourceArn,
        secretArn: config.secretArn,
        database: config.database,
        sql: sql,
        includeResultMetadata: true
      }));
    });
    
    console.log('✅ Query completed successfully!');
    formatResults(result);
    
  } catch (error) {
    console.error('❌ Query failed:');
    console.error((error as any).message);
    
    // If database doesn't exist, suggest how to create it
    if ((error as any).message.includes('database') && (error as any).message.includes('does not exist')) {
      const stageDatabaseName = stage.replace(/-/g, "_");
      console.log('\n💡 The database doesn\'t exist yet. Try:');
      console.log(`   npm run sql "CREATE DATABASE ${stageDatabaseName};" --db=postgres`);
      console.log('   Then run your original query again.');
    }
    
    // If config loading failed
    if ((error as Error).message?.includes('Database configuration not found')) {
      console.error('Make sure SST is running and outputs.json exists');
    }
    
    process.exit(1);
  }
}

const program = new Command();

program
  .name('sql')
  .description('Execute SQL queries against SST database')
  .version('1.0.0')
  .argument('<query>', 'SQL query to execute')
  .requiredOption('-s, --stage <stage>', 'Stage name (e.g., dev, staging, production)')
  .option('--db <database>', 'Override database name (useful for connecting to postgres initially)')
  .action(async (query: string) => {
    const { stage, db } = program.opts();
    await executeQuery(query, stage, db || null);
  });

program.parseAsync().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});