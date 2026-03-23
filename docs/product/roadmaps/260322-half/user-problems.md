## Findings: User Problems and JTBD

### Source Map
- Stack Overflow Developer Survey 2025 — quantified frustrations across 65K+ developers
- Hacker News threads on AI agent control and reliability — experienced developer perspectives
- SonarSource State of Code Developer Survey 2026 — code quality impact data
- Oracle Developers Blog on agent memory — architectural analysis of the memory problem
- DEV Community articles on session persistence — practitioner solutions

### Key Findings
- 66% of developers say fixing AI-generated code is more time-consuming than the time saved — [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) [Tier 2] [High confidence]
- Context pain increases with experience: 41% of juniors vs 52% of seniors report AI missing contextual relevance — [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) [Tier 2] [High confidence]
- AI code contains security bugs at 1.5-2x the rate of human code, and excessive I/O operations at 8x the rate — [Qodo State of AI Code Quality](https://www.qodo.ai/reports/state-of-ai-code-quality/) [Tier 2] [High confidence]
- Persistent memory systems achieve 26% higher response accuracy vs stateless approaches — [Mem0 Research](https://arxiv.org/pdf/2504.19413) [Tier 1] [High confidence]
- Developers describe AI agents as "many incompetent team members whose random work output requires extensive review" — [Hacker News](https://news.ycombinator.com/item?id=44294633) [Tier 3] [Medium confidence]
- Most frequent AI users report NEW frustrations: managing technical debt and correcting AI-created code, replacing old frustrations with new ones — [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) [Tier 2] [High confidence]
- Session boundaries create hard resets — "close your terminal, switch to a new chat, or hit a rate limit and all learned context vanishes" — [DEV Community](https://dev.to/itlackey/your-agents-memory-shouldnt-disappear-when-the-session-ends-18mo) [Tier 3] [Medium confidence]
- Developers who receive inconsistent output are 1.5x more likely to flag "code not in line with team standards" as a top frustration — [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) [Tier 2] [High confidence]

### Jobs to be Done

**Job:** When I'm building a product as a solo developer or small team, I want AI agents to handle entire features autonomously, so I can ship at the velocity of a much larger team
- **Functional dimension:** Assign a feature spec, have agents write code, run tests, open PRs
- **Emotional dimension:** Feel like I have a capable team behind me, not fighting a tool
- **Evidence:** 80% developer adoption but only 52% report meaningful impact — [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/)

**Job:** When I return to a project after days away, I want the agent to know what we've been working on and what decisions were made, so I can resume productive work immediately
- **Functional dimension:** Persistent memory across sessions, project-level context, decision history
- **Emotional dimension:** Feel continuity instead of starting over every session
- **Evidence:** Memory systems achieve 26% better accuracy — [Mem0](https://arxiv.org/pdf/2504.19413); session loss is a top complaint — [Oracle Blog](https://blogs.oracle.com/developers/agent-memory-why-your-ai-has-amnesia-and-how-to-fix-it)

**Job:** When I have multiple agents working in parallel, I want to see what each is doing and step in when needed, so I can maintain code quality without babysitting
- **Functional dimension:** Real-time monitoring dashboard, token cost tracking, intervention controls
- **Emotional dimension:** Feel in control, not anxious about what agents are doing unsupervised
- **Evidence:** tmuxcc and Conduit projects built specifically for this — [GitHub tmuxcc](https://github.com/nyanko3141592/tmuxcc); [Conduit](https://getconduit.sh/)

**Job:** When my code is ready to deploy, I want to push and have it running without configuring infrastructure, so I can focus on building features not managing servers
- **Functional dimension:** Git-push deployment, automatic SSL, database provisioning, environment management
- **Emotional dimension:** Feel like infrastructure is handled, not another thing to learn
- **Evidence:** Railway's $100M raise on "push code, get a running app" — [The Software Scout](https://thesoftwarescout.com/fly-io-vs-railway-2026-which-developer-platform-should-you-deploy-on/)

### Pains
- **"Almost right" code** (highest severity, 66% of developers) — AI output requires extensive fixing, often taking longer than writing it manually
- **Context loss across sessions** (high severity, frequently mentioned) — every session starts from scratch, learned patterns and decisions vanish
- **Inconsistent coding standards** (high severity, 1.5x frustration multiplier) — AI doesn't follow team conventions without extensive prompting
- **Security vulnerabilities** (high severity, 1.5-2x rate) — AI introduces bugs that humans wouldn't, requiring extra review
- **Cost unpredictability** (medium severity, growing concern) — usage-based pricing makes it hard to budget
- **Constraint drift** (medium severity, scales with project size) — agent behavior degrades as codebases and prompt complexity grow
- **No multi-agent visibility** (medium severity, growing with adoption) — developers can't see what parallel agents are doing

### Gains
- Ship features at 2-5x velocity for tasks within the agent's capability sweet spot
- Reduce context-switching by having agents handle boilerplate, tests, and documentation
- Enable solo developers to tackle multi-service architectures
- Reduce deployment friction to zero (the Railway/Vercel promise)
- Build institutional memory that survives team member turnover

### Workarounds
- Developers build custom TUI dashboards (tmuxcc) to monitor agents in tmux panes
- One developer built a full TUI to index and search past coding agent sessions for resumability
- Teams use separate "cheap model" for simple tasks and "expensive model" for hard problems — manual cost optimization
- Developers copy-paste context summaries between sessions as a manual memory system
- Some teams use Aider's git-native approach (every edit = commit) as a workaround for session persistence
- Organizations build internal platforms on top of Railway/Fly.io to get project-level abstractions

### Segment Differences
- **Solo developers/small teams** (2-5 people): Most value parallelization and deployment simplification — they can't afford dedicated DevOps or to manually coordinate agents
- **Senior developers**: Experience more context-related pain (52% vs 41% for juniors) — they have higher standards and more complex codebases
- **Heavy AI users**: Report different frustrations than light users — managing AI-created technical debt replaces old productivity pain
- **Open-source maintainers**: Value model flexibility and transparency — locked-in platforms are a dealbreaker

### Sources Consulted
- Searches run: "AI coding agent user complaints pain points frustrations 2025 2026", "AI coding agent user problems frustrations site:reddit.com OR site:news.ycombinator.com", "AI coding agent session management memory context persistence problems"
- URLs fetched: Stack Overflow Developer Survey 2025 blog post, Hacker News discussion on agent control (item 46834002), Faros AI best coding agents 2026

### Gaps
- No quantitative data on how solo developers vs teams experience agent orchestration differently
- No studies on the specific pain of managing multiple AI agents simultaneously
- [UNVERIFIED] Whether developers would pay more for integrated agent + deployment vs separate tools
- Limited behavioral data (most evidence is stated preference from surveys and forums)
- No data on developer switching costs between coding agent ecosystems

**Confidence:** Medium
**Reasoning:** Strong quantitative data on individual frustrations from Tier 2 sources, but limited behavioral evidence on the specific combination of agent orchestration + deployment + memory proposed
