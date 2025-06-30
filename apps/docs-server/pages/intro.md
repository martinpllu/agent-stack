# agent-stack: Introduction for AI Agents

## Your Role in the Development Process

You are working within **agent-stack**, a framework specifically designed to enable AI agents like yourself to build full-stack web applications autonomously. This stack has been carefully curated to provide predictable patterns, explicit conventions, and clear abstractions that make it easier for you to understand application state, debug issues, and make confident changes to codebases.

Your primary objective is to handle routine development tasks - implementing features, fixing bugs, writing tests, and deploying applications - while allowing human engineers to focus on creative problem-solving and strategic decisions. The technologies and patterns in agent-stack have been chosen specifically because they are transparent, well-documented, and follow consistent conventions that align with how AI models reason about code.

## How to Use This Documentation

You have access to detailed documentation for each aspect of agent-stack development through a documentation server. Use the `read-docs` command to access specific documentation pages whenever you need guidance during your work.

### Using the read-docs Command

The `read-docs` command is your primary tool for accessing detailed documentation. You can and should use it at any point during development when you need specific guidance:

```bash
# Read a single documentation page
read-docs styling

# Read multiple pages at once
read-docs styling,database

# Read all relevant pages for a complex task
read-docs styling,database,api
```

**Important**: Always use `read-docs` to fetch relevant documentation before implementing features, fixing bugs, or making architectural decisions. The documentation contains essential patterns, best practices, and examples that will help you work effectively within agent-stack.

## Architecture Overview

agent-stack follows a modern serverless architecture deployed on AWS, with clear separation between layers:

- **Frontend Layer**: React Router v7 with shadcn/ui component library and Tailwind CSS handles user interface and routing
- **API Layer**: Hono provides TypeScript HTTP endpoints for backend operations  
- **Data Layer**: Repository pattern abstracts DynamoDB or PostgreSQL databases via Drizzle ORM
- **Authentication**: Clerk manages user sessions and authentication flows
- **Infrastructure**: SST v3 deploys everything to AWS Lambda with CloudFront distribution
- **Development**: Live local development environment with instant updates and type safety

## Core Components

### 1. Frontend: React Router v7 + shadcn/ui + Tailwind CSS

**React Router v7** provides the frontend framework with these key characteristics:
- **File-based routing** - Routes are defined by file structure in `app/routes/`
- **Data loading** - Each route can export `loader` functions for server-side data fetching
- **Form handling** - Routes export `action` functions to handle form submissions
- **Error boundaries** - Built-in error handling with `ErrorBoundary` exports
- **TypeScript-first** - Full type safety between loaders, actions, and components

**shadcn/ui** provides the component library foundation:
- **Copy-paste components** - High-quality, customizable components you own completely
- **Built on Radix UI** - Accessible primitives with full keyboard navigation and ARIA support
- **Tailwind CSS styled** - All components use Tailwind for consistent, maintainable styling
- **TypeScript-native** - Full type safety for component props and variants
- **Customizable** - Easy to modify and extend components for specific design needs

**Tailwind CSS** handles all styling:
- **Utility-first** - Styles are applied directly in JSX using class names
- **No CSS files** - All styling is visible inline, making it easy to understand and modify
- **Design system** - Built-in spacing, colors, and responsive patterns
- **Predictable** - Class names map directly to CSS properties



### 2. Backend API: Hono

**Hono** provides lightweight HTTP API endpoints for external consumption and operations beyond React Router's capabilities:
- **External API endpoints** - RESTful APIs intended for consumption by external clients, mobile apps, or third-party integrations
- **Public API services** - Endpoints that need to be accessible outside the main web application
- **TypeScript-native** - Full type safety for request/response handling
- **Simple routing** - Clear URL patterns with parameter extraction
- **Middleware support** - Authentication, logging, error handling, and rate limiting
- **JSON-first** - Built-in JSON request/response handling
- **AWS Lambda optimized** - Designed for serverless deployment

Note: For internal application data needs (loading data for pages, handling form submissions), use React Router's built-in loaders and actions rather than separate API endpoints.


### 3. Database Layer: Repository Pattern

The database layer uses a **repository pattern** that abstracts whether you're using DynamoDB or PostgreSQL:
- **Consistent interface** - Same methods work with both databases
- **Type-safe operations** - Full TypeScript support for all database operations
- **Error handling** - Built-in logging and error recovery
- **Transaction support** - Appropriate to each database type

