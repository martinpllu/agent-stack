---
id: main
title: Core developer instructions
alwaysApply: true
priority: high
---

# Reading and writing documentation

- The `docs` folder contains everything that you need to know when working with this application. Always list the docs directory to familiarise yourself with the names of the available docs, and read individual files that are relevant to your task.
- It's extremely important to ensure that the docs are complete and accurate. Follow the 'boy scout' principle of leaving the docs better than you found it. Write the docs that you would hope to find when you're next working on a similar task. Feel free to create new markdown files in the `docs` folder when appropriate - use a descriptive name in kebab-case. Keep docs succinct to make best use of context.

# Verifying code changes

## Verification Requirements
Every code change MUST be verified to work correctly. The method of verification depends on the type and risk of the change:

### Automated Tests Required For:
- **New features** - User-facing functionality needs e2e tests
- **Bug fixes** - Prevent regressions with targeted tests
- **Critical paths** - Authentication, payments, data operations
- **Complex logic** - Business rules, calculations, state management
- **API changes** - Ensure contracts are maintained

### Interactive Verification Sufficient For:
- **UI/UX tweaks** - Styling, copy changes, layout adjustments
- **Refactoring** - Code cleanup with no behavior change
- **Documentation** - Updates to docs, comments, READMEs
- **Development tools** - Scripts, debugging utilities
- **Simple configuration** - Environment variables, feature flags

## Verification Methods

1. **Automated Tests**: Write Playwright tests with Page Object Models for UI changes, or unit tests for logic
2. **Interactive Verification**: Use `pnpm tsx scripts/debug-browser.ts` to programmatically verify changes work as expected
3. **Database State Verification**: Use `pnpm tsx scripts/sql-query.ts` to verify data changes, check constraints, and confirm expected database state
4. **Debug Scripts**: Create reproducible verification scripts in `/scripts/debug-scenarios/`
5. **Type Checking**: Run `pnpm typecheck` to catch type errors
6. **Existing Test Suite**: Run related tests to ensure no regressions

### Example Interactive Verification Flow
```bash
# 1. Use debug browser to perform user action
pnpm tsx scripts/debug-browser.ts
# In REPL: await debug.loginAsAdmin(); await debug.goto('/admin/users'); await debug.click('button:has-text("Delete")');

# 2. Verify database state
pnpm tsx scripts/sql-query.ts "SELECT * FROM users WHERE email = 'deleted-user@test.com'"
# Confirm user is marked as deleted or removed

# 3. Verify UI reflects the change
# In debug browser: await debug.inspect()
# Confirm user no longer appears in list
```

## Best Practices
- Document verification approach in commit messages
- For interactive verification, describe what was tested
- Consider the risk and impact when choosing verification method
- Write utilities for common testing processes
- Document test processes in the `docs` folder with prefix `test-` 

# Technology Stack

This is a modern full-stack serverless application using AWS services, with type safety from frontend to database.

## Frontend
- **React Router v7** (new name for Remix) - Full-stack React framework
- **React 19** with TypeScript
- **Tailwind CSS v4** + Radix UI components
- **Vite** for building

## Backend
- **Hono** - Lightweight API framework
- **AWS Lambda** functions
- **OpenAuth** for authentication

## Database
- **PostgreSQL** (AWS Aurora Serverless v2)
- **Drizzle ORM** for type-safe queries
- **DynamoDB** for auth sessions

## Infrastructure
- **SST v3** - Serverless framework managing:
  - VPC with managed NAT
  - Aurora PostgreSQL clusters
  - Lambda functions
  - DynamoDB tables
  - React app hosting

## Testing & Dev Tools
- **pnpm** for package management
- **Playwright** for E2E tests
- **Vitest** for unit tests
- **ESLint** for linting

# Workspace structure

## Application Code (/app)

### Routes (/app/routes)
File-based routing directory following React Router v7 conventions. Each file represents a route in the application, with nested routes created through dot notation (e.g., `admin.users.tsx` creates `/admin/users`). Common patterns include authentication flows (`auth.login.tsx`, `auth.callback.tsx`), protected routes requiring authentication, and role-based access control for admin interfaces.

