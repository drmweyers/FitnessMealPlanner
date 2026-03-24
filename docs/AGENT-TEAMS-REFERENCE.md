# Claude Code Agent Teams — Complete Reference
**Source:** Anthropic Official Documentation (code.claude.com/docs/en/agent-teams)
**Fetched:** 2026-03-23
**Purpose:** Authoritative reference for invoking agent teams correctly in this project

---

## IMPORTANT: Pre-Flight Checklist

Before invoking agent teams, verify:
1. Agent teams are **experimental** — enable via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment
2. Requires Claude Code v2.1.32+
3. One team per session — clean up before starting a new one
4. Teammates cannot spawn their own teams (no nesting)
5. Token costs scale linearly with teammate count — start with 3-5

---

## Core Tools

### TeamCreate
Creates a team and its shared task list.

```json
{
  "team_name": "my-project",
  "description": "Working on feature X"
}
```

Creates:
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

### TaskCreate
Creates tasks in the shared task list.

```json
{
  "subject": "Brief title in imperative form",
  "description": "Detailed description with context and acceptance criteria",
  "activeForm": "Present continuous for spinner (e.g., 'Fixing auth bug')"
}
```

### TaskUpdate
Updates task status, ownership, dependencies.

```json
{"taskId": "1", "status": "in_progress"}
{"taskId": "1", "status": "completed"}
{"taskId": "1", "owner": "teammate-name"}
{"taskId": "2", "addBlockedBy": ["1"]}
{"taskId": "1", "status": "deleted"}
```

Status workflow: `pending` → `in_progress` → `completed`

### TaskList
Lists all tasks. Returns id, subject, status, owner, blockedBy.

### TaskGet
Gets full task details by ID.

### TaskOutput
Gets output from a running/completed background task.

```json
{"task_id": "abc", "block": true, "timeout": 30000}
```

### TaskStop
Stops a running background task.

### SendMessage
Sends messages between teammates.

```json
// Direct message
{"to": "researcher", "message": "Start task #1", "summary": "Assign task"}

// Broadcast (use sparingly — costs scale with team size)
{"to": "*", "message": "Critical issue found", "summary": "Alert all"}

// Shutdown request
{"to": "teammate-name", "message": {"type": "shutdown_request", "reason": "Done"}}

// Shutdown response (approve)
{"to": "team-lead", "message": {"type": "shutdown_response", "request_id": "abc", "approve": true}}

// Plan approval
{"to": "teammate", "message": {"type": "plan_approval_response", "request_id": "abc", "approve": true}}
```

### TeamDelete
Removes team and task directories. FAILS if active members remain — shut them down first.

---

## Team Workflow (Step by Step)

1. **Create team** with `TeamCreate`
2. **Create tasks** with `TaskCreate` — set dependencies with `TaskUpdate`
3. **Spawn teammates** using `Agent` tool with `team_name` and `name` parameters
4. **Assign tasks** via `TaskUpdate` with `owner`
5. **Teammates work** — they check `TaskList`, claim tasks, mark completed
6. **Teammates go idle** between turns (this is NORMAL, not an error)
7. **Shutdown** via `SendMessage` with `{type: "shutdown_request"}`
8. **Cleanup** with `TeamDelete` after all teammates shut down

---

## Spawning Teammates

Use the `Agent` tool with these parameters:
- `team_name`: name of the team
- `name`: human-readable name for the teammate
- `subagent_type`: agent type (determines available tools)
  - `general-purpose`: full tool access (Read, Write, Edit, Bash, etc.)
  - `Explore`: read-only, fast (no Write/Edit)
  - `Plan`: read-only research
- `mode`: permission mode (`default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`)
- `model`: `sonnet`, `opus`, `haiku`
- `run_in_background`: `true` for concurrent execution
- `isolation`: `"worktree"` for isolated git worktree

---

## Teammate Behavior

### Idle State
- Teammates go idle after EVERY turn — this is normal
- Idle does NOT mean done or unavailable
- Send a message to wake an idle teammate
- Do NOT treat idle notifications as errors

### Communication
- Teammates MUST use `SendMessage` — plain text output is NOT visible to others
- Messages are delivered automatically (no polling needed)
- Peer DM summaries appear in idle notifications

### Task Claiming
- Teammates should check `TaskList` after completing each task
- Prefer tasks in ID order (lowest first)
- Claim with `TaskUpdate` setting `owner`
- File locking prevents race conditions

### Discovery
- Read `~/.claude/teams/{team-name}/config.json` for member list
- Members have: `name`, `agentId`, `agentType`
- Always reference teammates by NAME, not agentId

---

## Best Practices (from Anthropic docs)

### Give teammates enough context
Teammates don't inherit lead's conversation history. Include task-specific details in spawn prompt.

### Choose appropriate team size
- Start with 3-5 teammates
- 5-6 tasks per teammate is optimal
- Token costs scale linearly
- 3 focused teammates > 5 scattered ones

### Size tasks appropriately
- Too small: coordination overhead exceeds benefit
- Too large: work too long without check-ins
- Just right: self-contained units with clear deliverables

### Avoid file conflicts
Two teammates editing same file → overwrites. Each teammate should own different files.

### Monitor and steer
Check in on progress, redirect approaches, synthesize findings.

### Wait for teammates
If lead starts implementing instead of delegating, tell it to wait.

---

## When to Use Agent Teams vs Subagents

