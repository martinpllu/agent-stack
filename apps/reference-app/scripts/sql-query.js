#!/usr/bin/env node
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { readFileSync } from 'fs';

// Load database configuration for a specific stage
function loadDatabaseConfig(stage, databaseOverride = null) {
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
    const outputs = JSON.parse(readFileSync('.sst/outputs.json', 'utf8'));
    
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
function formatResults(result) {
  if (!result.records || result.records.length === 0) {
    console.log('📝 Query executed successfully. No rows returned.');
    return;
  }

  // Get column names from the first record
  const firstRecord = result.records[0];
  const columns = result.columnMetadata?.map(col => col.name) || 
                 Object.keys(firstRecord).map((_, i) => `col_${i}`);

  // Create table
  console.log('\n📊 Results:');
  console.log('─'.repeat(80));
  
  // Header
  const headerRow = columns.map(col => col.padEnd(20)).join(' | ');
  console.log(headerRow);
  console.log('─'.repeat(80));
  
  // Data rows
  result.records.forEach(record => {
    const values = record.map(field => {
      // Handle different field types
      if (field.stringValue !== undefined) return field.stringValue;
      if (field.longValue !== undefined) return field.longValue.toString();
      if (field.booleanValue !== undefined) return field.booleanValue.toString();
      if (field.isNull) return 'NULL';
      return JSON.stringify(field);
    });
    
    const row = values.map(val => String(val).padEnd(20)).join(' | ');
    console.log(row);
  });
  
  console.log('─'.repeat(80));
  console.log(`📈 ${result.records.length} row(s) returned`);
}

// Execute SQL query
async function executeQuery(sql, stage, databaseOverride = null) {
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
    if (error.name === 'DatabaseResumingException') {
      console.log('💤 Database is resuming from auto-pause. Retrying in 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return executeQuery(sql, databaseOverride); // Retry
    }
    
    console.error('❌ Query failed:');
    console.error(error.message);
    
    // If database doesn't exist, suggest how to create it
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n💡 The database doesn\'t exist yet. Try:');
      console.log(`   npm run sql "CREATE DATABASE ${config.database};" --db=postgres`);
      console.log('   Then run your original query again.');
    }
    
    process.exit(1);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Parse parameters
  let databaseOverride = null;
  let stage = null;
  let sqlArgs = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--db=')) {
      databaseOverride = args[i].split('=')[1];
    } else if (args[i] === '--db' && i + 1 < args.length) {
      databaseOverride = args[i + 1];
      i++; // Skip the next argument since we consumed it
    } else if (args[i].startsWith('--stage=')) {
      stage = args[i].split('=')[1];
    } else if (args[i] === '--stage' && i + 1 < args.length) {
      stage = args[i + 1];
      i++; // Skip the next argument since we consumed it
    } else {
      sqlArgs.push(args[i]);
    }
  }
  
  if (sqlArgs.length === 0 || !stage) {
    console.log(`
🗃️  Aurora Data API SQL Query Tool

Usage:
  pnpm sql "SELECT * FROM users LIMIT 5;" --stage martin
  pnpm sql "SHOW TABLES;" --stage dev --db postgres
  node scripts/sql-query.js "SELECT * FROM users;" --stage production
  
Examples:
  pnpm sql "SELECT * FROM users;" --stage martin
  pnpm sql "SELECT COUNT(*) FROM tasks;" --stage dev
  pnpm sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" --stage production
  
Cross-stage operations:
  pnpm sql "SELECT COUNT(*) FROM users;" --stage dev
  pnpm sql "SELECT COUNT(*) FROM users;" --stage production
  
Database Management:
  pnpm sql "CREATE DATABASE newstage;" --stage dev --db postgres
  pnpm sql "SELECT datname FROM pg_database;" --stage dev --db postgres
  
Required:
  --stage STAGE_NAME    Target stage database (e.g., martin, dev, production)
  
Options:
  --db DATABASE_NAME    Override database name (useful for connecting to 'postgres' initially)

Note: The database may auto-pause and take a few seconds to resume on first query.
`);
    process.exit(0);
  }
  
  const sql = sqlArgs.join(' ');
  await executeQuery(sql, stage, databaseOverride);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

main(); 