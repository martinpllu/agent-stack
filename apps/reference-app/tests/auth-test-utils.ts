import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export interface TestUser {
  email: string;
  isAdmin: boolean;
}

export interface CodeCapture {
  email: string;
  code: string;
  timestamp: string;
}

/**
 * Get the test stage from environment or use current SST stage
 */
function getTestStage(): string {
  return process.env.TEST_STAGE || process.env.SST_STAGE || 'test';
}

/**
 * Creates test users using the create-user script
 */
export async function createTestUsers(users: TestUser[], clean = true): Promise<void> {
  const stage = getTestStage();
  
  for (const user of users) {
    const args = [
      'tsx', 'scripts/create-user.ts',
      '--email', user.email,
      '--stage', stage
    ];
    
    if (user.isAdmin) {
      args.push('--admin');
    }
    
    if (clean) {
      args.push('--clean');
    }

    try {
      // Use proper command with arguments array
      const command = args[0];
      const commandArgs = args.slice(1);
      execSync(`${command} ${commandArgs.join(' ')}`, { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log(`Created test user: ${user.email}${user.isAdmin ? ' (admin)' : ''}`);
    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
      throw error;
    }
  }
}

/**
 * Monitors auth function logs to capture verification codes
 */
export function startCodeCapture(): {
  stop: () => void;
  getCode: (email: string) => Promise<string>;
} {
  const capturedCodes = new Map<string, CodeCapture>();
  
  // Find the latest auth function log file
  const logDir = '.sst/lambda/AuthFunction';
  let logProcess: any = null;
  
  const getCode = async (email: string): Promise<string> => {
    // Wait up to 30 seconds for the code to appear
    const timeout = 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // First check captured codes from log monitoring
      const captured = capturedCodes.get(email);
      if (captured) {
        return captured.code;
      }
      
      // Primary method: read from file storage (since we're in dev mode)
      const fileStoragePath = `/tmp/openauth-storage/code_${email}.json`;
      if (existsSync(fileStoragePath)) {
        try {
          const fileData = JSON.parse(readFileSync(fileStoragePath, 'utf8'));
          // Handle the actual storage format: {value: {code, email, expires}}
          const code = fileData.value?.code || fileData.code;
          if (code) {
            console.log(`Found code in file storage for ${email}: ${code}`);
            return code;
          }
        } catch (e) {
          console.log(`Error reading file storage for ${email}:`, e);
          // File might be corrupted or in use, continue waiting
        }
      }
      
      // Check different possible file storage paths
      const altPaths = [
        `/tmp/openauth-storage/code.${email}.json`,
        `/tmp/openauth-storage/${email}_code.json`,
        `/tmp/openauth-storage/${email}.json`
      ];
      
      for (const altPath of altPaths) {
        if (existsSync(altPath)) {
          try {
            const fileData = JSON.parse(readFileSync(altPath, 'utf8'));
            const code = fileData.value?.code || fileData.code;
            if (code) {
              console.log(`Found code in alt path ${altPath} for ${email}: ${code}`);
              return code;
            }
          } catch (e) {
            // Continue checking other paths
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    throw new Error(`No verification code found for ${email} within ${timeout}ms`);
  };

  const stop = () => {
    if (logProcess) {
      logProcess.kill();
    }
  };

  // Start monitoring logs if the directory exists
  if (existsSync(logDir)) {
    try {
      logProcess = spawn('tail', ['-f', `${logDir}/*.log`], {
        stdio: 'pipe'
      });
      
      logProcess.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          // Match the format: [SendCode] *** VERIFICATION CODE FOR email: code *** at timestamp
          const match = line.match(/\[SendCode\] \*\*\* VERIFICATION CODE FOR (.+?): (\d{6}) \*\*\* at (.+)/);
          if (match) {
            const [, email, code, timestamp] = match;
            capturedCodes.set(email, { email, code, timestamp });
            console.log(`Captured verification code for ${email}: ${code}`);
          }
        }
      });
      
      logProcess.stderr?.on('data', (data: Buffer) => {
        console.log('Log monitor stderr:', data.toString());
      });
    } catch (error) {
      console.warn('Could not start log monitoring:', error);
    }
  }

  return { stop, getCode };
}

/**
 * Clean up test data
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  // The create-user script with --clean flag handles this, 
  // but we could add additional cleanup here if needed
  console.log('Test cleanup completed');
}