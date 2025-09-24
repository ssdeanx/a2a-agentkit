# AGENTS.md

## Project Overview

A2A AgentKit is a collection of sample JavaScript/TypeScript agents implementing the Agent-to-Agent (A2A) protocol. These agents demonstrate interoperable AI systems using the A2A SDK, integrated with the Genkit framework and powered by Google Gemini AI models.

**Key Technologies:**

- **Language**: TypeScript (ES2022 target, NodeNext modules)
- **AI Framework**: Genkit with Google Gemini models (gemini-1.5-pro, gemini-1.5-flash)
- **Protocol**: Agent-to-Agent (A2A) protocol via @a2a-js/sdk
- **Server**: Express.js with CORS support
- **Execution**: Direct TypeScript execution via tsx (no build step required)
- **Package Manager**: npm

**Architecture:**

- CLI client (`src/cli.ts`) for testing agent interactions
- Three specialized agents in `src/agents/`:
  - **Coder Agent**: Code generation with artifact streaming
  - **Content Editor Agent**: Text proofreading and polishing
  - **Movie Agent**: Movie information retrieval via TMDB API

**Agent Capabilities:**

- A2A compliance with AgentCards, task handling, and event publishing
- Streaming responses for long-running tasks
- Artifact generation (code files, edited content)
- Tool integration (TMDB API for movie data)
- Interactive CLI testing interface

## Setup Commands

### Prerequisites

