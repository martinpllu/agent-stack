#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

function loadEnvFromOutputs(stage?: string) {
  try {
    const outputsPath = join(process.cwd(), '.sst/outputs.json');
    const outputs = JSON.parse(readFileSync(outputsPath, 'utf8'));
    
    if (!outputs.database) {
      throw new Error('Database outputs not found in .sst/outputs.json');
    }

    const { clusterArn, secretArn, database } = outputs.database;
    
    // Set environment variables
    process.env.DB_CLUSTER_ARN = clusterArn;
    process.env.DB_SECRET_ARN = secretArn;
    process.env.DB_DATABASE = database;
    process.env.AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
    
    console.log(`Environment loaded for stage: ${database}`);
    return { clusterArn, secretArn, database };
  } catch (error) {
    console.error('Failed to load environment from SST outputs:', (error as Error).message);
    process.exit(1);
  }
}

// If called directly, load env and run the command passed as arguments
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  loadEnvFromOutputs();
  
  // Run the command passed as arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const child = spawn(args[0], args.slice(1), { 
      stdio: 'inherit',
      env: process.env 
    });
    
    child.on('exit', (code: number | null) => {
      process.exit(code || 0);
    });
  }
}

export { loadEnvFromOutputs };