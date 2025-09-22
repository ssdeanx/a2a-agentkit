# JavaScript Samples

The provided samples are built using [Genkit](https://genkit.dev/) using the Gemini API.

## Agents

- [Movie Agent](src/agents/movie-agent/README.md): Uses TMDB API to search for movie information and answer questions.
- [Coder Agent](src/agents/coder/README.md): Generates full code files as artifacts.
- [Content Editor Agent](src/agents/content-editor/README.md)  
    Sample agent to proof-read and polish content. To make use of this agent in a content creation multi-agent system, check out the [content_creation](../python/hosts/content_creation/README.md) sample.

## Testing the Agents

First, follow the instructions in the agent's README file, then run `npx tsx ./cli.ts` to start up a command-line client to talk to the agents. Example:

1. Run npm install:

    ```bash
    npm install
    ```

2. Run an agent:

```bash
export GEMINI_API_KEY=<your_api_key>
npm run agents:coder

# in a separate terminal
npm run a2a:cli
```

## Note

This is sample code and not production-quality libraries.

## Disclaimer

Important: The sample code provided is for demonstration purposes and illustrates the
mechanics of the Agent-to-Agent (A2A) protocol. When building production applications,
it is critical to treat any agent operating outside of your direct control as a
potentially untrusted entity.

All data received from an external agent—including but not limited to its AgentCard,
messages, artifacts, and task statuses—should be handled as untrusted input. For
example, a malicious agent could provide an AgentCard containing crafted data in its
fields (e.g., description, name, skills.description). If this data is used without
sanitization to construct prompts for a Large Language Model (LLM), it could expose
your application to prompt injection attacks.  Failure to properly validate and
sanitize this data before use can introduce security vulnerabilities into your
application.

Developers are responsible for implementing appropriate security measures, such as
input validation and secure handling of credentials to protect their systems and users.

## Diagram

```mermaid
graph TD

    user["User<br>/src/cli.ts"]
    subgraph a2a_agentkit_boundary["A2A Agentkit<br>[External]"]
        subgraph cli_app_boundary["CLI Application<br>/src/cli.ts"]
            cli_main["CLI Main<br>/src/cli.ts"]
        end
        subgraph coder_agent_boundary["Coder Agent<br>/src/agents/coder"]
            coder_index["Coder Agent Index<br>/src/agents/coder/index.ts"]
            coder_genkit["Genkit Integration<br>/src/agents/coder/genkit.ts"]
            coder_code_format["Code Formatter<br>/src/agents/coder/code-format.ts"]
            %% Edges at this level (grouped by source)
            coder_index["Coder Agent Index<br>/src/agents/coder/index.ts"] -->|"Uses"| coder_genkit["Genkit Integration<br>/src/agents/coder/genkit.ts"]
            coder_index["Coder Agent Index<br>/src/agents/coder/index.ts"] -->|"Uses"| coder_code_format["Code Formatter<br>/src/agents/coder/code-format.ts"]
        end
        subgraph content_editor_agent_boundary["Content Editor Agent<br>/src/agents/content-editor"]
            content_editor_index["Content Editor Agent Index<br>/src/agents/content-editor/index.ts"]
            content_editor_genkit["Genkit Integration<br>/src/agents/content-editor/genkit.ts"]
            content_editor_prompt["Agent Prompt<br>/src/agents/content-editor/content_editor.prompt"]
            %% Edges at this level (grouped by source)
            content_editor_index["Content Editor Agent Index<br>/src/agents/content-editor/index.ts"] -->|"Uses"| content_editor_genkit["Genkit Integration<br>/src/agents/content-editor/genkit.ts"]
            content_editor_index["Content Editor Agent Index<br>/src/agents/content-editor/index.ts"] -->|"Reads"| content_editor_prompt["Agent Prompt<br>/src/agents/content-editor/content_editor.prompt"]
        end
        subgraph movie_agent_boundary["Movie Agent<br>/src/agents/movie-agent"]
            movie_agent_index["Movie Agent Index<br>/src/agents/movie-agent/index.ts"]
            movie_agent_genkit["Genkit Integration<br>/src/agents/movie-agent/genkit.ts"]
            movie_agent_prompt["Agent Prompt<br>/src/agents/movie-agent/movie_agent.prompt"]
            movie_agent_tmdb["TMDB Integration<br>/src/agents/movie-agent/tmdb.ts"]
            movie_agent_tools["Agent Tools<br>/src/agents/movie-agent/tools.ts"]
            %% Edges at this level (grouped by source)
            movie_agent_index["Movie Agent Index<br>/src/agents/movie-agent/index.ts"] -->|"Uses"| movie_agent_genkit["Genkit Integration<br>/src/agents/movie-agent/genkit.ts"]
            movie_agent_index["Movie Agent Index<br>/src/agents/movie-agent/index.ts"] -->|"Reads"| movie_agent_prompt["Agent Prompt<br>/src/agents/movie-agent/movie_agent.prompt"]
            movie_agent_index["Movie Agent Index<br>/src/agents/movie-agent/index.ts"] -->|"Uses"| movie_agent_tmdb["TMDB Integration<br>/src/agents/movie-agent/tmdb.ts"]
            movie_agent_index["Movie Agent Index<br>/src/agents/movie-agent/index.ts"] -->|"Uses"| movie_agent_tools["Agent Tools<br>/src/agents/movie-agent/tools.ts"]
        end
        %% Edges at this level (grouped by source)
        cli_main["CLI Main<br>/src/cli.ts"] -->|"Invokes | Agent commands"| coder_agent_boundary["Coder Agent<br>/src/agents/coder"]
        cli_main["CLI Main<br>/src/cli.ts"] -->|"Invokes | Agent commands"| content_editor_agent_boundary["Content Editor Agent<br>/src/agents/content-editor"]
        cli_main["CLI Main<br>/src/cli.ts"] -->|"Invokes | Agent commands"| movie_agent_boundary["Movie Agent<br>/src/agents/movie-agent"]
    end
    %% Edges at this level (grouped by source)
    user["User<br>/src/cli.ts"] -->|"Uses | CLI commands"| cli_main["CLI Main<br>/src/cli.ts"]

```

---

## Future Work

- Improve error handling and validation in agent commands
- Enhance logging and monitoring for better observability
- Optimize performance of agent interactions
- Expand test coverage for edge cases and failure scenarios
- Add more sample agents demonstrating different capabilities
- Integrate with additional external APIs and services
- Develop a web-based interface for interacting with agents
- Implement advanced security features for handling untrusted agents
- Explore multi-agent collaboration scenarios
- Refine prompts and agent behaviors for improved results

## Conclusion

This repository provides a foundational framework for building and experimenting with agent-based systems using Genkit and the Gemini API. The included sample agents demonstrate various capabilities and integrations, serving as a starting point for developers to create their own intelligent agents. As the field of AI continues to evolve, this codebase can be expanded and enhanced to explore new possibilities in agent interactions and functionalities.

## Documentation

For detailed guides, architecture, and security info, see the [documentation/ folder](documentation/).
