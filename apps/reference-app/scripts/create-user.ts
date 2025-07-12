#!/usr/bin/env tsx

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { users } from '../app/db/schema';
import { eq } from 'drizzle-orm';

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

export interface CreateUserOptions {
  email: string;
  stage: string;
  isAdmin?: boolean;
  clean?: boolean;
}

export interface CreateUserResult {
  id: string;
  email: string;
  isAdmin: boolean;
  isValidated: boolean;
  createdAt: Date;
  wasExisting: boolean;
  wasDeleted: boolean;
}

// Load and set up environment from SST outputs for a specific stage
function setupEnvironment(stage: string): DatabaseConfig {
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
      database: stageDatabaseName,
      secretArn: secretArn,
      resourceArn: clusterArn,
      region: process.env.AWS_REGION || "eu-west-1",
      stage: stage
    };
  } catch (error) {
    throw new Error('Error loading database config from .sst/outputs.json. Make sure SST is running locally with "npx sst dev"');
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create a user in the database
 * @param options - User creation options
 * @returns Promise with user creation result
 * @throws Error if user exists and clean=false, or if email is invalid
 */
export async function createUser(options: CreateUserOptions): Promise<CreateUserResult> {
  const { email, stage, isAdmin = false, clean = false } = options;
  
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format provided');
  }

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
  });
  
  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  let wasExisting = false;
  let wasDeleted = false;
  
  if (existingUser.length > 0) {
    wasExisting = true;
    
    if (clean) {
      // Delete existing user
      await db
        .delete(users)
        .where(eq(users.email, email));
      wasDeleted = true;
    } else {
      // Fail if user exists and clean flag not set
      throw new Error(`User with email '${email}' already exists. Use --clean to delete and recreate.`);
    }
  }
  
  // Create new user
  const newUser = await db
    .insert(users)
    .values({
      email: email,
      isAdmin: isAdmin,
      isValidated: true, // Always create validated users
    })
    .returning();
  
  return {
    id: newUser[0].id,
    email: newUser[0].email,
    isAdmin: newUser[0].isAdmin,
    isValidated: newUser[0].isValidated,
    createdAt: newUser[0].createdAt!,
    wasExisting,
    wasDeleted
  };
}

async function createUserCLI(email: string, stage: string, isAdmin: boolean, clean: boolean): Promise<void> {
  try {
    console.log('🚀 Creating user...');
    console.log(`📧 Email: ${email}`);
    console.log(`👑 Admin: ${isAdmin ? 'Yes' : 'No'}`);
    console.log(`🗃️  Stage: ${stage}`);
    if (clean) {
      console.log('🧹 Clean mode: Will delete existing user if found');
    }
    console.log('');
    
    const result = await createUser({
      email,
      stage,
      isAdmin,
      clean
    });
    
    if (result.wasExisting && result.wasDeleted) {
      console.log('🗑️  Existing user deleted');
    }
    
    console.log('🎉 User created successfully!');
    console.log(`👤 User ID: ${result.id}`);
    console.log(`📧 Email: ${result.email}`);
    console.log(`👑 Admin: ${result.isAdmin ? 'Yes' : 'No'}`);
    console.log(`✓ Validated: ${result.isValidated ? 'Yes' : 'No'}`);
    console.log(`📅 Created: ${result.createdAt}`);
    console.log('');
    console.log('💡 The user can now log in to the application.');
    
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }
}

// CLI interface - only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = new Command();

  program
    .name('create-user')
    .description('Create a user in the database')
    .version('1.0.0')
    .requiredOption('-s, --stage <stage>', 'Stage name (e.g., martin, dev, production)')
    .requiredOption('-e, --email <email>', 'Email address for the user')
    .option('--admin', 'Create user as admin (default: false)')
    .option('--clean', 'Delete existing user if found before creating (default: false)')
    .action(async () => {
      const { stage, email, admin, clean } = program.opts();
      await createUserCLI(email, stage, !!admin, !!clean);
    });

  program.parseAsync().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}