| | Subagents | Agent Teams |
|---|---|---|
| **Context** | Results return to caller | Fully independent |
| **Communication** | Report back only | Message each other |
| **Coordination** | Main agent manages | Shared task list |
| **Best for** | Focused tasks, result only | Complex collaborative work |
| **Token cost** | Lower | Higher |

**Use subagents when:** quick focused workers that report back
**Use agent teams when:** teammates need to share findings, challenge each other, coordinate

---

## Best Use Cases for Agent Teams
1. **Research and review**: investigate different aspects simultaneously
2. **New modules/features**: each teammate owns separate piece
3. **Debugging with competing hypotheses**: test theories in parallel
4. **Cross-layer coordination**: frontend + backend + tests

---

## Limitations (Critical)

- **No session resumption** with in-process teammates
- **Task status can lag** — teammates may not mark tasks completed
- **Shutdown can be slow** — teammates finish current tool call first
- **One team per session** — clean up before starting new
- **No nested teams** — teammates can't spawn teams
- **Lead is fixed** — can't transfer leadership
- **Permissions set at spawn** — all start with lead's mode

---

## Proven Pattern from This Project (Parallel Agent Teams)

```
Phase 0: PREP (sequential)
├── Commit any dirty files
├── Create worktrees if needed
└── Fix shared config (add .worktrees/ to ignores)

Phase 1: LAUNCH (parallel)
├── TeamCreate
├── TaskCreate for each work stream
├── Agent tool: spawn teammates with team_name, name, mode=bypassPermissions
├── model=sonnet for cost efficiency (opus for complex arch)
└── run_in_background=true

Phase 2: MONITOR
├── Check git log in each worktree every 5 min
├── At 10 min without commits: SendMessage nudge
├── At 20 min stalled: shutdown, commit work, spawn fresh
└── Merge completed streams immediately

Phase 3: CLEANUP
├── SendMessage shutdown_request to all
├── TeamDelete
└── Merge branches
```

---

## TeammateTool Operations (13 Total)

Beyond the basic tools, the TeammateTool provides these operations:

| # | Operation | Caller | Purpose |
|---|-----------|--------|---------|
| 1 | `spawnTeam` | Anyone | Create team (becomes leader) |
| 2 | `discoverTeams` | Anyone | List available teams |
| 3 | `requestJoin` | Non-member | Request membership |
| 4 | `approveJoin` | Leader | Accept join request |
| 5 | `rejectJoin` | Leader | Decline join request |
| 6 | `write` | Any member | Message one teammate |
| 7 | `broadcast` | Any member | Message ALL teammates |
| 8 | `requestShutdown` | Leader | Ask teammate to exit |
| 9 | `approveShutdown` | Teammate | Accept shutdown |
| 10 | `rejectShutdown` | Teammate | Decline shutdown |
| 11 | `approvePlan` | Leader | Approve teammate's plan |
| 12 | `rejectPlan` | Leader | Reject plan with feedback |
| 13 | `cleanup` | Leader | Remove team resources |

### Graceful Shutdown Sequence
1. `SendMessage` shutdown_request to all teammates
2. Wait for shutdown approvals
3. Verify no active members in config.json
4. `TeamDelete` to clean up

### Environment Variables for Teammates
Teammates automatically receive: `CLAUDE_CODE_TEAM_NAME`, `CLAUDE_CODE_AGENT_ID`, `CLAUDE_CODE_AGENT_NAME`, `CLAUDE_CODE_AGENT_TYPE`, `CLAUDE_CODE_AGENT_COLOR`, `CLAUDE_CODE_PLAN_MODE_REQUIRED`

### Tool Availability (Counterintuitive)

| Tool | Standalone Subagent | Teammate | Skill-Forked |
|------|:---:|:---:|:---:|
| TeamCreate | YES | NO | YES |
| TeamDelete | YES | NO | YES |
| SendMessage | YES | YES | YES |

### Known Issues
- GitHub #23816: TaskCreate/TaskList/TaskUpdate were missing at runtime — **Resolved Feb 2026**
- GitHub #32723: TeamCreate/TeamDelete available to standalone subagents (undocumented)
- GitHub #28048: Agent Teams not available in VS Code extension
- Windows: Long prompts may fail (8191 char command line limit)
- 5-minute heartbeat timeout for crashed teammates

### Debugging Commands
```bash
cat ~/.claude/teams/{team}/config.json | jq '.members[]'
cat ~/.claude/tasks/{team}/*.json | jq '{id, subject, status, owner}'
ls ~/.claude/teams/
```

---

## Quick Reference Card

| Action | Tool | Key Parameter |
|--------|------|---------------|
| Create team | `TeamCreate` | `team_name` |
| Add task | `TaskCreate` | `subject`, `description` |
| Assign task | `TaskUpdate` | `taskId`, `owner` |
| Start task | `TaskUpdate` | `taskId`, `status: "in_progress"` |
| Complete task | `TaskUpdate` | `taskId`, `status: "completed"` |
| Set dependency | `TaskUpdate` | `taskId`, `addBlockedBy: ["id"]` |
| Spawn teammate | `Agent` | `team_name`, `name`, `subagent_type` |
| Message teammate | `SendMessage` | `to`, `message`, `summary` |
| Broadcast | `SendMessage` | `to: "*"` |
| Shutdown teammate | `SendMessage` | `message: {type: "shutdown_request"}` |
| Delete team | `TeamDelete` | (no params) |
| List tasks | `TaskList` | (no params) |
| Get task detail | `TaskGet` | `taskId` |
