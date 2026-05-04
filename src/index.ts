import { defineTool, ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import { Type } from '@mariozechner/pi-ai';
import { join } from 'path';
import { readFileSync, existsSync } from 'node:fs';

type OllamaWebSearchSettings = {
  enabled: boolean;
  url: string;
  apiKey?: string;
  defaultMaxResults?: number;
};

type Settings = {
  ollamaWebSearchSettings?: OllamaWebSearchSettings;
};

type Result = {
  title: string;
  url: string;
  content: string;
};

type Response = {
  results: Result[];
};

function loadConfig(pwd: string): OllamaWebSearchSettings {
  const configPath = join(pwd, '.pi', 'settings.json');

  try {
    if (!existsSync(configPath)) {
      return { enabled: false } as OllamaWebSearchSettings;
    }
    const settingsBuffer = readFileSync(configPath);
    const settingsJson = JSON.parse(settingsBuffer.toString()) as Settings;

    return {
      ...{
        defaultMaxResults: 3,
      },
      ...settingsJson.ollamaWebSearchSettings,
    } as OllamaWebSearchSettings;
  } catch (error) {
    return { enabled: false } as OllamaWebSearchSettings;
  }
}

function createDoWebSearch(config: OllamaWebSearchSettings) {
  return async function doWebSearch(query: string, maxResults?: number): Promise<Response> {
    const response = await fetch(`${config.url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && {
          Authorization: `Bearer ${config.apiKey}`,
        }),
      },
      body: JSON.stringify({
        query,
        max_results: maxResults ?? config.defaultMaxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`);
    }

    return (await response.json()) as Response;
  };
}
export default function (pi: ExtensionAPI) {
  const pwd = process.cwd();
  const config = loadConfig(pwd);

  pi.on('session_start', async (_, ctx: ExtensionContext) => {
    if (config.enabled) {
      ctx.ui.notify(`Ollama Web Search Extension is enabled and will use url: ${config.url}`);
    }
  });

  if (config.enabled) {
    const doWebSearch = createDoWebSearch(config);

    pi.registerTool(
      defineTool({
        name: 'Ollama Web Search',
        label: 'web search',
        description: "Uses ollama's web search api to search the web for information.",
        parameters: Type.Object({
          query: Type.String({
            description: 'The search query to execute.',
          }),
          max_results: Type.Optional(
            Type.Number({
              description: 'The maximum number of results to return. Defaults to 3.',
              default: config.defaultMaxResults,
            }),
          ),
        }),
        execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
          try {
            const response = await doWebSearch(
              params.query,
              params.max_results || config.defaultMaxResults,
            );

            return {
              content: response.results.map((result, index) => ({
                type: 'text',
                text: `Result: ${index}:\n##Title: ${result.title}\nURL: ${result.url}\nContent: ${result.content}\n\n`,
              })),
              details: {
                tool: 'web_search',
                query: params.query,
                num_results: response.results.length,
              },
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error executing web search: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
              details: {
                tool: 'web_search',
                query: params.query,
                error: error instanceof Error ? error.message : String(error),
              },
            };
          }
        },
      }),
    );
  }
}
