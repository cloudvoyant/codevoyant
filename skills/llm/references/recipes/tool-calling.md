# Tool Calling

## What tool calling is

The model does not execute tools. It produces structured JSON describing which tool to call and with what arguments. Your code executes the tool and feeds the result back. Tool calling is a structured output mechanism: the model is constrained to produce valid JSON matching a schema, which is more reliable than asking it to generate code or parse free text.

Both Anthropic and OpenAI models support native tool calling in their API. The Vercel AI SDK and LangChain abstract over provider differences, giving you a single interface regardless of which model you use.

## Defining tool schemas

### AI SDK (TypeScript)

```typescript
import { tool } from "ai";
import { z } from "zod";

const searchTool = tool({
  description: "Search the knowledge base for relevant documents",
  parameters: z.object({
    query: z.string().describe("Natural language search query"),
    maxResults: z.number().optional().describe("Maximum number of results to return"),
    category: z.enum(["docs", "code", "issues"]).describe("Category to search within"),
  }),
  execute: async ({ query, maxResults = 5, category }) => {
    const results = await knowledgeBase.search(query, { maxResults, category });
    return { results, totalCount: results.length };
  },
});
```

The Zod schema IS the schema. The `.describe()` method on individual fields adds parameter-level descriptions that help the model understand what to pass. These descriptions appear in the tool definition sent to the model, so be specific.

### Anthropic SDK (TypeScript)

Raw JSON Schema in the `tools` array:

```typescript
const tools: Anthropic.Tool[] = [
  {
    name: "search_knowledge_base",
    description: "Search the knowledge base for relevant documents",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return",
        },
        category: {
          type: "string",
          enum: ["docs", "code", "issues"],
          description: "Category to search within",
        },
      },
      required: ["query"],
    },
  },
];
```

### LangChain (Python)

The `@tool` decorator with type hints:

```python
from langchain_core.tools import tool
from typing import Literal

@tool
def search_knowledge_base(
    query: str,
    max_results: int = 5,
    category: Literal["docs", "code", "issues"] = "docs",
) -> str:
    """Search the knowledge base for relevant documents.

    Args:
        query: Natural language search query
        max_results: Maximum number of results to return
        category: Category to search within
    """
    results = knowledge_base.search(query, max_results=max_results, category=category)
    return json.dumps({"results": results, "total_count": len(results)})
```

LangChain generates the schema from the function signature and docstring. Type hints become JSON Schema types, default values become optional parameters, and the docstring's Args section becomes parameter descriptions.

### Best practices for descriptions

Be specific about what the tool does, what it returns, and when to use it versus other tools. The description is a prompt to the model. Vague descriptions like "Search for stuff" lead to misuse. Compare:

- Bad: `"Search for information"`
- Good: `"Search the internal knowledge base for documents matching a natural language query. Returns up to maxResults documents with title, snippet, and relevance score. Use this for factual questions about company policies, runbooks, and technical documentation."`

## Parallel tool use

Models can return multiple tool calls in a single response when the calls are independent.

### AI SDK

`result.toolCalls` is an array. By default, all tool execute functions run in parallel via `Promise.all`:

```typescript
const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: { search, getWeather, getStockPrice },
  messages: [{ role: "user", content: "What's the weather in NYC and the current AAPL price?" }],
  maxSteps: 5,
});

// The model returns two tool calls in one response
// Both execute simultaneously
```

### Anthropic SDK

The response `content` array may contain multiple `tool_use` blocks. Execute all and return all results in the next message:

```typescript
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

// All tool results go in a single user message
messages.push({ role: "user", content: toolResults });
```

### LangChain

`result.tool_calls` is a list. Execute with the tool map:

```python
for tc in result.tool_calls:
    tool_fn = tool_map[tc["name"]]
    output = tool_fn.invoke(tc["args"])
```

### When parallel execution matters

Independent lookups (search + weather) should run in parallel for latency. Dependent operations (create user, then send welcome email) must be sequential. Pattern for controlling execution order: check tool names and execute in dependency order, or disable parallel tool use at the model level with `tool_choice` configuration forcing one tool at a time.

## Tool result handling

The model needs structured, parseable results. Follow these principles:

**Return JSON strings or plain text, not raw objects.** The model reads the tool result as a string in the next turn. Structured JSON gives it fields to reference.

**Keep results concise.** If a search returns 50 results, summarize or truncate to the top 5 with snippets. Large tool results consume context window and dilute the signal:

```typescript
execute: async ({ query }) => {
  const allResults = await search(query);
  const top5 = allResults.slice(0, 5).map((r) => ({
    title: r.title,
    snippet: r.snippet.slice(0, 200),
    score: r.score,
  }));
  return {
    results: top5,
    total_count: allResults.length,
    has_more: allResults.length > 5,
  };
},
```