**DynamoDB Configuration** (cost-optimized):
- Single table design with GSI (Global Secondary Index) patterns
- Pay-per-request billing
- Built-in AWS SDK integration

**PostgreSQL Configuration** (relational data):
- Aurora Serverless v2 for scale-to-zero
- Drizzle ORM for type-safe queries and migrations
- Connection pooling and transaction management


### 4. Authentication: Clerk

**Clerk** provides complete user authentication with minimal configuration:
- **Component-based** - Drop-in React components for sign-in/sign-up flows
- **Session management** - Automatic token handling and refresh
- **User management** - Built-in user profiles and settings
- **Type-safe** - Full TypeScript support for user data and permissions



### 5. Deployment: SST v3

**SST (Serverless Stack)** handles all AWS infrastructure and deployment:
- **Infrastructure as Code** - All AWS resources defined in TypeScript
- **Local development** - Live Lambda development with instant updates
- **Type-safe config** - Infrastructure configuration with full TypeScript support
- **AWS best practices** - Security, monitoring, and cost optimization built-in



## File Organization

agent-stack applications follow a predictable structure:

```
my-app/
├── app/                    # React Router frontend
│   ├── routes/            # File-based routing
│   ├── components/        # Reusable UI components
│   └── lib/               # Shared utilities
├── api/                   # Hono API endpoints
├── lib/                   # Shared business logic
│   ├── repositories/      # Database abstraction layer
│   ├── services/          # Business logic services
│   └── types/             # TypeScript type definitions
├── tests/                 # Vitest test files
└── sst.config.ts          # SST deployment configuration
```

## Key Principles for AI Agents

When working within agent-stack, keep these principles in mind:

1. **Follow established patterns** - The stack is designed for consistency
2. **Prefer explicit over implicit** - Make intent clear in your code
3. **Use TypeScript fully** - Leverage type safety for better reliability  
4. **Test incrementally** - Write tests as you build features
5. **Monitor and log** - Include observability in your implementations
6. **Read documentation proactively** - Use `read-docs` before implementing features

This architecture is designed to be transparent and predictable, making it easier for you to understand application state, debug issues, and implement new features confidently.

## Documentation Guide

The following documentation pages are available through the `read-docs` command. Use this command whenever you need detailed guidance for implementing specific aspects of agent-stack applications:

### Frontend Development
- **react-router-patterns** - File-based routing conventions, data loading with loaders, form handling with actions, and error boundary patterns
- **tailwind-guidelines** - Component styling patterns, responsive design conventions, and utility class combinations for common UI elements
- **shadcn-components** - shadcn/ui component implementation patterns, customization strategies, and best practices for building accessible interfaces

### Backend Development  
- **hono-api-patterns** - HTTP endpoint conventions, middleware usage, request/response handling, and error management strategies
- **repository-pattern** - Database abstraction layer implementation, consistent interfaces for DynamoDB and PostgreSQL, and transaction handling
- **data-modeling** - Entity design patterns, relationship modeling, and schema evolution strategies for both SQL and NoSQL approaches

### Authentication & Security
- **clerk-integration** - User authentication setup, protected route patterns, session management, and user profile handling
- **security-patterns** - Authorization strategies, input validation, rate limiting, and secure data handling practices

### Testing & Quality
- **testing-strategies** - Unit testing with Vitest, integration testing approaches, and mocking patterns for repositories and external services
- **error-handling** - Consistent error handling patterns, logging strategies, and graceful degradation techniques
- **performance-optimization** - Database query optimization, caching strategies, and bundle size management

### Deployment & Operations
- **sst-deployment** - Infrastructure configuration, environment management, and AWS resource setup
- **monitoring-observability** - Logging patterns, metrics collection, error tracking, and application health monitoring
- **troubleshooting-guide** - Common issues, debugging strategies, and resolution patterns for development and production environments

### Development Workflow
- **project-setup** - Initial project scaffolding, dependency management, and development environment configuration
- **feature-development** - Step-by-step feature implementation workflow, from requirements to deployment
- **code-organization** - File structure conventions, module organization, and dependency management patterns

### Example Usage

When starting a new feature that involves creating a new page with data loading and styling:
```bash
# Read all relevant documentation before starting
read-docs react-router-patterns,shadcn-components,tailwind-guidelines,repository-pattern
```

When debugging authentication issues:
```bash
# Get specific guidance for auth problems
read-docs clerk-integration,security-patterns,troubleshooting-guide
```

Remember: The `read-docs` command is available at any time during your work. Don't hesitate to use it whenever you need clarification or best practices for any aspect of agent-stack development.