import { defineTool, ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import { Type } from '@mariozechner/pi-ai';
import { join } from 'path';
import { existsSync, readFileSync } from 'node:fs';

type OllamaWebSearchSettings = {
  enabled: boolean;
  url: string;
  apiKey?: string;
  defaultMaxResults: number;
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

function loadSettings(pwd: string): OllamaWebSearchSettings {
  const filePath = join(pwd, '.pi', 'settings.json');

  try {
    if (!existsSync(filePath)) {
      return { enabled: false } as OllamaWebSearchSettings;
    }
    const settingsBuffer = readFileSync(filePath);
    const settingsJson = JSON.parse(settingsBuffer.toString()) as Settings;

    return {
      ...{
        defaultMaxResults: 3,
      },
      ...settingsJson.ollamaWebSearchSettings,
    } as OllamaWebSearchSettings;
  } catch {
    return { enabled: false } as OllamaWebSearchSettings;
  }
}

async function doFetch(input: string, init?: RequestInit): Promise<globalThis.Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    console.error('Web fetch failed:', error);
    throw error;
  }
}

async function doWebSearch(
  settings: OllamaWebSearchSettings,
  query: string,
  maxResults?: number,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await doFetch(`${settings.url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey && {
        Authorization: `Bearer ${settings.apiKey}`,
      }),
    },
    body: JSON.stringify({
      query,
      max_results: maxResults ?? settings.defaultMaxResults,
    }),
    signal: signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Web search request failed with status ${response.status}: ${errorText}`);
  }

  return (await response.json()) as Response;
}

export default function (pi: ExtensionAPI) {
  const pwd = process.cwd();
  const settings = loadSettings(pwd);

  pi.on('session_start', async (_, ctx: ExtensionContext) => {
    if (settings.enabled) {
      ctx.ui.notify(`Ollama Web Search Extension is enabled and will use url: ${settings.url}`);
    }
  });

  pi.registerTool(
    defineTool({
      name: 'web_fetch',
      label: 'web fetch',
      description: 'Fetches data from the web using the Fetch API.',
      parameters: Type.Object({
        url: Type.String({
          description: 'The URL to fetch data from.',
        }),
      }),
      execute: async (_toolCallId, params, signal, _onUpdate, _ctx) => {
        try {
          const response = await doFetch(params.url, { signal });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to fetch data from ${params.url}. Status: ${response.status}. Error: ${errorText}`,
                },
              ],
              details: {
                tool: 'web_fetch',
                url: params.url,
                status: response.status,
                error: errorText,
              },
            };
          }

          const text = await response.text();

          return {
            content: [
              {
                type: 'text',
                text: `Successfully fetched data from ${params.url}`,
              },
              {
                type: 'text',
                text: text,
              },
            ],
            details: {
              tool: 'web_fetch',
              url: params.url,
              status: response.status,
            },
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching data from ${params.url}: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            details: {
              tool: 'web_fetch',
              url: params.url,
              error: error instanceof Error ? error.message : String(error),
            },
          };
        }
      },
    }),
  );

  if (settings.enabled) {
    pi.registerTool(
      defineTool({
        name: 'ollama_web_search',
        label: 'ollama web search',
        description: "Uses ollama's web search api to search the web for information.",
        parameters: Type.Object({
          query: Type.String({
            description: 'The search query to execute.',
          }),
          max_results: Type.Number({
            description: 'The maximum number of results to return. Defaults to 3.',
            default: settings.defaultMaxResults,
          }),
        }),
        execute: async (_toolCallId, params, signal, _onUpdate, _ctx) => {
          try {
            const response = await doWebSearch(
              settings,
              params.query,
              params.max_results ?? settings.defaultMaxResults,
              signal,
            );

            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Successfully executed web search for query: "${params.query}". Found ${response.results.length} results.`,
                },
                ...response.results.map((result, index) => ({
                  type: 'text' as const,
                  text: `\n===\nResult: ${index}:\n#Title: ${result.title}\nURL: ${result.url}\nContent: ${result.content}\n\n`,
                })),
              ],
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