- Node.js v18+ (ES modules support required)
- npm or yarn
- API Keys:
  - `GEMINI_API_KEY`: Required for all agents (obtain from [Google AI Studio](https://aistudio.google.com/))
  - `TMDB_API_KEY`: Required only for Movie Agent (register at [developer.themoviedb.org](https://developer.themoviedb.org/docs/getting-started))

### Installation

```bash
# Clone repository
git clone https://github.com/ssdeanx/a2a-agentkit.git
cd a2a-agentkit

# Install dependencies
npm install
```

### Environment Setup

```bash
# Required: Gemini API key for all agents
export GEMINI_API_KEY=your_gemini_api_key_here

# Required for Movie Agent only
export TMDB_API_KEY=your_tmdb_api_key_here

# Optional: Custom ports (defaults shown)
export CODER_AGENT_PORT=41242
export CONTENT_EDITOR_AGENT_PORT=10003
export PORT=41241  # Movie Agent default port
```

### Verification

```bash
# Test CLI without agents
npm run a2a:cli

# Should display CLI interface (no agents running yet)
```

## Development Workflow

### Starting Development Servers

Each agent runs as an independent Express server. Start agents in separate terminals:

```bash
# Terminal 1: Movie Agent (port 41241)
npm run agents:movie-agent

# Terminal 2: Coder Agent (port 41242)
npm run agents:coder

# Terminal 3: Content Editor Agent (port 10003)
npm run agents:content-editor
```

### Testing Agent Interactions

```bash
# Connect CLI to running agent (use appropriate port)
npm run a2a:cli http://localhost:41241  # Movie Agent
npm run a2a:cli http://localhost:41242  # Coder Agent
npm run a2a:cli http://localhost:10003  # Content Editor Agent
```

### Development Commands

```bash
# Run TypeScript directly (no build step)
npx tsx src/agents/coder/index.ts
npx tsx src/agents/movie-agent/index.ts
npx tsx src/agents/content-editor/index.ts
npx tsx src/cli.ts

# Check TypeScript compilation
npx tsc --noEmit

# Development with hot reload (not configured, use tsx directly)
```

### Environment Variables for Development

- `GEMINI_API_KEY`: Required for AI model access
- `TMDB_API_KEY`: Required for movie database queries
- `CODER_AGENT_PORT`: Override coder agent port (default: 41242)
- `CONTENT_EDITOR_AGENT_PORT`: Override content editor port (default: 10003)
- `PORT`: Override movie agent port (default: 41241)

## Testing Instructions

### Current Testing Status

This project currently has **no automated tests**. All testing is manual via the CLI interface.

### Manual Testing Process

1. **Start Target Agent**:

   ```bash
   npm run agents:movie-agent  # or agents:coder, agents:content-editor
   ```

2. **Launch CLI in Separate Terminal**:

   ```bash
   npm run a2a:cli http://localhost:[PORT]
   ```

3. **Test Interactions**:
   - Type natural language queries
   - Observe real-time status updates (⏳ working, ✅ completed)
   - Check for artifacts (code files for coder agent)
   - Verify error handling with invalid inputs

### Agent-Specific Test Cases

#### Movie Agent Tests

```bash
# Start agent
npm run agents:movie-agent

# In CLI:
"Tell me about Inception"
"What movies star Leonardo DiCaprio?"
"Recommend sci-fi movies from 2023"
"When was Jurassic Park released?"
```

#### Coder Agent Tests

```bash
# Start agent
npm run agents:coder

# In CLI:
"Write a Python function to reverse a string"
"Create a React component for a todo list"
"Generate a Node.js Express server with GET /api/users"
```

#### Content Editor Tests

```bash
# Start agent
npm run agents:content-editor

# In CLI:
"Fix this text: i luv coding but its hard"
"Polish this article for professional publication"
"Edit this email for better grammar and tone"
```

### Testing Best Practices

- **Test all agents independently** before multi-agent scenarios
- **Verify API keys** are set before testing
- **Check port availability** to avoid conflicts
- **Test error cases**: Invalid inputs, missing API keys, network issues
- **Validate artifacts**: Code files should be syntactically correct and runnable
- **Monitor console output** for debugging information

### Future Testing Setup

When adding automated tests:

- Use Jest or Vitest for unit/integration tests
- Test A2A protocol compliance
- Mock external APIs (TMDB, Gemini)
- Add E2E tests for CLI interactions
- Include performance tests for streaming responses

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext (ES modules)
- **Strict mode**: Enabled
- **Output directory**: `dist/`
- **Source inclusion**: `src/**/*.ts`

### Language Conventions

#### File Organization

```
src/
├── cli.ts                    # Main CLI entry point
├── agents/                   # Agent implementations
│   ├── [agent-name]/
│   │   ├── index.ts          # Server setup and routing
│   │   ├── genkit.ts         # AI model configuration
│   │   ├── [agent].prompt    # System prompts (where applicable)
│   │   └── [specific].ts     # Agent-specific utilities
```

#### Naming Conventions

- **Files**: kebab-case for multi-word (e.g., `movie-agent.ts`, `code-format.ts`)
- **Classes/Types**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Agent IDs**: kebab-case (e.g., `code_generation`, `general_movie_chat`)

#### Import/Export Patterns

```typescript
// Prefer named exports
export { functionName, ClassName }

// Import with destructuring
import { functionName, ClassName } from './module'

// Avoid default exports except for main entry points
export default mainFunction  // Only in index.ts files
```

### Code Quality Standards

#### TypeScript Best Practices

- **Strict null checks**: Enabled
- **No implicit any**: Disabled (for flexibility with Genkit)
- **Consistent casing**: Enforced
- **ES module interop**: Enabled
- **JSON module resolution**: Enabled

#### Agent Implementation Patterns

- **Server setup**: Express with CORS, body-parser
- **A2A compliance**: AgentCard at `/.well-known/agent-card.json`
- **Error handling**: Try-catch blocks with proper HTTP status codes
- **Logging**: Console output for debugging
- **Environment variables**: Centralized configuration

#### Security Considerations

- **Input validation**: Sanitize all user inputs
- **API key handling**: Environment variables only
- **CORS configuration**: Restrict to trusted origins in production
- **Rate limiting**: Implement for production deployments

### Linting and Formatting

Currently no linting/formatting tools configured. Recommended additions:

- ESLint with TypeScript support
- Prettier for code formatting
- Husky for pre-commit hooks

## Build and Deployment

### Development Build

No build step required - uses `tsx` for direct TypeScript execution:

```bash
# Run directly
npx tsx src/agents/coder/index.ts
```

### Production Build (Optional)

```bash
# Compile to JavaScript
npx tsc

# Output in dist/ directory
node dist/agents/coder/index.js
```

### Deployment Considerations

#### Environment Setup

```bash
# Production environment variables
export NODE_ENV=production
export GEMINI_API_KEY=your_production_key
export TMDB_API_KEY=your_production_tmdb_key

# Port configuration
export PORT=80  # or appropriate production port
```

#### Docker Deployment (Example)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 80
CMD ["node", "dist/agents/movie-agent/index.js"]
```

#### Process Management

- Use PM2 or similar for production process management
- Configure log rotation
- Set up health checks
- Implement graceful shutdown

### CI/CD Pipeline (Recommended)

```yaml
# Example GitHub Actions
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build  # if build step added
      - run: npm test       # when tests added
```

## Security Considerations

### API Key Management

- **Never commit API keys** to version control
- **Use environment variables** exclusively
- **Rotate keys regularly** in production
- **Restrict API key permissions** to minimum required

### Input Validation

- **Sanitize all inputs** from external agents
- **Validate AgentCard data** before processing
- **Escape special characters** in prompts
- **Limit input size** to prevent abuse

### Network Security

- **Configure CORS properly** for production
- **Use HTTPS** in production deployments
- **Implement rate limiting** on API endpoints
- **Monitor for suspicious activity**

### A2A Protocol Security

- **Treat external agents as untrusted** entities
- **Validate all received data** (messages, artifacts, task statuses)
- **Implement timeout handling** for agent communications
- **Log security events** for audit trails

## Debugging and Troubleshooting

### Common Issues

#### API Key Problems

```bash
# Check environment variables
echo $GEMINI_API_KEY
echo $TMDB_API_KEY

# Error: "API key not found"
# Solution: Export the environment variable
export GEMINI_API_KEY=your_key_here
```

#### Port Conflicts

```bash
# Check port usage
lsof -i :41241

# Change port if needed
export PORT=41242
npm run agents:movie-agent
```

#### TypeScript Compilation Errors

```bash
# Check compilation
npx tsc --noEmit

# Common issues:
# - Missing type definitions: npm install @types/package-name
# - Module resolution: Check tsconfig.json paths
```

#### Agent Connection Issues

```bash
# Test agent endpoint
curl http://localhost:41241/.well-known/agent-card.json

# Should return valid JSON AgentCard
```

### Logging and Monitoring

#### Console Output

- Agents log startup information
- CLI shows interaction status
- Errors are logged to console

#### Debug Mode

```bash
# Enable verbose logging (if implemented)
export DEBUG=true
npm run agents:coder
```

### Performance Optimization

#### Current Performance Characteristics

- **Startup time**: ~2-3 seconds per agent
- **Response time**: Varies by query complexity (seconds to minutes)
- **Memory usage**: ~50-100MB per running agent
- **Streaming**: Real-time updates for long tasks

#### Optimization Tips

- Use appropriate Gemini model (flash for speed, pro for quality)
- Implement caching for TMDB API calls
- Optimize prompt engineering
- Monitor memory usage in long-running processes

## Pull Request Guidelines

### Title Format

```
[<agent-name>] Brief description of changes
```

Examples:

- `[coder-agent] Add TypeScript support for generated code`
- `[movie-agent] Improve TMDB API error handling`
- `[cli] Add streaming status indicators`

### Required Checks Before Submission

```bash
# TypeScript compilation
npx tsc --noEmit

# Manual testing of affected agents
npm run agents:[agent-name]
npm run a2a:cli http://localhost:[port]

# Environment variable validation
echo "API keys set: $GEMINI_API_KEY $TMDB_API_KEY"
```

### Code Review Requirements

- **Test manually** with CLI before submitting
- **Include screenshots/logs** for UI changes
- **Document API changes** in relevant README
- **Update AGENTS.md** if workflow changes
- **Security review** for any input handling changes

### Commit Message Conventions

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: agent name or component (coder, movie-agent, cli)
```

Examples:

- `feat(coder): add multi-file artifact support`
- `fix(movie-agent): handle TMDB API rate limits`
- `docs(cli): update usage examples`

## Additional Notes

### Project Status

This is **sample code** for educational purposes, not production-ready libraries. The A2A protocol implementation demonstrates agent interoperability but requires additional hardening for production use.

### Future Enhancements

- Automated test suite implementation
- Linting and formatting tools
- Docker containerization
- Web-based UI for agent interactions
- Advanced security features
- Multi-agent collaboration workflows
- Performance monitoring and optimization

### Contributing

- Follow TypeScript and A2A best practices
- Test all changes manually via CLI
- Update documentation for any workflow changes
- Consider security implications of all modifications

### Resources

- [A2A Protocol Documentation](https://a2a.dev)
- [Genkit Framework](https://genkit.dev/)
- [Google Gemini API](https://ai.google.dev/)
- [TMDB API](https://developer.themoviedb.org/docs)
