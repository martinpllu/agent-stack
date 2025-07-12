#!/usr/bin/env tsx

import { Command } from 'commander';
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { readFileSync } from 'fs';

interface SST_Outputs {
  database: {
    clusterArn: string;
    secretArn: string;
  };
}

interface DatabaseConfig {
  resourceArn: string;
  secretArn: string;
  database: string;
  stage: string;
}

// Load database configuration for a specific stage
function loadDatabaseConfig(stage: string | null, databaseOverride: string | null = null): DatabaseConfig {
  if (!stage) {
    console.error('❌ Stage is required. Specify --stage <stage-name>');
    console.error('Examples:');
    console.error('  pnpm sql "SELECT * FROM users;" --stage martin');
    console.error('  pnpm sql "SELECT * FROM users;" --stage dev');
    console.error('  pnpm sql "CREATE DATABASE newstage;" --stage dev --db postgres');
    process.exit(1);
  }

  try {
    // Load the current SST outputs to get cluster info
    const outputs: SST_Outputs = JSON.parse(readFileSync('.sst/outputs.json', 'utf8'));
    
    // Use the specified stage's database name
    const stageDatabaseName = stage.replace(/-/g, "_");
    
    return {
      resourceArn: outputs.database.clusterArn,
      secretArn: outputs.database.secretArn,
      database: databaseOverride || stageDatabaseName,
      stage: stage
    };
  } catch (error) {
    console.error('❌ Error loading database config from .sst/outputs.json');
    console.error('Make sure SST is running and outputs.json exists');
    process.exit(1);
  }
}

// Create RDS Data client
const client = new RDSDataClient({
  region: process.env.AWS_REGION || "eu-west-1",
});

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
  const config = loadDatabaseConfig(stage, databaseOverride);
  
  console.log(`🔍 Executing: ${sql}`);
  console.log(`🎯 Stage: ${config.stage}`);
  console.log(`🗃️  Database: ${config.database}`);
  console.log('⏳ Running query...');
  
  try {
    const command = new ExecuteStatementCommand({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      database: config.database,
      sql: sql,
      includeResultMetadata: true
    });

    const result = await client.send(command);
    
    console.log('✅ Query completed successfully!');
    formatResults(result);
    
  } catch (error) {
    if ((error as any).name === 'DatabaseResumingException') {
      console.log('💤 Database is resuming from auto-pause. Retrying in 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return executeQuery(sql, stage, databaseOverride); // Retry
    }
    
    console.error('❌ Query failed:');
    console.error((error as any).message);
    
    // If database doesn't exist, suggest how to create it
    if ((error as any).message.includes('database') && (error as any).message.includes('does not exist')) {
      console.log('\n💡 The database doesn\'t exist yet. Try:');
      console.log(`   npm run sql "CREATE DATABASE ${config.database};" --db=postgres`);
      console.log('   Then run your original query again.');
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
  .requiredOption('-s, --stage <stage>', 'Stage name (e.g., martin, dev, production)')
  .option('--db <database>', 'Override database name (useful for connecting to postgres initially)')
  .action(async (query: string) => {
    const { stage, db } = program.opts();
    await executeQuery(query, stage, db || null);
  });

program.parseAsync().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
}); 