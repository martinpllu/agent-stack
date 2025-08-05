#!/usr/bin/env tsx

/**
 * Utility to dynamically detect the React Router dev server URL
 * This avoids hardcoding port numbers in tests and scripts
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export function getDevServerUrl(): string {
  // Method 1: Check if SST is running by looking for .sst/server files
  const sstRunning = existsSync('.sst') && 
    execSync('find .sst -name "*.server" -type f 2>/dev/null || true')
      .toString()
      .trim()
      .length > 0;

  if (!sstRunning) {
    throw new Error(
      'SST dev server is not running. Please run "npx sst dev" in a separate terminal.'
    );
  }

  // Method 2: Try common React Router/Vite ports in order
  const commonPorts = [5176, 5173, 3000, 4173];
  
  for (const port of commonPorts) {
    try {
      // Try to make a simple HTTP request to check if server is responding
      const response = execSync(
        `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/ 2>/dev/null || echo "000"`,
        { encoding: 'utf8' }
      ).trim();
      
      if (response === '200' || response === '304') {
        console.log(`Found dev server running on port ${port}`);
        return `http://localhost:${port}`;
      }
    } catch (error) {
      // Port not available, continue to next
    }
  }

  // Method 3: Check running processes for Vite
  try {
    const processes = execSync('ps aux | grep -E "vite|react-router" | grep -v grep || true', {
      encoding: 'utf8'
    }).trim();
    
    // Try to extract port from process arguments
    const portMatch = processes.match(/--port[= ](\d+)/);
    if (portMatch) {
      return `http://localhost:${portMatch[1]}`;
    }
  } catch (error) {
    // Process check failed, continue
  }

  // Method 4: Check for .vite directory which might have port info
  if (existsSync('.vite')) {
    try {
      // Vite might store server info in .vite directory
      const viteFiles = execSync('find .vite -type f -name "*.json" 2>/dev/null || true', {
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);
      
      for (const file of viteFiles) {
        try {
          const content = readFileSync(file, 'utf8');
          const portMatch = content.match(/"port":\s*(\d+)/);
          if (portMatch) {
            return `http://localhost:${portMatch[1]}`;
          }
        } catch (e) {
          // Continue to next file
        }
      }
    } catch (error) {
      // .vite check failed, continue
    }
  }

  // Default fallback with warning
  console.warn(
    'Could not detect dev server port dynamically. Falling back to default port 5176.\n' +
    'If this fails, please check that the dev server is running and update the port detection logic.'
  );
  return 'http://localhost:5176';
}

// Allow running directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const url = getDevServerUrl();
    console.log(url);
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}