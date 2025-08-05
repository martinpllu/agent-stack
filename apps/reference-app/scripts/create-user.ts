#!/usr/bin/env tsx

import { Command } from 'commander';
import { createDrizzleDb } from '../app/db/client.js';
import { users, tasks } from '../app/db/schema';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

  // Create database instance using centralized client with retry logic
  const db = createDrizzleDb(stage);
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      if (!clean) {
        throw new Error(`User with email ${email} already exists. Use --clean to recreate.`);
      }
      
      // Delete existing user and their tasks
      await db.delete(tasks).where(eq(tasks.userId, existingUser[0].id));
      await db.delete(users).where(eq(users.email, email));
      
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          isAdmin,
          isValidated: true
        })
        .returning();
      
      return {
        ...newUser,
        wasExisting: true,
        wasDeleted: true
      };
    }
    
    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        isAdmin,
        isValidated: true
      })
      .returning();
    
    return {
      ...newUser,
      wasExisting: false,
      wasDeleted: false
    };
  } catch (error) {
    if ((error as Error).message?.includes('Database configuration not found')) {
      throw new Error('Error loading database config. Make sure SST is running locally with "npx sst dev"');
    }
    throw error;
  }
}

// CLI Command handling
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const program = new Command();
  
  program
    .name('create-user')
    .description('Create a user in the database')
    .version('1.0.0')
    .requiredOption('-e, --email <email>', 'User email address')
    .requiredOption('-s, --stage <stage>', 'Stage name (e.g., dev, staging, production)')
    .option('-a, --admin', 'Create user as admin', false)
    .option('-c, --clean', 'Delete existing user before creating', false)
    .action(async () => {
      const cliOptions = program.opts();
      const options: CreateUserOptions = {
        email: cliOptions.email,
        stage: cliOptions.stage,
        isAdmin: cliOptions.admin, // Map 'admin' to 'isAdmin'
        clean: cliOptions.clean
      };
      
      try {
        console.log('🚀 Creating user...');
        const result = await createUser(options);
        
        if (result.wasDeleted) {
          console.log('🗑️  Deleted existing user and their tasks');
        }
        
        console.log('✅ User created successfully!');
        console.log(`📧 Email: ${result.email}`);
        console.log(`🆔 ID: ${result.id}`);
        console.log(`👤 Admin: ${result.isAdmin ? 'Yes' : 'No'}`);
        console.log(`✓  Validated: ${result.isValidated ? 'Yes' : 'No'}`);
        console.log(`📅 Created: ${result.createdAt.toISOString()}`);
      } catch (error) {
        console.error('❌ Error:', (error as Error).message);
        process.exit(1);
      }
    });
  
  program.parseAsync().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}