### Components (/app/components)
- `/app/components/layout.tsx`: The application shell providing consistent navigation, authentication state management, and global UI elements across all pages.
- `/app/components/ui/`: Reusable UI component library, often based on shadcn/ui or similar systems. These atomic components (Button, Card, Dialog, etc.) ensure visual consistency and accessibility compliance throughout the application.
- `/app/components/[feature]/`: Feature-specific components organized by domain. For example, a task management feature might include `task-board.tsx`, `task-card.tsx`, and `task-dialog.tsx`.

### Database Layer (/app/db)
- `/app/db/schema.ts`: The canonical database schema definition using TypeScript and ORM syntax. This file serves as the source of truth for all database tables, relationships, and constraints, enabling type-safe database operations throughout the application.
- `/app/db/client.ts`: The centralized database connection manager and client configuration. This architectural chokepoint ensures all database access flows through a single, properly configured client, enabling connection pooling, monitoring, and environment-specific settings.
- `/app/db/repositories/`: Implementation of the Repository pattern providing a clean abstraction over raw database queries. Each repository (e.g., `user-repository.ts`, `task-repository.ts`) encapsulates all database operations for a specific domain entity, ensuring business logic remains decoupled from data access concerns.

### Authentication (/app/auth)
- `/app/auth/auth-server.ts`: Server-side authentication utilities managing session validation, token verification, and user context. This module provides helper functions that can be composed into route loaders and actions.
- `/app/auth/auth-middleware.ts`: Route protection middleware implementing authentication guards. This ensures unauthorized users cannot access protected resources and handles redirect flows for unauthenticated requests.
- `/app/auth/auth-actions.ts`: React Router server actions handling authentication operations like login, logout, and session refresh. These actions integrate with the backend authentication service.

### Models and Types
- `/app/model/`: Domain model definitions representing core business entities. These TypeScript interfaces and types (e.g., `task.ts` with Task interface and TaskStatus enum) ensure type safety across frontend and backend code.
- `/app/types/`: Shared type definitions for cross-cutting concerns. Common examples include user types with role definitions, API response formats, and utility types used throughout the application.

### Utilities
- `/app/utils/error-handler.ts`: Centralized error handling providing consistent error responses, logging, and user-friendly error messages. This ensures all errors are properly caught, logged, and presented to users in a standardized format.
- `/app/utils.ts`: General utility functions and helpers used across the application, such as date formatting, string manipulation, or validation functions.
- `/app/root.tsx`: The React Router root component establishing the application's provider hierarchy, error boundaries, and global layout structure.
- `/app/routes.ts`: Route configuration and metadata definitions, including route guards, data loading strategies, and SEO metadata.
- `/app/app.css`: Global styles and CSS framework imports. This typically includes Tailwind CSS directives and any global custom styles.

## Backend Services

### Authentication Service (/auth)
- `/auth/index.ts`: Lambda function handler implementing authentication endpoints. This service typically integrates with OpenAuth or similar providers to handle authentication flows, token generation, and session management.
- `/auth/[storage].ts`: Storage adapters for authentication data. Development environments might use file-based storage (`file-storage.ts`) while production uses DynamoDB or similar services.
- `/auth/subjects.ts`: Authentication provider configuration defining supported authentication methods (e.g., email/password, OAuth providers, passwordless flows).

## Database Scripts (/scripts)
- `/scripts/db.ts`: Unified database CLI providing commands for common operations like opening a database GUI (studio), running migrations, and checking migration status. This simplifies database management across different environments.
- `/scripts/migrate.ts`: Migration runner that applies database schema changes in a controlled manner. It handles environment detection, connection management, and migration tracking.
- `/scripts/create-[entity].ts`: Data creation utilities for development and testing. Examples include `create-user.ts` for user creation with proper role assignment and password hashing.
- `/scripts/sql-query.ts`: Direct SQL query executor for debugging and maintenance tasks. This provides a safe way to run ad-hoc queries against the database with proper credential management.
- `/scripts/load-env.ts`: Environment configuration loader ensuring all scripts have access to necessary environment variables and AWS credentials.
- `/scripts/delete-all-data.ts`: **DANGEROUS** - Database cleanup utility that completely wipes all data from the database. **IMPORTANT: This script should NEVER be run automatically by agents or assistants. It must only be executed manually by developers who fully understand the consequences. This script will permanently delete all data without possibility of recovery.**

