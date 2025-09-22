# Usage

## Running Agents

Use npm scripts from `package.json`. Each starts an independent Express server.

### Movie Agent

```bash
npm run agents:movie-agent  # Port 41241
```

- AgentCard: `http://localhost:41241/.well-known/agent-card.json`

### Coder Agent

```bash
npm run agents:coder  # Port 41242
```

- AgentCard: `http://localhost:41242/.well-known/agent-card.json`

### Content Editor Agent

```bash
npm run agents:content-editor  # Port 10003
```

- AgentCard: `http://localhost:10003/.well-known/agent-card.json`

Stop with Ctrl+C.

## Testing with CLI

The CLI (`npm run a2a:cli [agent-url]`) provides interactive testing.

1. Start an agent (e.g., Movie Agent).
2. In new terminal:

   ```bash
   npm run a2a:cli http://localhost:41241
   ```

3. Interact:
   - Type: "Tell me about Inception." (for Movie)
   - Agent responds with status (⏳ working, ✅ completed) and content/artifacts.
   - For Coder: Artifacts appear as files (e.g., "Emitting file: example.py").
   - Cancel: Task cancellation supported via protocol.

### Example Sessions

**Movie Agent**:

```
You: What's the plot of The Matrix?
Agent [12:34]: ⏳ Processing...
Agent [12:35]: The Matrix is a 1999 sci-fi... Directed by Wachowskis. COMPLETED
```

**Coder Agent**:

```
You: Write a Python hello world script.
Agent [12:40]: ⏳ Generating code...
Agent [12:41]: Generated files: hello.py
[Artifact: hello.py]
print("Hello, World!")
✅ Completed
```

**Content Editor**:

```
You: Polish: coding is fun but hard.
Agent [12:45]: Editing content...
Agent [12:46]: Coding is an enjoyable pursuit, though it presents challenges. ✅ Completed
```

## Advanced Usage

- **Multi-Agent**: Integrate in A2A networks (see A2A docs).
- **Custom Clients**: Use `@a2a-js/sdk/client` for programmatic sends.
- **Streaming**: Observe real-time events in CLI (colors/emojis).
- **Context**: Agents maintain task history for conversations.

For agent details, see [agents.md](agents.md)."
