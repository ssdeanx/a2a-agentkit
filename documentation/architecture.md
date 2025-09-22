# Architecture

## Core Components

The AgentKit leverages several key libraries:

- **@a2a-js/sdk**: Core A2A protocol implementation.
  - `A2AClient`: For client-side interactions (used in CLI).
  - Server-side: `AgentCard`, `TaskStore` (InMemoryTaskStore), `AgentExecutor`, `DefaultRequestHandler`, `A2AExpressApp`.
- **Genkit**: AI orchestration framework.
  - Configured in `genkit.ts` per agent with plugins (e.g., `@genkit-ai/googleai`) and models.
  - Supports prompts (e.g., `movie_agent.prompt`), tools (e.g., TMDB searches), and custom formats (e.g., code output).
- **Express**: HTTP server for each agent, with routes set up by `A2AExpressApp`.

## Agent Structure

Each agent in `src/agents/<agent-name>/` follows a consistent pattern:

- **index.ts**: Main entry point.
  - Defines `AgentCard` (name, description, skills, capabilities like streaming).
  - Creates `TaskStore`, `AgentExecutor` (custom class implementing task logic), and `DefaultRequestHandler`.
  - Sets up Express app with A2A routes and starts server on a specific port.
- **genkit.ts**: Genkit configuration.
  - Initializes `genkit()` with plugins, model (e.g., `googleAI.model('gemini-1.5-pro')`), and prompt directory.
  - Defines custom formats (e.g., `defineCodeFormat` for Coder Agent).
- **agent.prompt**: Genkit prompt template.
  - System instructions for AI behavior (e.g., output format for code blocks).
- **tools.ts** (optional): Genkit tools.
  - Functions like `searchMovies` using TMDB API, defined with `ai.defineTool`.
- **code-format.ts** (Coder-specific): Custom schema and parsing for code artifacts.

## Task Flow

1. **Client Request**: CLI or external client sends a `Message` to agent's URL (e.g., `POST /a2a/v1/tasks`).
2. **Task Creation/Retrieval**: `DefaultRequestHandler` uses `TaskStore` to get or create a `Task` with ID and context ID.
3. **Execution**: `AgentExecutor.execute()`:
   - Publishes initial `Task` event.
   - Sends "working" status via `TaskStatusUpdateEvent`.
   - Prepares message history for Genkit.
   - Runs Genkit prompt/tools (e.g., `ai.generate()` or `prompt()`).
   - Handles streaming/chunks (e.g., emits `TaskArtifactUpdateEvent` for files).
   - Checks for cancellation.
   - Publishes final status (completed, failed, input-required) with agent `Message`.
4. **Event Publishing**: All via `ExecutionEventBus` for real-time updates.
5. **Artifacts**: For Coder Agent, parses markdown code blocks into file artifacts.

## CLI Client (src/cli.ts)

- Uses `A2AClient` to connect to agent URL.
- `readline` for interactive input.
- Listens for events: Status updates (with emojis/colors), artifact emissions.
- Supports task cancellation.

## Extensibility

- Add new agents: Copy folder structure, implement custom `AgentExecutor`.
- Customize AI: Update prompts, models, or add tools.
- Persistence: Replace `InMemoryTaskStore` with database-backed store for production."
