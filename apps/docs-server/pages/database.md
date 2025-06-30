# Database Guide

This document covers database setup, configuration, and query patterns for Agent Stack applications.

## Supported Databases

Agent Stack supports multiple database systems:

- **PostgreSQL** (Recommended)
- **MySQL/MariaDB**
- **SQLite** (Development)
- **MongoDB** (NoSQL)

## Setup

### PostgreSQL Setup

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt-get install postgresql postgresql-contrib  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Create database
createdb agent_stack_dev
```

### Environment Configuration

```bash
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/agent_stack_dev"
DATABASE_POOL_SIZE=10
DATABASE_SSL=false
```

## Schema Management

### Migrations

Use Prisma for schema management:

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]

  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}
```

### Running Migrations

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma db push

# Reset database
npx prisma db reset
```

## Query Patterns

### Basic Operations

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
  },
});

// Read
const users = await prisma.user.findMany({
  where: {
    email: {
      contains: '@example.com',
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// Update
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: { name: 'Jane Doe' },
});

// Delete
await prisma.user.delete({
  where: { id: userId },
});
```

### Advanced Queries

```typescript
// Relations
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    },
  },
});

// Aggregations
const stats = await prisma.post.aggregate({
  _count: { id: true },
  _avg: { viewCount: true },
  where: { published: true },
});

// Transactions
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: 'user@example.com' },
  });
  
  await tx.post.create({
    data: {
      title: 'First Post',
      authorId: user.id,
    },
  });
});
```

### Raw Queries

```typescript
// Raw SQL queries
const result = await prisma.$queryRaw`
  SELECT u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.author_id
  GROUP BY u.id, u.name
  HAVING COUNT(p.id) > 5
`;

// Prepared statements
const posts = await prisma.$queryRaw`
  SELECT * FROM posts 
  WHERE created_at > ${startDate}
  AND published = ${true}
`;
```

## Connection Management

### Connection Pooling

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var __db__: PrismaClient;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  prisma = global.__db__;
  prisma.$connect();
}

export { prisma };
```

### Error Handling

```typescript
import { Prisma } from '@prisma/client';

try {
  const user = await prisma.user.create({
    data: { email: 'existing@example.com' },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('Email already exists');
    }
  }
  throw error;
}
```

## Performance Optimization

### Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author_published ON posts(author_id, published);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

### Query Optimization

```typescript
// Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
  },
});

// Use pagination
const posts = await prisma.post.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});

// Use cursor-based pagination for better performance
const posts = await prisma.post.findMany({
  take: 10,
  cursor: lastPostId ? { id: lastPostId } : undefined,
  orderBy: { id: 'asc' },
});
```

## Backup and Recovery

### Database Backups

```bash
# PostgreSQL backup
pg_dump -h localhost -U username -d agent_stack_dev > backup.sql

# Restore from backup
psql -h localhost -U username -d agent_stack_dev < backup.sql
```

### Data Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      posts: {
        create: [
          {
            title: 'Welcome Post',
            content: 'Welcome to Agent Stack!',
            published: true,
          },
        ],
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Best Practices

1. **Use transactions** for operations that modify multiple tables
2. **Implement proper indexing** for frequently queried fields
3. **Use connection pooling** in production environments
4. **Handle errors gracefully** with proper error types
5. **Monitor query performance** with logging and metrics
6. **Use prepared statements** to prevent SQL injection
7. **Implement database migrations** for schema changes
8. **Regular backups** and disaster recovery planning 