# Installation

## Prerequisites

- Node.js (v18+ recommended for ES modules).
- npm or yarn.
- API Keys:
  - Google Gemini: For all agents (get from [Google AI Studio](https://aistudio.google.com/)).
  - TMDB: For Movie Agent (register at [developer.themoviedb.org](https://developer.themoviedb.org/docs/getting-started)).

## Steps

1. **Clone Repository**:

   ```bash
   git clone https://github.com/ssdeanx/a2a-agentkit.git
   cd a2a-agentkit
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

   This installs:
   - `@a2a-js/sdk`: A2A protocol.
   - `genkit`, `@genkit-ai/googleai`: AI framework.
   - `express`, `cors`, etc.: Server setup.
   - `tsx`: For running TypeScript directly.

3. **Set Environment Variables**:
   Create `.env` or export:

   ```bash
   export GEMINI_API_KEY=your_gemini_api_key
   export TMDB_API_KEY=your_tmdb_api_key  # Movie Agent only
   ```

   - Optional ports: `CODER_AGENT_PORT=41242`, `CONTENT_EDITOR_AGENT_PORT=10003`, `PORT=41241`.

4. **Verify Setup**:
   - Run `npm run a2a:cli` (without agent) to test CLI.
   - No build step needed; uses `tsx` for dev.

## Troubleshooting

- **Missing API Key**: Agents exit with error; check console.
- **Port Conflicts**: Change via env vars.
- **TypeScript Errors**: Ensure `tsconfig.json` includes src/**.
- **Dependencies**: If issues, delete `node_modules` and `npm install` again.

See [usage.md](usage.md) to run agents."