## Debugging Utilities (/scripts and /tests/test-helpers)
- `/scripts/debug-browser.ts`: Interactive browser debugging REPL. Run with `pnpm tsx scripts/debug-browser.ts` to launch a browser with helper commands for navigation, login, element inspection, and troubleshooting. Useful for debugging both tests and general application issues.
- `/scripts/debug-scenarios/`: Pre-built debugging scripts for common workflows like admin flows and reproducing test failures.
- `/tests/test-helpers/debug-on-failure.ts`: Enhanced error reporting that automatically captures screenshots, DOM, visible text, and interactive elements when tests fail. Add to any test with `test.afterEach(async ({ page }, testInfo) => await captureDebugInfo(page, testInfo))`.
- `/tests/test-helpers/login-helper.ts`: Robust login helpers with debug output for authentication flows.

## Database Migrations (/drizzle)
Version-controlled database schema migrations following a sequential naming pattern (e.g., `0000_initial_schema.sql`, `0001_add_user_roles.sql`). The `/drizzle/meta/` directory contains migration metadata tracking which migrations have been applied to each environment.

## Tests
- `/tests/`: End-to-end test files using Playwright. Tests are typically organized by feature (e.g., `auth.test.ts`, `task-management.test.ts`) and include both happy path and error scenarios.
- `/tests/[feature]-test-utils.ts`: Reusable test utilities and helpers specific to testing certain features, reducing duplication across test files.

## Static Assets
- `/public/`: Static files served directly by the web server, including favicons, robots.txt, and any other assets that don't require processing.

# Workflow: SST local app development

- This app uses SSTv3.
- Note that there are significant differences between SSTv2 and v3. Please consult https://sst.dev/docs/ or inform the user if you are not familiar with v3.
- The user runs the app locally via `npx sst dev`
- You can assume that the app is running locally. If you think it's not running, confirm by running `find .sst -name "*.server" -type f` to check if a .server file exist in `.sst/`. If it exists, the app is running locally. If not, the app is not running. Ask the user to start it by running "npx sst dev" in a separate terminal. Don't try to do anything further until the user has started the server.
- Never run `npx sst dev` yourself. If it needs started or restarted, ask the user to run it in a separate terminal.
- Logs are written to `.sst/log`. The exact logs will depend on the type of application and infrastructure used, but they may include:
   - `.sst/log/pulumi.log` - infrastructure logs
   - `.sst/lambda/<MyFunction>/<id>.log` - lambda invocation logs
   - `.sst/log/web.log` - web app logs (e.g. nextjs or React Router app). You can get the URL of the web app in this log.
- `.sst/outputs.json` contains infrastructure outputs, e.g. backend endpoints.
- As the application is running in sst dev mode, all changes to backend/frontend code and infrastructure (in sst.config.ts) will be automatically reloaded. Code reloading takes a few seconds. Infrastructure changes can take longer so you might want to watch the logs.

# Workflow: AWS commands

- Always run `[ -f ./env.sh ] && source ./env.sh` before any AWS CLI commands. 
- CRITICAL: Only run read-only AWS CLI commands unless explicitly instructed by the user.

# Workflow: Post-change checklist

Always consider doing these checks after making changes:

- Ensure that all changes have been verified, as per "Verifying code changes" above.
- Run `pnpm typecheck`. 
- Run tests to ensure no regressions.
- Update docs if required.
- Create an Architecture Decision Record if appropriate.
- Suggest a commit comment with Conventional Commits format.

# Workflow: Architecture Decision Records
When making architecturally significant changes, create an ADR in `/docs/adrs/`:
- Use format: `ADR-NNNN-title-in-kebab-case.md`
- Follow Nygard template: Status, Context, Decision, Consequences
- Architecturally significant = affects structure, non-functional requirements, dependencies, interfaces, or construction techniques
- Always link related ADRs and update status of superseded decisions

