#!/usr/bin/env tsx

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { spawn } from 'child_process';

interface SST_Outputs {
  database: {
    clusterArn: string;
    secretArn: string;
    database: string;
  };
}

function loadDatabaseConfig(stage: string) {
  try {
    const outputsPath = '.sst/outputs.json';
    const outputs: SST_Outputs = JSON.parse(readFileSync(outputsPath, 'utf8'));
    
    if (!outputs.database) {
      throw new Error('Database outputs not found in .sst/outputs.json');
    }

    const { clusterArn, secretArn } = outputs.database;
    
    // Convert stage to database name (replace hyphens with underscores)
    const stageDatabaseName = stage.replace(/-/g, "_");
    
    return {
      DB_CLUSTER_ARN: clusterArn,
      DB_SECRET_ARN: secretArn,
      DB_DATABASE: stageDatabaseName,
      AWS_REGION: process.env.AWS_REGION || 'eu-west-1'
    };
  } catch (error) {
    console.error('❌ Failed to load database config from .sst/outputs.json');
    console.error('Make sure SST is running locally with "npx sst dev"');
    process.exit(1);
  }
}

function runCommand(command: string, args: string[], env: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    console.log(`🎯 Stage: ${env.DB_DATABASE}`);
    console.log(`🔗 Database: ${env.DB_CLUSTER_ARN?.slice(-20) || 'undefined'}`);
    console.log(`🚀 Running: ${command} ${args.join(' ')}`);
    
    // Ensure all environment variables are strings
    const envVars = Object.fromEntries(
      Object.entries({ ...process.env, ...env }).map(([key, value]) => [
        key,
        String(value || '')
      ])
    );
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: envVars
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

const program = new Command();

program
  .name('db')
  .description('Database command wrapper for SST applications')
  .version('1.0.0')
  .requiredOption('-s, --stage <stage>', 'Stage name (e.g., martin, dev, production)');

program
  .command('studio')
  .description('Open Drizzle Studio database browser')
  .action(async () => {
    const { stage } = program.opts();
    const env = loadDatabaseConfig(stage);
    await runCommand('drizzle-kit', ['studio'], env);
  });

program
  .command('generate')
  .description('Generate database migrations')
  .action(async () => {
    const { stage } = program.opts();
    const env = loadDatabaseConfig(stage);
    await runCommand('drizzle-kit', ['generate'], env);
  });

program
  .command('push')
  .description('Push schema changes directly to database')
  .action(async () => {
    const { stage } = program.opts();
    const env = loadDatabaseConfig(stage);
    await runCommand('drizzle-kit', ['push'], env);
  });

program
  .command('migrate')
  .description('Run database migrations')
  .action(async () => {
    const { stage } = program.opts();
    const env = loadDatabaseConfig(stage);
    await runCommand('tsx', ['scripts/migrate.ts', '--stage', stage], env);
  });

program
  .command('sql <query>')
  .description('Execute SQL query')
  .option('--db <database>', 'Override database name')
  .action(async (query: string, options: { db?: string }) => {
    const { stage } = program.opts();
    const env = loadDatabaseConfig(stage);
    
    const args = ['scripts/sql-query.ts', query, '--stage', stage];
    if (options.db) {
      args.push('--db', options.db);
    }
    
    await runCommand('tsx', args, env);
  });

program.parseAsync().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});