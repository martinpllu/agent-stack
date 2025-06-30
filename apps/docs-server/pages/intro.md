# agent-stack: Introduction for AI Agents

## Your Role

You are working within **agent-stack**, a framework designed for AI agents to build full-stack web applications autonomously. The stack provides predictable patterns and clear abstractions optimized for AI reasoning about code.

## Documentation Access

Use `read-docs` to access detailed documentation during development:

```bash
# Single page
read-docs styling

# Multiple pages
read-docs styling,database,api
```

**Always consult documentation before implementing features or making architectural decisions.**

## Architecture

- **Frontend**: React Router v7 (file-based routing, loaders/actions) + shadcn/ui + Tailwind CSS
- **API**: Hono for external HTTP endpoints (internal needs use React Router loaders/actions)
- **Database**: Repository pattern abstracting DynamoDB or PostgreSQL via Drizzle ORM
- **Auth**: Clerk for user authentication
- **Infrastructure**: SST v3 deploys to AWS Lambda + CloudFront
- **Development**: Live local environment with type safety

## File Structure

```
my-app/
├── app/                    # React Router frontend
│   ├── routes/            # File-based routing
│   ├── components/        # Reusable UI components
│   └── lib/               # Shared utilities
├── api/                   # Hono API endpoints
├── lib/                   # Shared business logic
│   ├── repositories/      # Database abstraction
│   ├── services/          # Business logic
│   └── types/             # TypeScript types
├── tests/                 # Vitest tests
└── sst.config.ts          # SST deployment config
```

## Key Principles

1. **Follow patterns** - Consistency is built into the stack
2. **Use TypeScript fully** - Leverage type safety
3. **Test incrementally** - Write tests as you build
4. **Read docs proactively** - Use `read-docs` before implementing

## SST Local Development

- **Running locally**: User runs `npx sst dev` (SST v3)
- **Never run `npx sst dev` yourself** - Ask user to run it in a separate terminal
- **Check if running**: Run `find .sst -name "*.server" -type f` - if files exist, app is running
- **Auto-reload**: Code changes reload automatically (few seconds), infrastructure changes take longer
- **Logs locations**:
  - `.sst/log/pulumi.log` - Infrastructure logs
  - `.sst/lambda/<Function>/<id>.log` - Lambda invocation logs
  - `.sst/log/web.log` - Web app logs (contains app URL)
  - `.sst/outputs.json` - Infrastructure outputs (endpoints, etc.)

## Available Documentation

### Frontend
- **react-router-patterns** - Routing, loaders, actions, error boundaries
- **tailwind-guidelines** - Styling patterns and utilities
- **shadcn-components** - Component patterns and customization

### Backend
- **hono-api-patterns** - HTTP endpoints and middleware
- **repository-pattern** - Database abstraction implementation
- **data-modeling** - Entity design for SQL/NoSQL

### Core Systems
- **clerk-integration** - Authentication and protected routes
- **security-patterns** - Authorization and validation
- **testing-strategies** - Unit and integration testing
- **error-handling** - Consistent error patterns
- **performance-optimization** - Query and bundle optimization

### Operations
- **sst-deployment** - Infrastructure configuration
- **monitoring-observability** - Logging and metrics
- **troubleshooting-guide** - Common issues and debugging

### Workflow
- **project-setup** - Initial scaffolding
- **feature-development** - Implementation workflow
- **code-organization** - Structure conventions

### Example Usage

Starting a new feature:
```bash
read-docs react-router-patterns,shadcn-components,repository-pattern
```

Debugging auth issues:
```bash
read-docs clerk-integration,security-patterns,troubleshooting-guide
```