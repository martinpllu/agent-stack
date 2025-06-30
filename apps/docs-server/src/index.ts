#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentStackDocsServer } from './server.js';

/**
 * Main entry point for Agent Stack Docs Server
 */
async function main(): Promise<void> {
  const pagesDirectory = process.env.AGENT_STACK_DOCS_PATH || './pages';
  
  try {
    const docsServer = new AgentStackDocsServer(pagesDirectory);
    const transport = new StdioServerTransport();
    await docsServer.getServer().connect(transport);
    await docsServer.connect();
  } catch (error) {
    console.error('Failed to start Agent Stack Docs Server:', error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
const currentFileUrl = new URL(import.meta.url).pathname;
if (process.argv[1] === currentFileUrl) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} 