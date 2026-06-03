# Agents with LangChain/LangGraph

## Why LangGraph

LangChain provides composable chains and tool abstractions for building LLM-powered applications. LangGraph adds explicit state machines on top: nodes are functions, edges are transitions, and the graph state is a typed dict that flows through the system.

Use LangGraph when your agent has branching logic, needs checkpointing for long-running tasks, or requires human-in-the-loop approval at specific decision points. Use plain LangChain chains for simple prompt-in/text-out pipelines that do not need agentic loops.

## LangChain basics: ChatModel + tools

Setting up the chat model and binding tools:

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool

llm = ChatAnthropic(model="claude-sonnet-4-20250514")

@tool
def search_knowledge_base(query: str) -> str:
    """Search the internal knowledge base for relevant documents.

    Args:
        query: Natural language search query
    """
    results = knowledge_base.search(query)
    return json.dumps({"results": results, "count": len(results)})

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city.

    Args:
        city: City name
    """
    return json.dumps(weather_api.get_current(city))

llm_with_tools = llm.bind_tools([search_knowledge_base, get_weather])
```

The `@tool` decorator generates the tool schema from the function signature and docstring. Type hints become JSON Schema types, and the docstring becomes the tool description. LangChain uses these to tell the model what tools are available and how to call them.

Invoking and inspecting tool calls:

```python
from langchain_core.messages import HumanMessage

result = llm_with_tools.invoke([HumanMessage("What's the weather in Paris?")])

# result.tool_calls is a list of ToolCall objects
for tc in result.tool_calls:
    print(tc["name"], tc["args"], tc["id"])
```

## Building a LangGraph agent

The `StateGraph` pattern gives you full control over how the agent loop works.

### Define the state

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
```

The `add_messages` reducer handles appending new messages to the list and deduplicating by message ID.

### Define the nodes

```python
from langchain_core.messages import AIMessage

def agent(state: AgentState) -> dict:
    """Call the LLM with the current messages and tools."""
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def tools_node(state: AgentState) -> dict:
    """Execute all tool calls from the last message."""
    last_message = state["messages"][-1]
    tool_results = []
    for tc in last_message.tool_calls:
        tool_fn = tool_map[tc["name"]]
        result = tool_fn.invoke(tc["args"])
        tool_results.append(
            ToolMessage(content=str(result), tool_call_id=tc["id"])
        )
    return {"messages": tool_results}
```

### Wire the graph

```python
from langgraph.graph import StateGraph, START, END

def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", tools_node)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")

app = graph.compile()
```

### Invoke

```python
from langchain_core.messages import HumanMessage

result = app.invoke({
    "messages": [HumanMessage("Search for our deployment runbook")]
})

# result["messages"] contains the full conversation including tool calls and results
final_response = result["messages"][-1].content
```

## Conditional edges and routing

Beyond the basic tool-call check, conditional edges can route based on content analysis or tool results.

### Intent-based routing

```python
def route_by_intent(state: AgentState) -> str:
    last_message = state["messages"][-1]

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        tool_names = [tc["name"] for tc in last_message.tool_calls]
        if "search_knowledge_base" in tool_names:
            return "research"
        if "deploy_service" in tool_names:
            return "deploy"
        return "tools"

    return END

graph.add_conditional_edges("agent", route_by_intent, {
    "research": "research_node",
    "deploy": "deploy_node",
    "tools": "generic_tools",
    END: END,
})
```

### Multi-step research agent

A practical pattern: a research agent that routes between "search", "analyze", and "summarize" nodes based on accumulated state:

```python
class ResearchState(TypedDict):
    messages: Annotated[list, add_messages]
    gathered_facts: list[str]
    search_count: int

def decide_next_step(state: ResearchState) -> str:
    if state["search_count"] >= 3:
        return "summarize"
    if state["gathered_facts"]:
        return "analyze"
    return "search"
```

This lets the agent systematically gather information before drawing conclusions, rather than trying to answer in a single LLM call.

## Memory and state management

### Short-term memory

The `messages` list in graph state carries the full conversation for the current session. Every node reads from and writes to this list.

### Long-term memory with checkpointing

`MemorySaver` persists state across invocations:

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)

# First invocation — starts a new thread
config = {"configurable": {"thread_id": "user-123"}}
result = app.invoke(
    {"messages": [HumanMessage("Find our deployment runbook")]},
    config=config,
)

# Second invocation — resumes the same thread
result = app.invoke(
    {"messages": [HumanMessage("Now deploy it to staging")]},
    config=config,
)
```

The `thread_id` maps to a conversation thread. Invoking with the same `thread_id` resumes the conversation from where it left off, including all intermediate tool calls and results.

### Production checkpointers

`MemorySaver` is in-memory only and lost on restart. For production, use persistent checkpointers:

```python
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.postgres import PostgresSaver

# SQLite for single-process deployments
checkpointer = SqliteSaver.from_conn_string("checkpoints.db")

# PostgreSQL for multi-process / distributed deployments
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/langgraph"
)
```

### State reducers

`Annotated[list, add_messages]` uses LangGraph's built-in message deduplication by message ID. Custom reducers can merge or filter state:

```python
def merge_facts(existing: list[str], new: list[str]) -> list[str]:
    """Deduplicate facts by content."""
    return list(set(existing + new))

class ResearchState(TypedDict):
    messages: Annotated[list, add_messages]
    gathered_facts: Annotated[list[str], merge_facts]
```

## Checkpointing and time travel

LangGraph checkpoints capture the full state after every node execution. This enables inspection and time travel.

### Inspect state

```python
config = {"configurable": {"thread_id": "user-123"}}

# Current state
state = app.get_state(config)
print(state.values["messages"])

# Full history of checkpoints
for checkpoint in app.get_state_history(config):
    print(checkpoint.config, checkpoint.values["messages"][-1])
```

### Resume from a checkpoint

```python
# Modify state and resume from any point — useful for debugging
# and for human-in-the-loop workflows
app.update_state(
    config,
    values={"messages": [HumanMessage("Actually, deploy to staging instead")]},
    as_node="agent",
)

# Resume execution from the modified state
result = app.invoke(None, config)
```

The `as_node` parameter tells LangGraph which node "produced" the state update, so execution continues from the correct next edge.

## Human-in-the-loop with interrupts

`interrupt_before` pauses execution before a specified node, giving a human the chance to approve or reject the pending action.

```python
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["tools"],
)

config = {"configurable": {"thread_id": "deploy-review-1"}}

# First invocation — runs the agent node, pauses before tools
result = app.invoke(
    {"messages": [HumanMessage("Deploy auth-service v2.1 to production")]},
    config=config,
)

# Inspect what the agent wants to do
state = app.get_state(config)
pending_tool_calls = state.values["messages"][-1].tool_calls
print("Agent wants to call:", pending_tool_calls)

# Option 1: Approve — resume execution
result = app.invoke(None, config)

# Option 2: Reject — modify state and resume
app.update_state(
    config,
    values={
        "messages": [
            HumanMessage("Deployment rejected. Deploy to staging instead.")
        ]
    },
    as_node="agent",
)
result = app.invoke(None, config)
```

This pattern is essential for production agents that take irreversible actions. The checkpointer ensures that the full conversation state is preserved even if the approval takes hours or days.

## Subgraphs and composition

A node in a parent graph can be another compiled graph. This encapsulates complex workflows.

```python
# Define a research subgraph
research_graph = StateGraph(AgentState)
research_graph.add_node("search", search_node)
research_graph.add_node("analyze", analyze_node)
research_graph.add_edge(START, "search")
research_graph.add_conditional_edges("search", has_enough_info, {
    "analyze": "analyze",
    "search": "search",
})
research_graph.add_edge("analyze", END)
research_subgraph = research_graph.compile()

# Embed in a parent graph
parent_graph = StateGraph(AgentState)
parent_graph.add_node("plan", plan_node)
parent_graph.add_node("research", research_subgraph)
parent_graph.add_node("write", write_node)
parent_graph.add_edge(START, "plan")
parent_graph.add_edge("plan", "research")
parent_graph.add_edge("research", "write")
parent_graph.add_edge("write", END)

app = parent_graph.compile()
```

The subgraph receives and returns the parent's state type. Use subgraphs when a workflow segment has its own internal loop (like research with multiple search iterations) but is part of a larger pipeline.

## Gotchas

**State mutations.** Always return new state dicts from nodes. Never mutate the state in place. LangGraph relies on return values for checkpointing; in-place mutations will not be captured and will cause subtle bugs when replaying from checkpoints.

**Message deduplication.** The `add_messages` reducer deduplicates by message ID. If you construct messages without IDs (which is common when building `ToolMessage` or `HumanMessage` objects), duplicates will accumulate in the state. Either assign explicit IDs or accept that the message list may contain duplicates and handle this in your token counting logic.

**Streaming modes.** `app.stream(inputs, config, stream_mode="values")` yields the full state after each node executes. `stream_mode="updates"` yields only the delta (what the node returned). Use "updates" when you want to show the user what each step did; use "values" when you need the full state for downstream processing.

**Token counting.** LangGraph does not automatically track token usage. If you need to monitor or limit token consumption, add a token count field to your state and update it in the agent node using the response metadata:

```python
def agent(state: AgentState) -> dict:
    response = llm_with_tools.invoke(state["messages"])
    token_count = state.get("total_tokens", 0)
    usage = response.response_metadata.get("usage", {})
    token_count += usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
    return {"messages": [response], "total_tokens": token_count}
```
