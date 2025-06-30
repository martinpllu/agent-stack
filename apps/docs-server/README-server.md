# Agent Stack Docs Server

An MCP (Model Context Protocol) server that provides structured documentation access for AI coding agents. The server enables agents to incrementally read documentation, starting with an intro page containing orientation instructions and a table of contents.

## Features

- **MCP Protocol Compliance**: Full implementation of the Model Context Protocol
- **Structured Documentation Access**: Read documentation pages individually or in batches
- **Smart Error Handling**: Helpful error messages with available page listings
- **Page Validation**: Secure filename validation to prevent directory traversal
- **Intro Page Guidance**: Always directs agents to start with the introduction page

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd agent-stack

# Install dependencies using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

## Quick Start

1. **Start the server**:
   ```bash
   pnpm start
   # or
   npm start
   ```

2. **For development with auto-reload**:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

## Configuration

### Environment Variables

```bash
# Optional configuration
AGENT_STACK_DOCS_PATH=./pages  # Default pages directory
AGENT_STACK_DOCS_LOG_LEVEL=info # Logging level
```

### Claude Desktop Configuration

Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "agent-stack": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/agent-stack/src/index.ts"
      ]
    }
  }
}
```

## Documentation Structure

The `pages/` directory contains all documentation files:

```
pages/
├── intro.md          # REQUIRED: Introduction with TOC
├── styling.md        # Example: CSS and styling guidelines
├── database.md       # Example: Database setup and queries
├── api.md           # Example: API endpoint documentation
└── deployment.md    # Example: Deployment instructions
```

### Required: intro.md

The `intro.md` page is crucial and must include:
- Clear instructions to always read this page first
- Brief overview of the documentation purpose
- Table of contents listing all available pages
- Usage examples

## Tools

### read-docs

**Description**: Read documentation pages. ALWAYS start with 'read-docs intro' to get orientation and table of contents.

**Parameters**:
- `pages` (string, required): Comma-separated list of page names to read

**Examples**:

```json
// Read the introduction page
{
  "pages": "intro"
}

// Read multiple pages
{
  "pages": "styling,database,api"
}
```

**Response**:
```json
{
  "pages": {
    "intro": "# Introduction\n\nWelcome to Agent Stack...",
    "styling": "# Styling Guide\n\n..."
  }
}
```

## Development

### Build

```bash
pnpm build
# or
npm run build
```

### Testing

```bash
# Run tests
pnpm test
# or
npm test

# Run tests with coverage
pnpm run test:coverage
# or
npm run test:coverage
```

### Project Structure

```
agent-stack/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── server.ts          # MCP server implementation
│   ├── tools/
│   │   └── read-docs.ts   # read-docs tool implementation
│   └── types.ts           # TypeScript type definitions
├── pages/                 # Documentation pages directory
│   ├── intro.md          # REQUIRED: Introduction with TOC
│   ├── styling.md        # Example documentation page
│   ├── database.md       # Example documentation page
│   ├── api.md            # Example documentation page
│   └── deployment.md     # Example documentation page
├── tests/
│   ├── server.test.ts
│   └── tools/
│       └── read-docs.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Usage Examples

### For AI Agents

1. **Always start with intro**:
   ```
   read-docs intro
   ```

2. **Read specific pages**:
   ```
   read-docs styling
   read-docs database,api
   ```

3. **Read multiple pages efficiently**:
   ```
   read-docs styling,database,api,deployment
   ```

### Adding New Documentation

1. Create a new `.md` file in the `pages/` directory
2. Update the table of contents in `intro.md`
3. Use descriptive, URL-safe filenames (alphanumeric, hyphens, underscores only)

## Error Handling

The server provides helpful error messages:

- **Missing pages**: Lists all available pages
- **Invalid page names**: Explains accepted format
- **File system errors**: User-friendly error messages

Example error response:
```
Page 'nonexistent' not found. Available pages: api, database, deployment, intro, styling
```

## Security

- **Page name validation**: Only alphanumeric characters, hyphens, and underscores allowed
- **Directory traversal prevention**: Secure file path handling
- **Input sanitization**: Proper validation of all inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Maintain test coverage above 90%

## Testing

The test suite includes:

- **Server tests**: MCP protocol compliance and tool registration
- **Read-docs tool tests**: File reading, error handling, validation
- **Edge case testing**: Invalid inputs, missing files, empty directories

Run tests:
```bash
pnpm test
```

Generate coverage report:
```bash
pnpm run test:coverage
```

## License

MIT License - see LICENSE file for details.

## Support

- Create an issue on GitHub for bugs or feature requests
- Check existing documentation in the `pages/` directory
- Review test cases for usage examples

## Changelog

### v0.1.0
- Initial release
- MCP protocol implementation
- read-docs tool with single and multiple page support
- Comprehensive error handling
- Example documentation pages
- Full test suite 