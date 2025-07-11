# Team Task Tracker - Reference App

A full-stack team task tracker application built with the agent-stack patterns, featuring:

- **Kanban board** with backlog, in-progress, and done columns
- **Role-based access** (guest, user, admin)
- **Authentication** with Clerk
- **Database** with PostgreSQL and Drizzle ORM
- **Modern UI** with shadcn/ui and Tailwind CSS

## Features

- 📋 Visual kanban board for task management
- 👥 Team collaboration with task assignments
- 🎨 Beautiful, responsive UI
- 🚀 Fast performance with React Router v7
- 📱 Mobile-friendly design
- 🌟 Aurora Serverless v2 PostgreSQL with scale-to-zero capability
- 📦 Stage-based database separation (dev cluster shared, prod cluster isolated)

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
- (Optional) Docker for local PostgreSQL

### Environment Setup

1. Copy the environment variables:
```bash
cp .env.example .env
```

2. Update `.env` with your values (only needed for local PostgreSQL):
```env
# Database (for local development only)
DATABASE_URL=postgresql://user:password@localhost:5432/tasktracker
```

### Installation

1. Install dependencies:
```bash
pnpm install
```

### Development

1. Start SST in development mode (in a separate terminal):
```bash
npx sst dev
```

2. The app will be available at the URL shown in the SST output.

## Access Levels

### Guest Access
- View all tasks
- Filter by status
- Read-only access

### User Access
- Create new tasks
- Edit own tasks
- Update task status

### Admin Access
- Full task management
- Assign tasks to users
- Delete any task

## Project Structure

```
apps/reference-app/
├── app/                    # React Router frontend
│   ├── routes/            # File-based routing
│   ├── components/        # UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── tasks/        # Task-specific components
│   └── lib/              # Utilities
├── lib/                   # Shared business logic
│   ├── db/               # Database schema and client
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   └── types/            # TypeScript types
├── api/                   # Hono API endpoints (optional)
├── tests/                 # Test files
└── sst.config.ts         # SST deployment config
```

## Deployment

Deploy to AWS with SST:

```bash
npx sst deploy --stage production
```

## Contributing

This is a reference implementation demonstrating best practices for building full-stack applications with the agent-stack patterns.

## Database Architecture

### Aurora Serverless Setup

The application uses AWS Aurora Serverless v2 with PostgreSQL:

- **Production stage**: Has its own dedicated Aurora cluster
- **Creator stages** (`dev`, `staging`): Can create the shared development Aurora cluster
- **All other stages** (e.g., `feature123`, `bob`, `myenv`): Reference the shared dev cluster
- **Scale to zero**: Configured to pause after inactivity (10 minutes for dev, 60 minutes for prod)
- **Database separation**: Each stage creates and uses its own database within the cluster

### Configuration

- **Min capacity**: 0 ACU (scales to zero)
- **Max capacity**: 4 ACU for dev, 16 ACU for production
- **Auto-pause**: 10 minutes for dev, 60 minutes for production
- **PostgreSQL version**: 16.4

## Development

### Prerequisites

- Node.js 18+
- pnpm
- AWS account with SST configured
- (Optional) Docker for local PostgreSQL

### Setup

1. Install dependencies:
```bash
pnpm install
```

### Running Locally

#### Option 1: With Aurora Serverless (Recommended)

Deploy to your dev stage:
```bash
npx sst dev
```

This will:
- Create a VPC and Aurora cluster if they don't exist
- Set up your database with the stage name as the database/schema
- Start the development server with hot reloading

#### Option 2: With Local PostgreSQL

If you want to run with a local PostgreSQL database:

1. Start PostgreSQL locally:
```bash
docker run \
  --rm \
  -p 5432:5432 \
  -v $(pwd)/.sst/storage/postgres:/var/lib/postgresql/data \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=local \
  postgres:16.4
```

2. Set the DATABASE_URL environment variable:
```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/local"
```

3. Run the development server:
```bash
pnpm dev
```

### Stage Database Setup

When deploying a new stage, you need to create its database within the shared Aurora cluster:

#### For Personal Dev Stages

1. **Deploy your stage** (this creates the infrastructure but not the database):
```bash
npx sst deploy --stage your-stage-name
```

2. **Create the stage database**:
```bash
node scripts/sql-query.js "CREATE DATABASE your_stage_name;" --db=postgres
```

3. **Run database migrations**:
```bash
pnpm db:push
```

   **Note**: If `pnpm db:push` fails with Aurora Data API, you can create tables manually:
```bash
# Create the enum
node scripts/sql-query.js "CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');"

# Create users table
node scripts/sql-query.js "CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, last_login TIMESTAMPTZ, is_admin BOOLEAN NOT NULL DEFAULT false, is_validated BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());"

# Create tasks table
node scripts/sql-query.js "CREATE TABLE tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL, status task_status NOT NULL DEFAULT 'todo', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());"

# Create index
node scripts/sql-query.js "CREATE INDEX tasks_user_id_status_idx ON tasks (user_id, status);"
```

4. **Verify the setup**:
```bash
node scripts/sql-query.js "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

#### Example for a stage named "feature123":

```bash
# 1. Deploy the stage
npx sst deploy --stage feature123

