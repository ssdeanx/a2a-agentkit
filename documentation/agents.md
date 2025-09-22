# Agents

## Coder Agent (src/agents/coder)

**Purpose**: Generates complete code files from natural language descriptions. Streams artifacts for multi-file outputs.

**Key Files**:

- `index.ts`: Server setup on port 41242 (env: `CODER_AGENT_PORT`).
- `genkit.ts`: Gemini 2.5 Pro model (temperature 0.2, max tokens 65000).
- `code-format.ts`: Custom `CodeMessage` schema; parses markdown code blocks (e.g., ````ts file.ts\ncode\n````) into files.
- No prompts/tools; uses system instruction for code output format.

**Skills**:

- ID: `code_generation`
- Examples: "Write a Python Fibonacci function.", "Create HTML button with alert."

**Output**: Artifacts as `TaskArtifactUpdateEvent` (filename, content). Final message lists generated files.

**Example Interaction**:

- Input: "Write a JS function to reverse a string."
- Output: Streams `reverse.js` artifact:

  ```
  /** Reverses a given string. */
  function reverseString(str) {
    return str.split('').reverse().join('');
  }
  ```

## Content Editor Agent (src/agents/content-editor)

**Purpose**: Proofreads and polishes text for professional tone. Single-turn editing.

**Key Files**:

- `index.ts`: Server on port 10003 (env: `CONTENT_EDITOR_AGENT_PORT`).
- `genkit.ts`: Gemini 2.5 Flash model.
- `content_editor.prompt`: System: "You are an expert editor... Output only polished content."

**Skills**:

- ID: `editor`
- Example: "Edit this article for professional tone."

**Output**: Text response via final `TaskStatusUpdateEvent` (completed state).

**Example Interaction**:

- Input: "Fix this: i luv coding but its hard."
- Output: "I love coding, but it can be challenging at times."

## Movie Agent (src/agents/movie-agent)

**Purpose**: Answers movie/actor queries using TMDB API tools and Gemini for reasoning.

**Key Files**:

- `index.ts`: Server on port 41241 (env: `PORT`).
- `genkit.ts`: Gemini 2.0 Flash model.
- `movie_agent.prompt`: System instructions; ends with "COMPLETED" or "AWAITING_USER_INPUT".
- `tools.ts`: `searchMovies`, `searchPeople` (TMDB searches, full image URLs).
- `tmdb.ts`: API utility (`callTmdbApi`).

**Skills**:

- ID: `general_movie_chat`
- Examples: "Plot of Inception?", "Movies with Keanu Reeves?", "Recommend sci-fi."

**Output**: Text response; may require multiple tool calls. States: completed/input-required.

**Example Interaction**:

- Input: "When was Jurassic Park released?"
- Agent: Calls `searchMovies("Jurassic Park")` → "June 11, 1993. COMPLETED"

**Notes**: Maintains context history in-memory; resolves image paths to TMDB CDN.
