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

### Database Setup

This application uses **Aurora Serverless v2 PostgreSQL** as its database. To set up the database infrastructure:

```bash
npx sst deploy --stage dev
```

**Important notes:**
- This creates a shared Aurora cluster that all development environments use (development environments are SST stages other than 'production')
- Each development environment gets its own isolated postgres database inside the development cluster. 
- The cluster is configured with auto-pause to minimize costs when not in use
- **This will incur AWS charges** - see [Aurora Serverless v2 pricing](https://aws.amazon.com/rds/aurora/pricing/)
- The database typically costs ~$0.12/hour when active, but auto-pauses after 10 minutes of inactivity. You may see delays of a few seconds (10-20s) in dev environments as the database resumes after being paused.

### Development

1. Start SST in development mode (in a separate terminal):
```bash
npx sst dev
```

2. Wait for SST to deploy (this may take a few minutes on first run). The app will be available at the URL shown in the SST output.

3. Create an admin user for testing:
```bash
pnpm create-user --stage your-name --email test@example.com --admin
```

4. Open the web application URL from step 2 and click "Sign In".

5. Enter the email address `test@example.com` and click "Send Login Code".

6. **No email will be sent in development** - instead, check the SST console for the authentication code:
   - In your SST console (where `npx sst dev` is running), click the **Functions** tab
   - Click on **AuthFunction** 
   - Look for a log entry containing: `Login code for test@example.com: XXXXXX`
   - Copy the 6-digit code

7. Enter the code in the web application to complete login.

8. You can now use the application with full admin privileges!

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
pnpm create-user --stage your-name --email user@company.com         # Create regular user
pnpm create-user --stage your-name --email admin@company.com --admin # Create admin user
```

**Schema development workflow**:
```bash
# 1. Edit schema files in app/db/schema.ts
# 2. Generate migration files
pnpm db generate --stage your-name
# 3. Apply migrations
pnpm db migrate --stage your-name
```

**User management**:
```bash
# Create regular user (isAdmin=false, isValidated=true)
pnpm create-user --stage your-name --email user@company.com

# Create admin user (isAdmin=true, isValidated=true)  
pnpm create-user --stage your-name --email admin@company.com --admin

# Replace existing user (delete and recreate)
pnpm create-user --stage your-name --email user@company.com --clean --admin

# Query users
pnpm sql "SELECT email, is_admin, is_validated FROM users;" --stage your-name

# Programmatic usage in tests/scripts:
import { createUser } from './scripts/create-user';
const result = await createUser({
  email: 'test@example.com',
  stage: 'test',
  isAdmin: true,
  clean: true
});
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