# 2. Create the database (note: hyphens become underscores)
node scripts/sql-query.js "CREATE DATABASE feature123;" --db=postgres

# 3. Run migrations
pnpm db:push

# 4. Verify tables exist
node scripts/sql-query.js "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

**Important Notes:**
- Stage names with hyphens are converted to underscores for database names (e.g., `feature-123` → `feature123`)
- You must connect to the `postgres` database to create new databases (using `--db=postgres`)
- The shared dev cluster must already exist (created by `dev` or `staging` stages)

### Database Migrations

The project uses Drizzle ORM with custom migration scripts that work with AWS Aurora Data API.

#### Making Schema Changes

1. **Edit the schema**: Modify files in `lib/db/schema.ts`

2. **Generate migration files**:
```bash
pnpm db:generate
```
This creates SQL migration files in the `drizzle/` directory.

3. **Apply migrations** (requires explicit stage):
```bash
pnpm migrate --stage martin
pnpm migrate --stage dev
pnpm migrate --stage production
```
This runs migrations using the official Drizzle Data API migrator against the specified stage's database.

#### Alternative Commands

- **Push schema directly** (development only):
```bash
pnpm db:push
```
⚠️ This bypasses migration files and directly pushes schema changes to the database.

- **Manual database queries** (requires explicit stage):
```bash
pnpm sql "SELECT * FROM users LIMIT 5;" --stage martin
pnpm sql "SELECT COUNT(*) FROM tasks;" --stage dev
pnpm sql "SELECT * FROM users;" --stage production
```

- **Cross-stage database operations**:
```bash
pnpm sql "SELECT COUNT(*) FROM users;" --stage dev
pnpm sql "SELECT COUNT(*) FROM users;" --stage production
pnpm sql "CREATE DATABASE newstage;" --stage dev --db postgres
```

#### How It Works

- **Explicit stage targeting**: All database operations require an explicit `--stage` parameter to prevent accidental operations on wrong environments
- **Cross-stage capability**: You can run operations against any stage (martin, dev, production) from any local environment
- **Migration tracking**: Uses Drizzle's `__drizzle_migrations` table to track applied migrations per stage
- **Aurora Data API**: All database operations use AWS Data API instead of direct PostgreSQL connections
- **SST integration**: Scripts automatically load cluster configuration from `.sst/outputs.json` but target the specified stage's database
- **Stage isolation**: Each stage (martin, dev, production) uses its own database within the shared Aurora cluster

#### Migration Files

- Generated migration files are stored in `drizzle/`
- Each migration has a timestamp and descriptive name (e.g., `0001_far_nova.sql`)
- Migrations are applied in chronological order
- Already applied migrations are skipped automatically

## Deployment

### Deploy to production:
```bash
npx sst deploy --stage production
```

### Deploy to a personal dev stage:
```bash
npx sst deploy --stage your-name
```

Personal dev stages will share the dev Aurora cluster but use their own database.

**Important**: Before deploying a personal stage, ensure one of the creator stages (`dev` or `staging`) has been deployed to create the shared Aurora cluster:
```bash
# Deploy dev stage first to create the shared cluster
npx sst deploy --stage dev

# OR deploy staging stage
npx sst deploy --stage staging

# Then you can deploy personal stages
npx sst deploy --stage bob
npx sst deploy --stage feature123
```

## Architecture Notes

- The app automatically detects if it's running with Aurora Data API based on environment variables
- When using Aurora Data API, no persistent connections are needed
- The VPC is configured with managed NAT for Lambda functions
- Aurora clusters are retained in production, removed in other stages
- Each stage automatically creates its own database within the cluster on first connection
- The shared dev cluster uses a fixed identifier to enable cross-stage references

## Cost Optimization

- Aurora Serverless v2 scales to 0 ACU when not in use
- Auto-pause is configured to minimize costs during inactivity
- Dev stages share infrastructure to reduce costs
- Production has dedicated resources for isolation and performance

## Troubleshooting

### Database Connection Issues

If you're having trouble connecting to Aurora:

1. Check that the VPC and Aurora cluster are properly created:
```bash
npx sst dev --verbose
```

2. Verify the database credentials are being passed correctly by checking the SST outputs

3. For local development, ensure your PostgreSQL container is running and accessible

### Database Does Not Exist Error

If you see an error like `ERROR: database "your-stage-name" does not exist`:

1. **The stage database hasn't been created yet**. Follow the [Stage Database Setup](#stage-database-setup) steps above.

2. **Quick fix for current stage**:
```bash
# Create the database for your current stage
node scripts/sql-query.js "CREATE DATABASE $(echo $SST_STAGE | tr '-' '_');" --db=postgres

# Or manually specify your stage name
node scripts/sql-query.js "CREATE DATABASE your_stage_name;" --db=postgres

# Then run migrations
pnpm db:push
```

3. **List existing databases**:
```bash
node scripts/sql-query.js "SELECT datname FROM pg_database WHERE datistemplate = false;" --db=postgres
```

### Scale-to-Zero Resume Time

When Aurora is paused (scaled to zero), it takes about 15 seconds to resume on the first connection. This is normal behavior and helps reduce costs during periods of inactivity.
