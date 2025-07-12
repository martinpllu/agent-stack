# Team Task Tracker 

A demo application built with the agent-stack patterns, featuring:

- **Kanban board** with backlog, in-progress, and done columns
- **Authentication** with OpenAuth
- **Role-based access** (user, admin)
- **Database** with PostgreSQL and Drizzle ORM
- **Modern UI** with shadcn/ui and Tailwind CSS

## Tech Stack

- **Frontend**: React Router v7, shadcn/ui, Tailwind CSS
- **Backend**: React Router loaders/actions, Hono API (optional)
- **Database**: Aurora Serverless PostgreSQL with Drizzle ORM
- **Deployment**: SST v3 on AWS

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- AWS account with SST configured

### Installation

```bash
pnpm install
```

### Development

1. Start SST in development mode (in a separate terminal):
```bash
npx sst dev
```

2. The app will be available at the URL shown in the SST output.

## Database Setup

### Architecture

- **Production stage**: Has its own dedicated Aurora cluster
- **Creator stages** (`dev`, `staging`): Can create the shared development Aurora cluster
- **All other stages**: Reference the shared dev cluster but use their own database
- **Auto-scaling**: Scales to zero when inactive (10 min for dev, 60 min for prod)

### Setting Up a New Stage

1. **Ensure the shared cluster exists** (only needed once):
```bash
npx sst deploy --stage dev  # Creates the shared dev cluster
```

2. **Deploy your stage**:
```bash
npx sst deploy --stage your-name
```

3. **Create your stage's database**:
```bash
pnpm sql "CREATE DATABASE your_name;" --stage dev --db postgres
```

4. **Run migrations**:
```bash
pnpm migrate --stage your-name
```

### Database Operations

All database commands require the `--stage` parameter to specify which environment to target.

**Unified database commands**:
```bash
pnpm db studio --stage your-name    # Open Drizzle Studio browser
pnpm db generate --stage your-name  # Generate migration files  
pnpm db push --stage your-name      # Push schema changes directly
pnpm db migrate --stage your-name   # Run pending migrations
pnpm db sql "SELECT * FROM users;" --stage your-name  # Execute SQL
```

**Direct script access**:
```bash
pnpm migrate --stage your-name                        # Run migrations
pnpm sql "SELECT * FROM users;" --stage your-name     # Execute SQL queries
pnpm sql "SELECT COUNT(*) FROM tasks;" --stage production --db postgres
```

**Schema development workflow**:
```bash
# 1. Edit schema files in app/db/schema.ts
# 2. Generate migration files
pnpm db generate --stage your-name
# 3. Apply migrations
pnpm db migrate --stage your-name
```

## Access Levels

- **Guest**: View tasks (read-only)
- **User**: Create, edit own tasks, update status
- **Admin**: Full task management, assign tasks, delete any task

## Project Structure

```
apps/reference-app/
├── app/                    # React Router frontend
│   ├── routes/            # File-based routing
│   ├── components/        # UI components
│   └── lib/              # Utilities
├── lib/                   # Shared business logic
│   ├── db/               # Database schema
│   ├── repositories/     # Data access layer
│   └── services/         # Business logic
├── api/                   # Hono API (optional)
├── scripts/              # Database utilities
└── sst.config.ts         # SST config
```

## Deployment

```bash
npx sst deploy --stage production
```

## Contributing

This is a reference implementation demonstrating best practices for building full-stack applications with the agent-stack patterns.