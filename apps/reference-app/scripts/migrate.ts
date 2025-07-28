#!/usr/bin/env tsx

import { Command } from 'commander';
import { migrate } from 'drizzle-orm/aws-data-api/pg/migrator';
import { createDrizzleDb, getDatabaseConfig } from '../app/db/client.js';

async function runMigrations(stage: string): Promise<void> {
  if (!stage) {
    console.error('❌ Stage is required. Specify --stage <stage-name>');
    console.error('Examples:');
    console.error('  pnpm migrate --stage dev');
    console.error('  pnpm migrate --stage staging');
    console.error('  pnpm migrate --stage production');
    process.exit(1);
  }

  try {
    console.log('🚀 Running database migrations...');
    console.log(`🎯 Target Stage: ${stage}`);
    console.log(`🔗 Using Aurora Data API`);
    
    // Get database configuration
    const config = getDatabaseConfig(stage);
    console.log(`🗃️  Database: ${config.database}`);
    
    // Create database instance using centralized client with retry logic
    const db = createDrizzleDb(stage);
    
    // Run migrations using the official Data API migrator
    await migrate(db, { 
      migrationsFolder: './drizzle' 
    });
    
    console.log(`🎉 All migrations completed successfully for stage: ${stage}!`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if ((error as Error).message?.includes('Database configuration not found')) {
      console.error('Make sure SST is running and outputs.json exists');
    }
    process.exit(1);
  }
}

const program = new Command();

program
  .name('migrate')
  .description('Run database migrations for SST applications')
  .version('1.0.0')
  .requiredOption('-s, --stage <stage>', 'Stage name (e.g., dev, staging, production)')
  .action(async () => {
    const { stage } = program.opts();
    await runMigrations(stage);
  });

program.parseAsync().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});