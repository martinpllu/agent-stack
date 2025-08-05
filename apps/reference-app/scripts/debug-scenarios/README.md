# Debug Scenarios

This directory contains debug scripts for common e2e testing scenarios.

## Available Scripts

### Interactive Debug Browser
```bash
pnpm tsx scripts/debug-browser.ts
```
Opens an interactive REPL with a browser instance and helper functions.

### Debug Admin Flow
```bash
pnpm tsx scripts/debug-scenarios/debug-admin-flow.ts
```
Step-by-step walkthrough of the admin user management flow.

### Debug Failed Test
```bash
pnpm tsx scripts/debug-scenarios/debug-failed-test.ts
```
Reproduces a specific test failure for investigation.

## Creating Your Own Debug Scripts

1. Copy one of the existing scripts as a template
2. Modify the steps to match your scenario
3. Run with `pnpm tsx scripts/debug-scenarios/your-script.ts`

## Tips

- Use `slowMo` to slow down actions for visibility
- Add `page.pause()` to stop at specific points
- Take screenshots at key moments
- Log important state changes
- Keep the browser open at the end for manual inspection