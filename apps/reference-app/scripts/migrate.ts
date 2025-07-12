#!/usr/bin/env node
import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { migrate } from 'drizzle-orm/aws-data-api/pg/migrator';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import * as schema from '../app/db/schema.js';

interface SST_Outputs {
  database: {
    clusterArn: string;
    secretArn: string;
    database: string;
  };
}

interface DatabaseConfig {
  database: string;
  secretArn: string;
  resourceArn: string;
  region: string;
  stage: string;
}

// Load and set up environment from SST outputs for a specific stage
function setupEnvironment(stage: string | null): DatabaseConfig {
  if (!stage) {
    console.error('❌ Stage is required. Specify --stage <stage-name>');
    console.error('Examples:');
    console.error('  pnpm migrate --stage martin');
    console.error('  pnpm migrate --stage dev');
    console.error('  pnpm migrate --stage production');
    process.exit(1);
  }

  try {
    // Load the current SST outputs to get cluster info
    const outputs: SST_Outputs = JSON.parse(readFileSync('.sst/outputs.json', 'utf8'));
    
    // Use the specified stage's database name
    const stageDatabaseName = stage.replace(/-/g, "_");
    
    console.log(`🎯 Target Stage: ${stage}`);
    console.log(`🗃️  Database: ${stageDatabaseName}`);
    console.log(`🔗 Using Aurora Data API`);
    
    return {
      database: stageDatabaseName,
      secretArn: outputs.database.secretArn,
      resourceArn: outputs.database.clusterArn,
      region: process.env.AWS_REGION || "eu-west-1",
      stage: stage
    };
  } catch (error) {
    console.error('❌ Error loading database config from .sst/outputs.json');
    console.error('Make sure SST is running and outputs.json exists');
    process.exit(1);
  }
}

async function runMigrations(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Parse --stage parameter
  let stage: string | null = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--stage=')) {
      stage = args[i].split('=')[1];
    } else if (args[i] === '--stage' && i + 1 < args.length) {
      stage = args[i + 1];
      i++; // Skip the next argument since we consumed it
    }
  }
  
  if (!stage) {
    console.log(`
🚀 Drizzle Migration Runner for Aurora Data API

Usage:
  pnpm migrate --stage martin
  pnpm migrate --stage dev
  pnpm migrate --stage production
  
Examples:
  pnpm migrate --stage martin        # Run migrations against martin stage
  pnpm migrate --stage dev           # Run migrations against dev stage
  pnpm migrate --stage production    # Run migrations against production stage

Required:
  --stage STAGE_NAME    Target stage database (e.g., martin, dev, production)

Note: This applies all pending migrations to the specified stage's database.
`);
    process.exit(0);
  }

  try {
    console.log('🚀 Running database migrations...');
    
    const config = setupEnvironment(stage);
    
    // Create RDS Data client
    const rdsClient = new RDSDataClient({ 
      region: config.region 
    });
    
    // Create Drizzle instance for Data API
    const db = drizzle(rdsClient, {
      database: config.database,
      secretArn: config.secretArn,
      resourceArn: config.resourceArn,
      schema
    });
    
    // Run migrations using the official Data API migrator
    await migrate(db, { 
      migrationsFolder: './drizzle' 
    });
    
    console.log(`🎉 All migrations completed successfully for stage: ${config.stage}!`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();