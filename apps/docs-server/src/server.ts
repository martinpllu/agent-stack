import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ReadDocsTool } from './tools/read-docs.js';
import { ReadDocsParams } from './types.js';

export class AgentStackDocsServer {
  private server: Server;
  private readDocsTool: ReadDocsTool;

  constructor(pagesDirectory?: string) {
    this.server = new Server(
      {
        name: 'agent-stack',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.readDocsTool = new ReadDocsTool(pagesDirectory);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'read-docs') {
        try {
          if (!args || typeof args !== 'object' || !('pages' in args) || typeof args.pages !== 'string') {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Missing or invalid "pages" parameter. Please provide a comma-separated list of page names.'
            );
          }
          
          const params = args as unknown as ReadDocsParams;

          const result = await this.readDocsTool.execute(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new McpError(ErrorCode.InternalError, errorMessage);
        }
      }

      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    });
  }

  async connect(): Promise<void> {
    console.log('Agent Stack Docs Server starting...');
    console.log('Server name: agent-stack');
    console.log('Server version: 0.1.0');
    // The server will be connected via stdin/stdout when used as MCP server
  }

  getServer(): Server {
    return this.server;
  }
} 