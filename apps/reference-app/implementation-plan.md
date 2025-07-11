# Implementation Plan: Transition to Persistent Task Tracker with User Management

> Goal: Replace in-memory mock data with fully-functional persistence on Amazon Aurora Postgres, implement user registration/validation, role-based access control, and task CRUD operations.

---

## 1. Database Layer (Aurora + Drizzle ORM)

1.1  **Design schema**
- `users` table
  - `id` UUID **PK** (generated)
  - `email` TEXT **UNIQUE NOT NULL**
  - `last_login` TIMESTAMPTZ **NULLABLE**
  - `is_admin` BOOLEAN DEFAULT `false`
  - `is_validated` BOOLEAN DEFAULT `false`
  - `created_at` TIMESTAMPTZ DEFAULT `now()`
  - `updated_at` TIMESTAMPTZ DEFAULT `now()`

- `tasks` table
  - `id` UUID **PK**
  - `user_id` UUID **FK → users(id)**
  - `title` TEXT NOT NULL
  - `description` TEXT NOT NULL
  - `status` TEXT DEFAULT `'todo'`  _(todo | in_progress | done)_
  - `created_at` TIMESTAMPTZ DEFAULT `now()`
  - `updated_at` TIMESTAMPTZ DEFAULT `now()`
  - Composite index `(user_id, status)` to optimize board queries

1.2  **Drizzle migrations**
- Extend `lib/db/schema.ts` with new models
- Create migration using `npx drizzle-kit generate` (SST deploy will run migrations)

1.3  **Repository layer**
- `lib/repositories/user.repository.ts` (find/create/update/validate)
- Extend existing `task.repository.ts` to support full CRUD

---

## 2. Authentication & User Registration Flow

2.1  **OpenAuth Code Provider**
- Keep current email-code flow
- Implement `getUser(email)` to:
  1. Lookup user by email
  2. If none, insert with `is_validated = false`
  3. Return `{ id, is_admin, is_validated }`

2.2  **JWT Claims**
- Embed:
  - `sub`  → user id
  - `email`
  - `roles`: `["admin"]` or `["user"]`
  - `is_validated`

2.3  **Session storage**
- Continue to use Dynamo via OpenAuth (no change)

---

## 3. Role-Based Authorization Middleware

3.1  **Define helper** `requireRole(role: "admin" | "user", opts?: { validated?: boolean })`
- Validates JWT
- Checks `roles` claim
- Optionally checks `is_validated`
- Returns early 401/403 on failure

3.2  **Apply to routes**
- `/tasks`  → `requireRole("user", { validated: true })`
- `/admin/*` → `requireRole("admin")`

---

## 4. Admin Features

4.1  **Endpoint** `GET /admin/unvalidated-users`
- Returns list of `{ id, email, created_at }`

4.2  **Endpoint** `POST /admin/users/:id/validate`
- Marks `is_validated = true`
- Optional email notification

4.3  **UI**
- New route `/admin/users`
- Table listing unvalidated users with **Validate** button
- Restrict via middleware + UI guard

---

## 5. Task Features

5.1  **Endpoints / Loaders / Actions**
- `GET /tasks` → tasks for current user
- `POST /tasks` → create task (title, description)
- `PUT /tasks/:id` → update status / content
- `DELETE /tasks/:id` (optional)

5.2  **Frontend updates**
- Replace `mockData` import with loader fetching real tasks
- Show empty-state CTA if none
- Form for creating task (reuse existing UI components)

---

## 6. Cleanup of Mock Data

- Remove `app/lib/mock-data.ts` & `lib/mock-data.ts`
- Delete dummy user id logic in components and services

---

## 7. Testing Strategy

- Unit tests for repositories (using local Postgres or testcontainers)
- Integration tests for auth flow (mock OpenAuth)
- Cypress/Playwright e2e: register user → validate → create task → board displays

---

## 8. Deployment & Infrastructure

- Aurora Postgres cluster already provisioned via SST (if not, add `sst.Postgres` construct)
- Ensure Lambda functions have VPC & security-group access
- Use SST `Config.Param` for DB credentials
- CI step: run migrations before deploy (drizzle-kit)

---

## 9. Roll-out Timeline (optimistic)

| Week | Milestone |
|------|-----------|
| 1 | DB schema + migrations, repository layer |
| 1–2 | Auth flow update (`getUser`, JWT claims) |
| 2 | Role middleware, protected routes |
| 2–3 | Admin endpoints & UI |
| 3 | Task CRUD endpoints + replace mock data |
| 3 | Frontend updates: task board + create form |
| 4 | Testing, bug-fixing, code cleanup |
| 4 | Deployment to staging, smoke tests |
| 5 | Production release |

---

## 10. Risks & Mitigations

- **Email deliverability** for code login → use SES w/ production-ready domain
- **Data migration** consistency → transactional migrations, backups
- **Auth leakage** → strict CORS & secrets management (SST `Config.Secret`)
- **Role escalation** → thorough authorization middleware & tests

---

## 11. Follow-up Enhancements (post-MVP)

- Task comments & attachments
- Real-time board updates via WebSocket / SSE
- Passwordless magic-link provider option
- Audit logging of admin actions
- Pagination & search for admin user list 