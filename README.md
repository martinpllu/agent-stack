# Agent Stack

Agent Stack is a development environment that allows AI agents to develop web apps with maximum autonomy. 

It's designed for teams who want to use AI to rapidly build production-quality web apps that they can host on their own AWS infrastructure.

It consists of:

- An opinionated serverless web stack providing a clear foundation for the agent to work with. Technology choices include SST v3, React Router v7, Tailwind CSS, Drizzle, and Hono. 
- An MCP server providing structured documentation on this tech stack for AI agents running in tools like Cursor, Claude Code or OpenCode.

...more docs

## STATUS

The project is in early development. The high level build strategy is as follows:

- Implement a fully featured app in `apps/reference-app` showcasing all the core patterns
- Use AI to generate comprehensive docs from these patterns in `apps/docs-server/pages`, e.g. `auth.md`, `adding-an-api-route.md`. Update the table of contents in `intro.md` to reference these pages (the MCP server docs instruct the agent to run `read-docs intro` and then run `read-docs` commands for anything else it needs to know about)
- Add a new command `create-app` for use in a new workspace - this copies the reference app into the workspace (perhaps downloading a zip) as the basis for a new application.
- Process for customising the reference app/docs to suit an org's own requirements.
- agent-stack.json (or .ts) file allowing configuration of framework choices, e.g. relational vs dynamo
- Stack migrations - keep track of the version of agent-stack in agent-stack.json. When upgrading to a new version, provide migration instructions for the agent via the MCP server.


## TODO 

- [ ] reference-app auth (SST Auth or Clerk).
- [ ] reference-app CRUD features
- [ ] reference-app UI component library (think Claude has gone for radix, would something like shadcn be preferable?)
- [ ] reference-app observability (powertools?)
- [ ] browser MCP (Playwright MCP seems to be good)


## Rest of README 

...more docs

## License

MIT 