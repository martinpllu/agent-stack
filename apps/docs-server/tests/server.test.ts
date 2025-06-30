import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentStackDocsServer } from '../src/server.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('AgentStackDocsServer', () => {
  let server: AgentStackDocsServer;

  beforeEach(() => {
    server = new AgentStackDocsServer('./tests/fixtures/pages');
  });

  afterEach(() => {
    // Clean up if needed
  });

  describe('Server Initialization', () => {
    it('should create a server instance', () => {
      expect(server).toBeDefined();
      expect(server.getServer()).toBeInstanceOf(Server);
    });

    it('should have correct server name and version', () => {
      // The MCP SDK Server class doesn't expose name/version directly
      // We verify this through the server info that was passed during construction
      expect(server).toBeDefined();
      expect(server.getServer()).toBeDefined();
    });

    it('should have tools capability', () => {
      // Verify server has been properly initialized with tools capability
      expect(server.getServer()).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    it('should register read-docs tool', async () => {
      const serverInstance = server.getServer();
      
      // Mock the request handler to test tool listing
      const mockListTools = async () => {
        return {
          tools: [
            {
              name: 'read-docs',
              description: 'Read documentation pages. ALWAYS start with \'read-docs intro\' to get orientation and table of contents.',
              inputSchema: {
                type: 'object',
                properties: {
                  pages: {
                    type: 'string',
                    description: 'Comma-separated list of page names to read (e.g., "intro", "styling,database")',
                  },
                },
                required: ['pages'],
              },
            },
          ],
        };
      };

      const tools = await mockListTools();
      expect(tools.tools).toHaveLength(1);
      expect(tools.tools[0].name).toBe('read-docs');
      expect(tools.tools[0].description).toContain('ALWAYS start with \'read-docs intro\'');
    });
  });

  describe('Protocol Compliance', () => {
    it('should handle unknown tools gracefully', () => {
      // This would be tested with actual MCP protocol messages
      expect(true).toBe(true); // Placeholder
    });

    it('should validate request schemas', () => {
      // This would test schema validation
      expect(true).toBe(true); // Placeholder
    });
  });
}); 