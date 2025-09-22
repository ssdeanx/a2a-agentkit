# Security Considerations

## Disclaimer

This AgentKit provides sample code for demonstrating the A2A protocol. It is **not production-ready** and should not be used in live environments without significant enhancements.

Key risks and best practices:

## Untrusted Agents

- **External Data**: Treat all inputs from other agents (AgentCard, messages, artifacts, statuses) as untrusted.
  - Example: Malicious AgentCard `description` could inject prompts if unsanitized.
- **Mitigation**:
  - Validate/sanitize all fields (e.g., escape HTML/JS in descriptions).
  - Use allowlists for expected formats (e.g., JSON schemas for messages).
  - Avoid direct LLM prompt inclusion of external data.

## API Keys and Credentials

- **Environment Variables**: Keys (GEMINI_API_KEY, TMDB_API_KEY) are loaded via `dotenv` but logged in errors—avoid in production.
- **Mitigation**:
  - Use secret managers (e.g., AWS Secrets, env vaults).
  - Rotate keys regularly.
  - Run agents in isolated environments (e.g., Docker).

## Network Exposure

- **Ports**: Agents bind to localhost by default, but production exposes publicly.
- **CORS/Rate Limiting**: Basic CORS enabled; no auth.
- **Mitigation**:
  - Add authentication (e.g., API keys in headers).
  - Implement rate limiting (e.g., express-rate-limit).
  - Use HTTPS and firewalls.

## Task Management

- **InMemoryTaskStore**: Volatile; lost on restart. No persistence checks.
- **Cancellation**: Basic support, but no timeouts.
- **Mitigation**:
  - Use persistent stores (e.g., Redis/PostgreSQL).
  - Add task timeouts and cleanup.
  - Audit for resource leaks (e.g., open streams).

## AI-Specific Risks

- **Prompt Injection**: External content in Genkit prompts.
- **Tool Calls**: TMDB tools fetch public data, but validate responses.
- **Mitigation**:
  - Prefix/suffix prompts with guards.
  - Schema validation on tool inputs/outputs.
  - Monitor LLM costs/tokens.

## Recommendations for Production

1. **Auditing**: Scan for vulnerabilities (e.g., npm audit).
2. **Logging**: Structured logs (e.g., Winston) without sensitive data.
3. **Testing**: Unit tests for executors; integration for A2A flows.
4. **Compliance**: Follow OWASP guidelines for AI systems.

For more, consult [A2A Security Docs](https://a2a.dev/security) and secure your implementations responsibly."
