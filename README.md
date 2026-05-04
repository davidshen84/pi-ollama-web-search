# Ollama Web Search Extension

This extension adds web searching capabilities to the pi coding agent by integrating with an Ollama-based web search API.

## Overview

The `ollama-web-search` extension allows the AI agent to perform external web queries to retrieve up-to-date information, documentation, or general knowledge that may not be present in its training data.

## Features

- **Customizable Search**: Ability to configure the API endpoint and API key via settings.
- **Result Control**: Option to specify the maximum number of results returned.
- **Integrated Tooling**: Registers a `web search` tool that can be called by the agent during a session.

## Configuration

The extension reads its configuration from `.pi/settings.json` in the project root.

### Settings Schema

```json
{
  "ollamaWebSearchSettings": {
    "enabled": boolean,
    "url": "string",
    "apiKey": "string (optional)",
    "defaultMaxResults": number
  }
}
```

- `enabled`: Set to `true` to enable the extension.
- `url`: The endpoint of your Ollama web search API.
- `apiKey`: (Optional) Your API key for authentication.
- `defaultMaxResults`: (Optional) The default number of search results to return (defaults to 3).

## Tool Details

### `Ollama Web Search`
- **Description**: Uses ollama's web search api to search the web for information.
- **Parameters**:
  - `query` (string): The search query to execute.
  - `max_results` (number, optional): The maximum number of results to return. Defaults to 3.

## Technical Implementation

- Built using the `@mariozechner/pi-coding-agent` API.
- Implements a dynamic tool registration based on the `enabled` flag in the configuration.
- Handles API communication via `fetch` with support for Bearer token authentication.

## Development

### Prerequisites

- Node.js
- npm or yarn
- TypeScript

### Building the Project

To build the extension, run:

```bash
npm run build
```

### Git Commit Messages

This project follows the [Git Karma](https://github.com/git-karma/git-karma) style for commit messages. Commits should be prefixed with a type and an optional scope:

`type(scope): description`

**Common types used in this project:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or other non-source files
