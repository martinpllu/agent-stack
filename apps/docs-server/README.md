# Agent Stack Documentation Server

This is an MCP (Model Context Protocol) server that provides structured documentation access for AI coding agents working with the agent-stack framework.

## Purpose

The docs-server allows AI agents to access detailed documentation about agent-stack patterns, best practices, and implementation guides through a simple `read-docs` command. This enables agents to follow established conventions and implement features correctly.

## Available Documentation

The server provides access to comprehensive documentation including:

- **Frontend Development**: React Router patterns, Tailwind guidelines, UI components
- **Backend Development**: Hono API patterns, repository pattern, data modeling
- **Authentication & Security**: Clerk integration, security patterns
- **Testing & Quality**: Testing strategies, error handling, performance optimization
- **Deployment & Operations**: SST deployment, monitoring, troubleshooting
- **Development Workflow**: Project setup, feature development, code organization

## Usage

```bash
# Install dependencies
pnpm install

# Start the MCP server
pnpm start

# Development mode with auto-reload
pnpm dev

# Build the server
pnpm build

# Run tests
pnpm test
```

## MCP Integration

This server implements the Model Context Protocol and can be integrated with AI development environments. It provides a `read-docs` tool that allows agents to access specific documentation pages or multiple pages at once.

Example usage in agent interactions:
```bash
# Read a single documentation page
read-docs styling

# Read multiple pages at once  
read-docs styling,database,api
```

## Project Structure

```
apps/docs-server/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── server.ts          # MCP server implementation
│   ├── tools/
│   │   └── read-docs.ts   # Documentation reading tool
│   └── types.ts           # TypeScript type definitions
├── pages/                 # Documentation pages (markdown)
├── tests/                 # Test files
└── package.json          # Dependencies and scripts
```

This server is designed to be a reliable source of truth for agent-stack development patterns and practices. 