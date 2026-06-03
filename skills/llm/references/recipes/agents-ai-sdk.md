# Agents with Vercel AI SDK / Anthropic SDK

## Why these SDKs

The Vercel AI SDK (`ai` npm package) provides a unified interface across LLM providers (Anthropic, OpenAI, Google) with first-class streaming, tool calling, and React/Svelte UI bindings. The Anthropic SDK (`@anthropic-ai/sdk`) is the direct TypeScript/Python client for Claude models with the lowest abstraction overhead.

Use the AI SDK when you need provider flexibility or frontend streaming hooks. Use the Anthropic SDK directly when you need maximum control over the request/response cycle or are building a backend-only agent.

## Agent loop with the AI SDK

The core pattern uses `generateText` with `tools` and `maxSteps`. The AI SDK automatically manages the tool-call loop: the model responds with tool calls, the SDK executes tools, feeds results back, and the model continues until it produces a final text response or hits the step limit.

Define tools with `tool()` from `ai`. Each tool has a `description`, `parameters` (Zod schema), and an `execute` function:

```typescript
import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: {
    searchKnowledgeBase: tool({
      description: "Search the internal knowledge base for relevant documents",
      parameters: z.object({
        query: z.string().describe("Natural language search query"),
        maxResults: z.number().optional().describe("Max results to return"),
      }),
      execute: async ({ query, maxResults = 5 }) => {
        const results = await knowledgeBase.search(query, maxResults);
        return { results, totalCount: results.length };
      },
    }),
    getWeather: tool({
      description: "Get current weather for a city",
      parameters: z.object({
        city: z.string().describe("City name"),
      }),
      execute: async ({ city }) => {
        return await weatherApi.getCurrent(city);
      },
    }),
  },
  maxSteps: 10,
  messages: [{ role: "user", content: "What's the weather in cities mentioned in our travel policy?" }],
});
```

`maxSteps` controls how many tool-call/tool-result round trips the agent can make before returning. This is distinct from `maxTokens`, which bounds a single LLM response. If the agent needs to call `searchKnowledgeBase` and then `getWeather` three times, that is four steps minimum (one for the search call, one for interpreting results and calling weather, and so on).

Access `result.steps` to inspect each round trip. `result.text` holds the final response. `result.toolCalls` contains all tool invocations across all steps.

## Agent loop with the Anthropic SDK

The manual loop pattern gives maximum control over every step of the agent cycle:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "search_knowledge_base",
    description: "Search the internal knowledge base for relevant documents",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Natural language search query" },
      },
      required: ["query"],
    },
  },
];

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "Find our deployment runbook" },
];

let continueLoop = true;

while (continueLoop) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools,
    messages,
  });

  // Append the assistant's response to the conversation
  messages.push({ role: "assistant", content: response.content });

  if (response.stop_reason === "tool_use") {
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeToolByName(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  } else {
    // stop_reason is "end_turn" or "max_tokens" — agent is done
    continueLoop = false;
  }
}
```

The `stop_reason` values tell you what happened: `end_turn` means the agent decided it is finished, `tool_use` means the agent wants to call tools, and `max_tokens` means the response was truncated (you may need to continue in another turn or increase the limit).

## Streaming

### AI SDK streaming

`streamText` returns an async iterable of text deltas plus an `onStepFinish` callback for tool results:

```typescript
import { streamText } from "ai";

const result = streamText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: { /* ... */ },
  maxSteps: 10,
  messages,
  onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
    console.log("Step finished:", finishReason);
  },
});

// Stream to a frontend with Next.js / SvelteKit
return result.toDataStreamResponse();
```

The `toDataStreamResponse()` method produces a streaming response compatible with the AI SDK's frontend hooks (`useChat`, `useCompletion`).

### Anthropic SDK streaming

```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  tools,
  messages,
});

stream.on("text", (text) => {
  process.stdout.write(text);
});

stream.on("message", (message) => {
  // Full message available — check for tool_use blocks
});

const finalMessage = await stream.finalMessage();
```

When streaming matters: user-facing agents need streaming for perceived latency reduction (the user sees tokens appearing immediately). Backend agents can use non-streaming for simpler code and easier error handling.

## Multi-turn conversation management

The messages array is the conversation state. The core pattern: maintain a `messages` array, append user messages, call the model, append the assistant response (including tool calls and results), repeat.

### AI SDK multi-turn

```typescript
import { CoreMessage, generateText } from "ai";

const messages: CoreMessage[] = [];

