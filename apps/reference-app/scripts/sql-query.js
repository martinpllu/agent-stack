#!/usr/bin/env node
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { readFileSync } from 'fs';

// Load database configuration from SST outputs
function loadDatabaseConfig(databaseOverride = null) {
  try {
    const outputs = JSON.parse(readFileSync('.sst/outputs.json', 'utf8'));
    return {
      resourceArn: outputs.database.clusterArn,
      secretArn: outputs.database.secretArn,
      database: databaseOverride || outputs.database.database || 'postgres'
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
async function executeQuery(sql, databaseOverride = null) {
  const config = loadDatabaseConfig(databaseOverride);
  
  console.log(`🔍 Executing: ${sql}`);
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
  
  // Parse --db parameter
  let databaseOverride = null;
  let sqlArgs = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--db=')) {
      databaseOverride = args[i].split('=')[1];
    } else {
      sqlArgs.push(args[i]);
    }
  }
  
  if (sqlArgs.length === 0) {
    console.log(`
🗃️  Aurora Data API SQL Query Tool

Usage:
  npm run sql "SELECT * FROM users LIMIT 5;"
  npm run sql "SHOW TABLES;" --db=postgres
  node scripts/sql-query.js "SELECT * FROM users;"
  
Examples:
  npm run sql "SELECT * FROM users;"
  npm run sql "SELECT COUNT(*) FROM tasks;"
  npm run sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
  
Database Management:
  npm run sql "CREATE DATABASE dev;" --db=postgres
  npm run sql "SELECT datname FROM pg_database;" --db=postgres
  
Options:
  --db=DATABASE_NAME    Override database name (useful for connecting to 'postgres' initially)

Note: The database may auto-pause and take a few seconds to resume on first query.
`);
    process.exit(0);
  }
  
  const sql = sqlArgs.join(' ');
  await executeQuery(sql, databaseOverride);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

main(); 