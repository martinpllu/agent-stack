# Scripts

## delete-all-data.js

⚠️ **DANGER: This script permanently deletes ALL data!** ⚠️

### What it does

This script deletes all data from:
- **OpenAuth DynamoDB table**: All authentication sessions, codes, and related data
- **Aurora PostgreSQL database**: All users and tasks

### Safety features

1. **Single confirmation prompt**: The script requires you to type "yes" once to confirm deletion
2. **Clear warnings**: Shows exactly what will be deleted
3. **Graceful cancellation**: Easy to cancel at any point
4. **Resource verification**: Reads actual resource names from SST outputs
5. **Aurora auto-pause resilience**: Automatically retries when Aurora is resuming from auto-pause

### Usage

```bash
# Run the script
npm run delete-all-data

# Or directly
tsx scripts/delete-all-data.ts
```

### Example output

```
🚨 DELETE ALL DATA SCRIPT 🚨
================================
This script will delete ALL data from:
• DynamoDB table: agent-stack-reference-app-dev-AuthStorageTable-xyz123
• Aurora database: dev (users and tasks tables)

🛑 Are you ABSOLUTELY SURE you want to delete ALL data? (type "yes" to confirm): yes

🚀 Starting data deletion...

🗑️  Deleting data from DynamoDB table: agent-stack-reference-app-dev-AuthStorageTable-xyz123
📋 Scanning DynamoDB table...
✅ DynamoDB table is already empty

🗑️  Deleting data from Aurora database: dev
🔄 Deleting tasks table data...
🔄 Deleting users table data...
ℹ️  No sequences to reset (this is normal for UUID primary keys)
✅ Aurora data deletion completed

🎉 Data deletion process completed!
```

### Aurora auto-pause handling

Aurora Serverless databases automatically pause when not in use to save costs. When the script tries to access a paused database, you'll see:

```
💤 Aurora database is resuming (attempt 1/3). Retrying in 10 seconds...
```

The script will automatically:
- Detect auto-pause/resume scenarios
- Wait 10 seconds between retry attempts  
- Retry up to 3 times for each operation
- Provide helpful error messages if all retries fail

No action is required from you - just wait for the retries to complete.

### When to use

- **Development reset**: Clean slate for testing
- **Demo preparation**: Reset before showing the app
- **Bug investigation**: Eliminate data-related issues
- **Privacy compliance**: Complete data removal

### Prerequisites

- Valid AWS credentials with access to DynamoDB and RDS
- SST deployment outputs (`.sst/outputs.json` file)
- Node.js environment with required AWS SDK packages