# Team Task Tracker - Implementation Details

This reference app demonstrates the agent-stack patterns described in `intro.md`.

## What We Built

A fully functional team task tracker with:

1. **Kanban Board Interface**
   - Three columns: Backlog, In Progress, Done
   - Task cards showing title, description, assignee, and creation date
   - Mock data for demonstration

2. **File Structure** (Following intro.md patterns)
   ```
   apps/reference-app/
   ├── app/                    # React Router frontend
   │   ├── routes/            # File-based routing
   │   │   ├── home.tsx      # Landing page
   │   │   └── tasks.tsx     # Task board page
   │   ├── components/        # UI components
   │   │   ├── ui/           # shadcn/ui components
   │   │   │   ├── button.tsx
   │   │   │   ├── card.tsx
   │   │   │   ├── dialog.tsx
   │   │   │   ├── input.tsx
   │   │   │   ├── label.tsx
   │   │   │   └── textarea.tsx
   │   │   ├── tasks/        # Task-specific components
   │   │   │   ├── task-board.tsx
   │   │   │   └── task-card.tsx
   │   │   └── layout.tsx    # Main layout component
   │   ├── lib/              # Utilities
   │   │   └── utils.ts      # cn() helper for classnames
   │   ├── app.css           # Tailwind CSS with shadcn/ui variables
   │   └── root.tsx          # Root layout with providers
   ├── lib/                   # Shared business logic
   │   ├── db/               # Database layer
   │   │   ├── schema.ts     # Drizzle ORM schema
   │   │   └── client.ts     # Database client
   │   ├── repositories/     # Data access layer
   │   │   └── task.repository.ts
   │   ├── types/            # TypeScript types
   │   │   └── task.ts
   │   └── mock-data.ts     # Demo data
   ├── api/                   # (Reserved for Hono API)
   ├── tests/                 # (Reserved for tests)
   └── sst.config.ts         # SST deployment config
   ```

3. **Technologies Used**
   - **Frontend**: React Router v7 with file-based routing
   - **UI**: shadcn/ui components with Tailwind CSS v4
   - **Database**: PostgreSQL with Drizzle ORM (schema ready)
   - **Auth**: Clerk integration (prepared but optional)
   - **Deployment**: SST v3 configuration

4. **Patterns Demonstrated**
   - Repository pattern for database abstraction
   - Type-safe data models
   - Component composition with shadcn/ui
   - Loader pattern for data fetching
   - Responsive design with Tailwind CSS

## Running the App

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start SST dev (in a separate terminal):
   ```bash
   cd apps/reference-app
   npx sst dev
   ```

3. The app will be available at the URL shown in SST output

## Features Implemented

### Guest Access (Current)
- View all tasks across columns
- Navigate between home and tasks pages
- Responsive design

### Prepared for Future
- User authentication with Clerk
- Database persistence with PostgreSQL
- Role-based access control
- Task CRUD operations
- Real-time updates

## Next Steps

To fully enable all features:

1. Set up PostgreSQL database
2. Configure Clerk authentication
3. Run database migrations
4. Implement task actions (create, update, delete)
5. Add user management
6. Enable real-time updates

This reference implementation provides a solid foundation following the agent-stack patterns, ready for extension with full authentication and database features. 