# Agent Stack

A comprehensive workspace for building AI agent-friendly full-stack applications, containing both documentation tooling and a reference implementation.

## Workspace Structure

This is a pnpm workspace containing two independent applications:

### 📚 `apps/docs-server`
An MCP (Model Context Protocol) server that provides structured documentation access for AI coding agents. This server enables agents to access detailed implementation guides, best practices, and patterns through a simple `read-docs` command.

### 🚀 `apps/reference-app`  
A complete reference implementation of an agent-stack application, demonstrating modern full-stack patterns optimized for AI agent development. Built with React Router v7, Tailwind CSS, Hono, and SST v3.

## Quick Start

```bash
# Install all dependencies
pnpm install

# Start the documentation server
pnpm docs-server:dev

# Start the reference application
pnpm reference-app:dev

# Build all apps
pnpm build:all

# Run all tests
pnpm test:all
```

## Available Commands

### Documentation Server
```bash
pnpm docs-server:dev      # Start MCP server in development mode
pnpm docs-server:build    # Build the MCP server
pnpm docs-server:start    # Start the built MCP server
pnpm docs-server:test     # Run MCP server tests
```

### Reference Application
```bash
pnpm reference-app:dev     # Start Remix development server
pnpm reference-app:build   # Build the application
pnpm reference-app:deploy  # Deploy to AWS with SST
pnpm reference-app:test    # Run application tests
```

## Architecture Philosophy

Agent-stack is designed with AI agents in mind, providing:

- **Predictable patterns** - Consistent conventions across all components
- **Explicit abstractions** - Clear interfaces and well-defined boundaries
- **Type safety** - Full TypeScript support for better reliability
- **Documentation-driven** - Comprehensive guides accessible via MCP
- **Modern tooling** - Latest versions of proven technologies

## Technology Stack

### Frontend
- **React Router v7** - File-based routing with data loading
- **Tailwind CSS** - Utility-first styling with design systems
- **TypeScript** - Full type safety across components

### Backend  
- **Hono** - Lightweight, TypeScript-native HTTP framework
- **Repository Pattern** - Database abstraction for DynamoDB/PostgreSQL
- **Drizzle ORM** - Type-safe database operations

### Infrastructure
- **SST v3** - Infrastructure as code for AWS deployment
- **AWS Lambda** - Serverless functions with automatic scaling
- **CloudFront** - Global CDN for optimal performance

### Authentication
- **Clerk** - Complete user management with minimal setup

### Development
- **Vitest** - Fast unit and integration testing
- **ESLint** - Code quality and consistency
- **pnpm** - Fast, efficient package management

## Getting Started with Development

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd agent-stack
   pnpm install
   ```

2. **Start the documentation server** (for AI agent access):
   ```bash
   pnpm docs-server:dev
   ```

3. **Start the reference application**:
   ```bash
   pnpm reference-app:dev
   ```

4. **Begin development** using the patterns demonstrated in the reference app and guided by the documentation server.

## For AI Agents

If you're an AI agent working with this codebase:

1. Use `read-docs <topic>` to access specific documentation pages
2. Follow the established patterns shown in the reference application  
3. Prefer explicit over implicit implementations
4. Leverage TypeScript for better reliability
5. Write tests incrementally as you build features

The documentation server provides comprehensive guides for all aspects of agent-stack development, from basic setup to advanced deployment strategies.

## License

MIT 