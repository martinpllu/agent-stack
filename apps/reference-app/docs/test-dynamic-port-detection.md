# Dynamic Port Detection for Development Server

## Overview

This application uses dynamic port detection to avoid hardcoding the React Router dev server port in tests and scripts. This prevents issues when:
- The default port (5176) is already in use
- Different developers have different port configurations
- The framework changes its default port

## How It Works

The `scripts/get-dev-server-url.ts` utility tries multiple methods to detect the running dev server:

1. **SST Running Check**: First verifies that SST dev is running by checking for `.sst/*.server` files
2. **Port Scanning**: Tries common React Router/Vite ports (5176, 5173, 3000, 4173) with HTTP requests
3. **Process Detection**: Checks running processes for Vite/React Router with port arguments
4. **Vite Config**: Looks for port information in `.vite` directory
5. **Fallback**: Uses default port 5176 with a warning

## Usage

### In Playwright Tests

The Playwright config automatically detects the port:

```typescript
// playwright.config.ts
import { getDevServerUrl } from './scripts/get-dev-server-url';

const baseURL = process.env.BASE_URL || getDevServerUrl();
```

You can override with an environment variable:
```bash
BASE_URL=http://localhost:3000 pnpm test:e2e
```

### In Debug Scripts

```typescript
import { getDevServerUrl } from '../get-dev-server-url';

const baseUrl = getDevServerUrl();
await page.goto(`${baseUrl}/auth/login`);
```

### In Interactive Debug Browser

The debug browser automatically uses dynamic detection:
```bash
pnpm tsx scripts/debug-browser.ts
# debug.goto('/') automatically detects the correct port
```

### Command Line Usage

```bash
# Get the current dev server URL
pnpm tsx scripts/get-dev-server-url.ts
# Output: http://localhost:5176
```

## Important Notes

1. **SST Dev Must Be Running**: The utility expects `npx sst dev` to be running in a separate terminal
2. **No Multiple Servers**: Following SST best practices, there should only be one dev server instance
3. **Performance**: Port detection adds ~100-500ms to test startup, but prevents port conflicts
4. **CI/CD**: In CI environments, you may want to set `BASE_URL` explicitly for faster startup

## Troubleshooting

If port detection fails:

1. Ensure SST dev is running: `npx sst dev`
2. Check that the server is accessible: `curl http://localhost:5176`
3. Look for port conflicts: `lsof -i :5176`
4. Check web logs: `tail -f .sst/log/web.log`
5. Override with environment variable: `BASE_URL=http://localhost:YOUR_PORT`

## Future Improvements

- Parse `.sst/log/web.log` for the exact port (requires log format consistency)
- Read from SST's internal state files if they expose the port
- Create a `.port` file during SST startup for faster detection