async function chat(userMessage: string) {
  messages.push({ role: "user", content: userMessage });

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    tools: { /* ... */ },
    maxSteps: 10,
    messages,
  });

  // result.response.messages contains the complete messages to append,
  // including tool call/result pairs from intermediate steps
  messages.push(...result.response.messages);

  return result.text;
}
```

### Anthropic SDK multi-turn

With the Anthropic SDK, you manually construct the message array from response content blocks. The messages array in the loop example above already demonstrates this: each assistant response and each set of tool results is appended in order.

### Context window limits

Track token count with `result.usage.totalTokens` (AI SDK) or `response.usage.input_tokens + response.usage.output_tokens` (Anthropic SDK). When approaching the model's context limit, implement a sliding window (drop the oldest messages) or a summarization strategy (ask the model to summarize the conversation so far, replace the history with the summary).

## Human-in-the-loop

Pattern for pausing the agent when it encounters a high-stakes tool call.

### AI SDK approach

Set `execute` to undefined for tools that need approval. The model can still call the tool, but the SDK will not execute it automatically:

```typescript
const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: {
    deployToProduction: tool({
      description: "Deploy the specified service to production",
      parameters: z.object({
        service: z.string(),
        version: z.string(),
      }),
      // No execute function — requires human approval
    }),
    getServiceStatus: tool({
      description: "Check the current status of a service",
      parameters: z.object({ service: z.string() }),
      execute: async ({ service }) => getStatus(service),
    }),
  },
  maxSteps: 10,
  messages,
});

// Check if the agent tried to call a tool without an execute function
for (const step of result.steps) {
  for (const toolCall of step.toolCalls) {
    if (toolCall.toolName === "deployToProduction") {
      const approved = await promptUser(
        `Deploy ${toolCall.args.service} v${toolCall.args.version} to production?`
      );

      if (approved) {
        const deployResult = await deploy(toolCall.args);
        // Continue the conversation with the tool result
        const continuation = await generateText({
          model: anthropic("claude-sonnet-4-20250514"),
          tools: { /* same tools */ },
          maxSteps: 5,
          messages: [
            ...messages,
            ...result.response.messages,
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: toolCall.toolCallId,
                  result: deployResult,
                },
              ],
            },
          ],
        });
      }
    }
  }
}
```

### Anthropic SDK approach

In the manual loop, check tool names before execution and pause for high-stakes operations:

```typescript
for (const block of response.content) {
  if (block.type === "tool_use" && block.name === "deploy_to_production") {
    const approved = await promptUser(`Deploy ${block.input.service}?`);
    if (!approved) {
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: "User rejected the deployment request.",
      });
      continue;
    }
  }
  // Execute approved tools normally
}
```

## System prompt design for agents

Keep system prompts focused on four elements: role, tool usage guidance, output format preferences, and constraints.

```typescript
const systemPrompt = `You are a DevOps assistant that helps engineers manage deployments.

## When to use tools
- Use getServiceStatus before any deployment to verify current state
- Use deployToProduction only after confirming the service is healthy
- Never deploy multiple services simultaneously

## Output format
- Summarize what you did after each action
- Report any errors with the full error message

## Constraints
- Never deploy to production without checking service health first
- If a deployment fails, do not retry automatically — report and stop`;
```

Separate the "personality" from the "instructions" with clear section headers in the system prompt. Do not put tool schemas in the system prompt. The SDKs pass tool descriptions to the model automatically; duplicating them wastes context window and can cause conflicts if they drift out of sync.

## Error handling and retries

### Tool execution errors

Wrap tool `execute` functions in try/catch. Return structured error messages that the model can reason about:

```typescript
execute: async ({ query }) => {
  try {
    return await knowledgeBase.search(query);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      retryable: error instanceof RateLimitError,
    };
  }
},
```

The model will see the error in the tool result and can decide whether to retry with different arguments, try a different approach, or explain the failure to the user.

### SDK-level retries

The Anthropic SDK has built-in retry with the `maxRetries` option:

```typescript
const client = new Anthropic({ maxRetries: 3 });
```

The AI SDK: configure retry in the provider options or wrap calls in your own retry logic for 429 (rate limited) and 529 (overloaded) responses with exponential backoff.

### Token budget exceeded

Catch the `max_tokens` stop reason and decide whether to continue in a new turn (append the partial response and ask the model to continue) or summarize and restart.

## Gotchas

`maxSteps` silently caps the loop. If the agent hits the limit, it returns whatever partial result it has without error. Always check `result.finishReason` to know whether the agent completed naturally (`stop`) or was cut short (`maxSteps`).

The AI SDK's `tool()` helper validates parameters with Zod at runtime. If the model produces invalid JSON for the tool arguments, the SDK throws a validation error. Catch this and feed the error back to the model so it can retry with corrected arguments.

Anthropic SDK tool results must use the exact format `{ type: "tool_result", tool_use_id: ..., content: ... }`. The `tool_use_id` must match the `id` from the corresponding `tool_use` block in the assistant's response. Mismatched IDs silently break the conversation, often causing the model to ignore the tool result entirely.

The AI SDK normalizes tool names across providers, but the underlying Anthropic API requires tool names to be alphanumeric with underscores only (no hyphens or dots). If you define a tool as `get-weather` in the AI SDK, the provider adapter handles the translation, but if you are debugging raw API calls the name mismatch can be confusing.
