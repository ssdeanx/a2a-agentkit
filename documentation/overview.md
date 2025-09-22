# A2A AgentKit Overview

## Introduction

The A2A AgentKit is a collection of sample JavaScript agents implementing the [Agent-to-Agent (A2A) protocol](https://a2a.dev). These agents demonstrate how to build interoperable AI systems using the A2A SDK, integrated with the [Genkit framework](https://genkit.dev/) and powered by Google Gemini AI models.

This kit serves as educational examples for developers interested in creating AI agents that can communicate, share tasks, and produce artifacts like code files or processed content.

## Key Features

- **A2A Compliance**: Agents expose AgentCards, handle tasks via HTTP endpoints, and publish events (status updates, artifacts).
- **AI Integration**: Uses Genkit for prompt engineering, tool definitions, and streaming responses with Gemini models (e.g., gemini-1.5-pro, gemini-1.5-flash).
- **Specialized Agents**:
  - **Coder Agent**: Generates code files from natural language prompts.
  - **Content Editor Agent**: Proofreads and polishes text content.
  - **Movie Agent**: Retrieves and discusses movie information using the TMDB API.
- **CLI Client**: Interactive terminal for testing agent interactions.
- **Streaming Support**: Real-time updates for long-running tasks like code generation.

## Project Structure

```
a2a-agentkit/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── cli.ts            # CLI client for testing
│   └── agents/           # Agent implementations
│       ├── coder/        # Code generation agent
│       ├── content-editor/ # Text editing agent
│       └── movie-agent/  # Movie info agent
└── documentation/        # This folder: Detailed guides and references
```

## Getting Started

See [installation.md](installation.md) for setup and [usage.md](usage.md) for running examples.

For agent-specific details, refer to [agents.md](agents.md)."