**Include metadata that helps the model decide what to do next.** Fields like `total_count`, `has_more`, and `next_page_token` let the model decide whether it needs to search again or has enough information.

**Return errors as tool results, not exceptions.** The model can reason about a structured error and decide whether to retry or explain the failure:

```typescript
return {
  error: "Rate limited by upstream API",
  retry_after_seconds: 30,
};
```

## Error recovery patterns

### Invalid arguments from the model

The AI SDK throws a Zod validation error when the model produces arguments that do not match the schema. Catch it, format the error, and feed it back:

```typescript
// The AI SDK handles this internally when maxSteps > 1:
// it sends the validation error as a tool result and the model retries.
// For manual handling with the Anthropic SDK:
try {
  const validated = toolSchema.parse(block.input);
  const result = await executeTool(validated);
} catch (error) {
  if (error instanceof z.ZodError) {
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify({
        error: "Invalid arguments",
        details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      }),
    });
  }
}
```

### Tool execution failures

Wrap all tool executions in try/catch and always return a result. Never let the agent loop crash:

```typescript
execute: async (args) => {
  try {
    return await performAction(args);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      retryable: error instanceof RateLimitError || error instanceof TimeoutError,
      suggestion: "Try a different query or reduce the scope",
    };
  }
},
```

The model will typically retry with different arguments if the error is marked retryable, or explain the failure to the user if it is not.

## Tool choice and forcing

Control whether and which tools the model calls:

**`tool_choice: "auto"`** (default): the model decides whether to call tools. This is the right choice for most agent loops.

**`tool_choice: { type: "tool", name: "search" }`**: force the model to call a specific tool. Useful for the first turn when you know the user's intent requires a particular action:

```typescript
// AI SDK
const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: { search, analyze },
  toolChoice: { type: "tool", toolName: "search" },
  messages,
});

// Anthropic SDK
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  tools,
  tool_choice: { type: "tool", name: "search_knowledge_base" },
  messages,
});

// LangChain
llm_with_tools = llm.bind_tools(tools, tool_choice="search_knowledge_base")
```

**`tool_choice: "none"`**: disable tool calling for a turn. Useful when you want the model to synthesize results without making more calls, such as after several rounds of tool use.

## Designing tools for reliability

**Fewer, broader tools are more reliable than many narrow ones.** A model with 3 tools makes better choices than one with 30. The model must reason about which tool to use, and more options means more opportunity for mistakes.

**Group related operations.** Instead of separate `create_user`, `update_user`, `delete_user` tools, provide a single `manage_user` tool with an action parameter:

```typescript
const manageUser = tool({
  description: "Create, update, or delete a user account",
  parameters: z.object({
    action: z.enum(["create", "update", "delete"]).describe("Operation to perform"),
    userId: z.string().optional().describe("Required for update and delete"),
    data: z.record(z.string()).optional().describe("User data for create/update"),
  }),
  execute: async ({ action, userId, data }) => {
    switch (action) {
      case "create": return await createUser(data);
      case "update": return await updateUser(userId!, data);
      case "delete": return await deleteUser(userId!);
    }
  },
});
```

**Use enums to constrain string parameters.** `z.enum(["create", "update", "delete"])` is more reliable than `z.string()` because the model cannot produce an invalid value.

**Provide examples in descriptions.** `"Search the knowledge base. Example query: 'how to reset password'"` helps the model understand the expected input format.

**Test tool schemas before building execution logic.** Call the model with your tools and sample prompts, inspect what it generates. This catches description issues early, before you invest in building the tool implementation.

## Gotchas

**Tool name restrictions.** The Anthropic API requires tool names to be alphanumeric with underscores only (no hyphens, no dots, no spaces). The AI SDK normalizes names for you, but if you are debugging raw API calls, a name like `get-weather` will be rejected.

**Tool count limits.** Anthropic supports up to 128 tools per request, but model quality degrades significantly above roughly 20 tools. The model spends more tokens reasoning about tool selection and is more likely to pick the wrong one. Prefer fewer, well-described tools over a large catalog.

**Tool descriptions consume tokens.** Every tool description is included in the prompt on every turn. Long descriptions reduce the available context window for messages and tool results. Keep descriptions informative but concise; move detailed usage notes to a system prompt section about tool usage strategy rather than the tool description itself.

**`tool_choice: "required"` can cause infinite loops.** If you force the model to always call a tool (without specifying which one), it may keep calling tools without ever producing a final text response. Always combine forced tool choice with `maxSteps` to prevent runaway loops.

**Parallel tool calls with dependencies.** The model may return parallel tool calls that have implicit dependencies (e.g., "search for user" and "update user" in the same response). If your tools have side effects, execute them sequentially even if they arrive in the same response, or validate that the dependency order is safe before parallel execution.
