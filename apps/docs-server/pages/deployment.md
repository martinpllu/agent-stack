# Deployment Guide

This document provides deployment instructions and best practices for Agent Stack applications across different environments and platforms.

## Environment Setup

### Environment Variables

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/agent_stack_prod
REDIS_URL=redis://localhost:6379
API_BASE_URL=https://api.yourdomain.com
JWT_SECRET=your-super-secret-jwt-key
UPLOAD_S3_BUCKET=your-s3-bucket
AWS_REGION=us-east-1
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

### Build Configuration

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "docker:build": "docker build -t agent-stack .",
    "docker:run": "docker run -p 3000:3000 agent-stack",
    "deploy:vercel": "vercel --prod",
    "deploy:aws": "serverless deploy --stage production"
  }
}
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/agent_stack
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agent_stack
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Build and Deploy

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Remove volumes (careful!)
docker-compose down -v
```

## Vercel Deployment

### Configuration

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "env": {
    "DATABASE_URL": "@database-url",
    "JWT_SECRET": "@jwt-secret",
    "UPLOAD_S3_BUCKET": "@s3-bucket"
  },
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Deploy Steps

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
```

## AWS Deployment

### Serverless Framework

```yaml
# serverless.yml
service: agent-stack

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    NODE_ENV: ${self:provider.stage}
    DATABASE_URL: ${env:DATABASE_URL}
    JWT_SECRET: ${env:JWT_SECRET}

functions:
  app:
    handler: lambda.handler
    events:
      - http:
          method: any
          path: /{proxy+}
          cors: true
    timeout: 30

plugins:
  - serverless-next-js
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
```

### Lambda Handler

```javascript
// lambda.js
const { createServer, proxy } = require('aws-serverless-express');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

exports.handler = (event, context) => proxy(server, event, context);
```

### Deploy Commands

```bash
# Install Serverless CLI
npm install -g serverless

# Deploy to AWS
serverless deploy --stage production

# View logs
serverless logs -f app --stage production

# Remove deployment
serverless remove --stage production
```

## Traditional VPS Deployment

### Server Setup (Ubuntu)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server
```

### Application Setup

```bash
# Clone repository
git clone https://github.com/yourusername/agent-stack.git
cd agent-stack

# Install dependencies
npm install

# Build application
npm run build

# Set up PM2 configuration
```

### PM2 Configuration

```json
{
  "name": "agent-stack",
  "script": "npm",
  "args": "start",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "instances": "max",
  "exec_mode": "cluster",
  "watch": false,
  "merge_logs": true,
  "log_date_format": "YYYY-MM-DD HH:mm Z",
  "error_file": "/var/log/pm2/agent-stack-error.log",
  "out_file": "/var/log/pm2/agent-stack-out.log",
  "pid_file": "/var/run/pm2/agent-stack.pid"
}
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/agent-stack
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static {
        alias /path/to/agent-stack/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Deploy Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment..."

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Run database migrations
npm run db:migrate

# Restart PM2 process
pm2 restart agent-stack

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment completed successfully!"
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/agent-stack
            ./deploy.sh
```

## Database Migrations

### Production Migration Strategy

```bash
# Create backup before migration
pg_dump -h localhost -U username -d agent_stack_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run db:migrate

# Verify migration
npm run db:status

# Rollback if needed (have rollback scripts ready)
npm run db:rollback
```

### Zero-Downtime Deployments

```bash
# Blue-Green deployment script
#!/bin/bash

CURRENT_PORT=$(pm2 show agent-stack | grep -o 'port.*[0-9]*' | grep -o '[0-9]*')
NEW_PORT=$((CURRENT_PORT == 3000 ? 3001 : 3000))

echo "Deploying to port $NEW_PORT..."

# Start new instance
PORT=$NEW_PORT pm2 start ecosystem.config.js --name "agent-stack-new"

# Health check
sleep 10
curl -f http://localhost:$NEW_PORT/health || exit 1

# Update Nginx to point to new instance
sed -i "s/localhost:$CURRENT_PORT/localhost:$NEW_PORT/g" /etc/nginx/sites-available/agent-stack
sudo nginx -t && sudo systemctl reload nginx

# Stop old instance
pm2 delete agent-stack

# Rename new instance
pm2 delete agent-stack-new
PORT=$NEW_PORT pm2 start ecosystem.config.js --name "agent-stack"

echo "Deployment completed!"
```

## Monitoring and Logging

### Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
```

### Health Check Endpoint

```typescript
// pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
}
```

## Performance Optimization

### CDN Configuration

```bash
# CloudFlare configuration
# Enable:
# - Brotli compression
# - Auto minify (HTML, CSS, JS)
# - Polish (image optimization)
# - Railgun (dynamic content acceleration)

# Cache rules:
# - Static assets: 1 year
# - API responses: 5 minutes
# - HTML pages: 2 hours
```

### Database Optimization

```sql
-- Add database indexes for performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_posts_published_created ON posts(published, created_at DESC);

-- Enable query logging for optimization
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
```

## Security Best Practices

1. **Use HTTPS everywhere** with proper SSL certificates
2. **Implement rate limiting** to prevent abuse
3. **Sanitize user inputs** to prevent XSS and injection attacks
4. **Use environment variables** for sensitive configuration
5. **Regular security updates** for dependencies
6. **Implement proper authentication** and authorization
7. **Use Content Security Policy** headers
8. **Regular security audits** and penetration testing
9. **Database connection security** with SSL
10. **Backup and disaster recovery** planning

## Troubleshooting

### Common Issues

```bash
# Check application logs
pm2 logs agent-stack

# Check system resources
htop
df -h
free -m

# Check network connectivity
netstat -tlnp | grep :3000
curl -I http://localhost:3000/health

# Database connection issues
psql -h localhost -U username -d agent_stack_prod -c "SELECT version();"

# Clear application cache
redis-cli FLUSHALL
```

### Rollback Strategy

```bash
# Quick rollback script
#!/bin/bash
BACKUP_VERSION=$1

if [ -z "$BACKUP_VERSION" ]; then
  echo "Usage: ./rollback.sh <backup_version>"
  exit 1
fi

echo "Rolling back to version $BACKUP_VERSION..."

# Stop current application
pm2 stop agent-stack

# Restore from backup
git checkout $BACKUP_VERSION
npm ci --only=production
npm run build

# Restore database if needed
# psql -h localhost -U username -d agent_stack_prod < backup_$BACKUP_VERSION.sql

# Restart application
pm2 start agent-stack

echo "Rollback completed!"
```

## Best Practices

1. **Use HTTPS everywhere** with proper SSL certificates
2. **Implement rate limiting** to prevent abuse
3. **Use environment variables** for sensitive configuration
4. **Regular security updates** for dependencies
5. **Backup and disaster recovery** planning 