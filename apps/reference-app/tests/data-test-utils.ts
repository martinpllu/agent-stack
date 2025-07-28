import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Get the test stage from environment or use current SST stage
 */
function getTestStage(): string {
  return process.env.TEST_STAGE || process.env.SST_STAGE || 'test';
}

export interface TestUserOptions {
  email: string;
  role?: 'admin' | 'user';
  password?: string;
  metadata?: Record<string, any>;
}

export interface TestTaskOptions {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
}

/**
 * Test data factory for creating consistent test data
 */
export class TestDataFactory {
  private createdUsers: Set<string> = new Set();
  private createdTasks: Set<string> = new Set();
  private stage: string = getTestStage();

  /**
   * Create a test user with automatic cleanup tracking
   */
  async createUser(options: TestUserOptions): Promise<{ userId: string; email: string }> {
    const args = [
      'tsx', 'scripts/create-user.ts',
      '--email', options.email,
      '--stage', this.stage
    ];

    if (options.role === 'admin') {
      args.push('--admin');
    }

    if (options.password) {
      args.push('--password', options.password);
    }

    try {
      const result = execSync(args.join(' '), {
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf-8'
      });

      this.createdUsers.add(options.email);
      
      // Parse the user ID from the output if available
      const userIdMatch = result.match(/User ID: ([a-zA-Z0-9-]+)/);
      const userId = userIdMatch ? userIdMatch[1] : 'unknown';

      return { userId, email: options.email };
    } catch (error) {
      console.error(`Failed to create user ${options.email}:`, error);
      throw error;
    }
  }

  /**
   * Create multiple test users
   */
  async createUsers(users: TestUserOptions[]): Promise<Array<{ userId: string; email: string }>> {
    return Promise.all(users.map(user => this.createUser(user)));
  }

  /**
   * Create a test task (would need corresponding script)
   */
  async createTask(options: TestTaskOptions): Promise<{ taskId: string }> {
    // This would call a script to create tasks
    // For now, we'll create a placeholder
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.createdTasks.add(taskId);
    
    console.log('Task creation script not yet implemented. Placeholder ID:', taskId);
    return { taskId };
  }

  /**
   * Create test data from a fixture file
   */
  async loadFixture(fixtureName: string): Promise<any> {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', `${fixtureName}.json`);
    
    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Fixture file not found: ${fixturePath}`);
    }

    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    
    // Process users if present
    if (fixtureData.users) {
      await this.createUsers(fixtureData.users);
    }

    // Process tasks if present
    if (fixtureData.tasks) {
      for (const task of fixtureData.tasks) {
        await this.createTask(task);
      }
    }

    return fixtureData;
  }

  /**
   * Clean up all created test data
   */
  async cleanup(): Promise<void> {
    // Clean up users
    for (const email of this.createdUsers) {
      try {
        execSync(`tsx scripts/sql-query.ts --stage ${this.stage} "DELETE FROM users WHERE email = '${email}'"`, {
          stdio: 'pipe',
          cwd: process.cwd()
        });
      } catch (error) {
        console.warn(`Failed to clean up user ${email}:`, error);
      }
    }

    // Clean up tasks
    for (const taskId of this.createdTasks) {
      try {
        execSync(`tsx scripts/sql-query.ts --stage ${this.stage} "DELETE FROM tasks WHERE id = '${taskId}'"`, {
          stdio: 'pipe',
          cwd: process.cwd()
        });
      } catch (error) {
        console.warn(`Failed to clean up task ${taskId}:`, error);
      }
    }

    this.createdUsers.clear();
    this.createdTasks.clear();
  }

  /**
   * Get the list of created entities for debugging
   */
  getCreatedEntities(): { users: string[]; tasks: string[] } {
    return {
      users: Array.from(this.createdUsers),
      tasks: Array.from(this.createdTasks),
    };
  }
}

/**
 * Database seeding utilities
 */
export const seed = {
  /**
   * Seed the database with a standard set of test data
   */
  standard: async (): Promise<void> => {
    const factory = new TestDataFactory();
    
    try {
      // Create standard test users
      await factory.createUsers([
        { email: 'admin@test.com', role: 'admin' },
        { email: 'user1@test.com', role: 'user' },
        { email: 'user2@test.com', role: 'user' },
      ]);

      // Create standard test tasks
      await factory.createTask({
        title: 'Test Task 1',
        description: 'First test task',
        priority: 'high',
        status: 'pending',
      });

      await factory.createTask({
        title: 'Test Task 2',
        description: 'Second test task',
        priority: 'medium',
        status: 'in_progress',
      });

      console.log('Standard test data seeded successfully');
    } catch (error) {
      console.error('Failed to seed standard test data:', error);
      throw error;
    }
  },

  /**
   * Seed minimal data for quick tests
   */
  minimal: async (): Promise<void> => {
    const factory = new TestDataFactory();
    
    await factory.createUser({
      email: 'test@example.com',
      role: 'user',
    });
  },

  /**
   * Clear all test data
   */
  clear: async (): Promise<void> => {
    try {
      // Clear test users (those with test emails)
      execSync(`tsx scripts/sql-query.ts --stage ${getTestStage()} "DELETE FROM users WHERE email LIKE '%@test.com' OR email LIKE 'test_%@example.com'"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      // Clear test tasks
      execSync(`tsx scripts/sql-query.ts --stage ${getTestStage()} "DELETE FROM tasks WHERE title LIKE 'Test%' OR title LIKE 'test_%'"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      console.log('Test data cleared successfully');
    } catch (error) {
      console.error('Failed to clear test data:', error);
      throw error;
    }
  },
};

/**
 * Test data validation utilities
 */
export const validate = {
  /**
   * Check if a user exists in the database
   */
  userExists: async (email: string): Promise<boolean> => {
    try {
      const result = execSync(
        `tsx scripts/sql-query.ts --stage ${getTestStage()} "SELECT id FROM users WHERE email = '${email}'" --json`,
        { stdio: 'pipe', cwd: process.cwd(), encoding: 'utf-8' }
      );
      const data = JSON.parse(result);
      return data.length > 0;
    } catch {
      return false;
    }
  },

  /**
   * Check if a task exists in the database
   */
  taskExists: async (taskId: string): Promise<boolean> => {
    try {
      const result = execSync(
        `tsx scripts/sql-query.ts --stage ${getTestStage()} "SELECT id FROM tasks WHERE id = '${taskId}'" --json`,
        { stdio: 'pipe', cwd: process.cwd(), encoding: 'utf-8' }
      );
      const data = JSON.parse(result);
      return data.length > 0;
    } catch {
      return false;
    }
  },
};

/**
 * Test environment utilities
 */
export const testEnv = {
  /**
   * Check if the test environment is properly set up
   */
  isReady: async (): Promise<boolean> => {
    // Check if SST dev server is running
    const sstServerExists = fs.existsSync('.sst') && 
      fs.readdirSync('.sst').some(file => file.endsWith('.server'));

    if (!sstServerExists) {
      console.error('SST dev server is not running. Run "npx sst dev" in a separate terminal.');
      return false;
    }

    // Check if database is accessible
    try {
      execSync(`tsx scripts/sql-query.ts --stage ${getTestStage()} "SELECT 1"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
    } catch {
      console.error('Database is not accessible.');
      return false;
    }

    return true;
  },

  /**
   * Wait for the test environment to be ready
   */
  waitUntilReady: async (timeout = 30000): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await testEnv.isReady()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Test environment did not become ready within timeout');
  },
};