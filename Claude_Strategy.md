# 🚀 The Medina Strategy: Advanced Claude Code Best Practices

> **Author:** Based on Cole Medina's comprehensive Claude Code strategies
> **Purpose:** Advanced strategies and best practices for maximizing Claude Code effectiveness
> **Application:** Use these strategies to transform Claude Code from good to great

---

## 📋 Table of Contents
1. [Core Principles](#core-principles)
2. [Global Rules & System Configuration](#global-rules--system-configuration)
3. [Permission Management](#permission-management)
4. [Custom Slash Commands](#custom-slash-commands)
5. [MCP Server Integration](#mcp-server-integration)
6. [Context Engineering with PRP](#context-engineering-with-prp)
7. [Sub-Agent Architecture](#sub-agent-architecture)
8. [Claude Hooks & Automation](#claude-hooks--automation)
9. [GitHub CLI Integration](#github-cli-integration)
10. [YOLO Mode & Dev Containers](#yolo-mode--dev-containers)
11. [Parallel Agent Development](#parallel-agent-development)
12. [Optimization Strategies](#optimization-strategies)

---

## Core Principles

### The Medina Philosophy
"I feel like I can build anything" - This mindset drives the Medina Strategy. Claude Code is not just a coding assistant; it's a complete development team at your fingertips.

### Key Mindset Shifts
1. **Think in Workflows, Not Commands** - Build reusable agentic workflows via slash commands
2. **Delegate to Specialists** - Use sub-agents for specialized tasks
3. **Automate Everything** - Leverage hooks for deterministic control
4. **Parallelize When Possible** - Run multiple agents simultaneously for faster iteration
5. **Context is King** - Master context engineering for production-ready outputs

---

## Global Rules & System Configuration

### The claude.md File Hierarchy
```
~/.claude/CLAUDE.md          # Global rules (all projects)
/project/CLAUDE.md           # Project-specific rules
/project/frontend/claude.md  # Module-specific rules
```

### Best Practices for claude.md
1. **Keep It Sparse** - Reference external documents rather than embedding everything
2. **Team Patterns** - Store patterns/best practices in separate files, reference in claude.md
3. **Module-Specific Rules** - Claude intelligently reads module-specific claude.md files
4. **Version Control** - Track claude.md in Git for team consistency

### Power Keywords for Prompting
- **`IMPORTANT`** - Emphasizes critical instructions
- **`proactively`** - Encourages autonomous action
- **`ultra-think`** - Triggers deep reasoning (uses ~32,000 tokens)
- **`production-ready`** - Can cause over-engineering (use carefully)

### Anti-Patterns to Avoid
- Over-engineering for backwards compatibility
- Keeping old/deprecated code
- Creating unnecessary abstractions

---

## Permission Management

### Recommended Allow List
```json
{
  "permissions": {
    "allowed_commands": [
      "grep*", "ls*", "cd*", "pwd",
      "mkdir*", "python*", "node*", "npm*",
      "git status", "git diff", "git add*",
      "docker*", "cat*", "echo*"
    ]
  }
}
```

### Critical Safety Rules
1. **Never Allow `rm`** - Always require approval for file deletion
2. **Never Use `bash*`** - Too dangerous, be explicit about allowed commands
3. **Protect Sensitive Operations** - Keep git push, database migrations manual

### Configuration Method
```bash
# Option 1: Interactive
claude permissions

# Option 2: Direct configuration in .claude/settings.local.json
```

---

## Custom Slash Commands

### Command Structure
```markdown
<!-- .claude/commands/command-name.md -->
# Command Name

## Description
What this command does

## Instructions
1. Step-by-step process
2. Use $arguments for parameters
3. Reference other files with @filename

## Validation
- Check for success criteria
- Handle errors gracefully
```

### Power Commands to Implement

#### 1. **Primer Command** - Context Loading
```markdown
<!-- .claude/commands/primer.md -->
1. Run tree command to understand structure
2. Read CLAUDE.md and README.md
3. Use Serena MCP to semantically search codebase
4. Identify key patterns and dependencies
5. Prepare comprehensive context summary
```

#### 2. **Fix GitHub Issue** - Automated Issue Resolution
```markdown
<!-- .claude/commands/fix-github-issue.md -->
1. Use `gh issue view $arguments` to understand issue
2. Search codebase for relevant files
3. Implement fix following project patterns
4. Write and run tests
5. Create feature branch
6. Push changes and create PR
```

#### 3. **Generate PRP** - Product Requirements Prompt
```markdown
<!-- .claude/commands/generate-prp.md -->
1. Read initial requirements from $arguments
2. Research referenced documentation
3. Generate comprehensive PRP document
4. Include validation gates and success criteria
```

### Command Parameters
- Use `$arguments` placeholder for dynamic input
- Example: `/analyze-performance $arguments` where arguments = "database queries"

---

## MCP Server Integration

### Essential MCP Servers

#### 1. **Serena MCP** - Semantic Code Search (GAME CHANGER)
```bash
# Installation
uvx --from mcp-serena mcp-serena

# Add to Claude
claude mcp add serena

# Auto-permission in settings.local.json
"mcp_serena": "*"
```

**Why Serena is Critical:**
- Superior semantic understanding of codebase
- Better than native Claude file search
- Essential for large/existing codebases
- Prevents Claude from "losing its way"

#### 2. **GitHub MCP** - Repository Management
- Manage issues, PRs, releases
- Direct integration with GitHub API
- Automate entire Git workflows

#### 3. **Archon MCP** - Task & Knowledge Management
- Real-time task tracking
- Knowledge base integration
- UI for managing coding projects

### MCP Best Practices
1. Always add MCP permissions to settings.local.json
2. Reference MCP tools in slash commands
3. Use MCPs for external integrations (databases, APIs)

---

## Context Engineering with PRP

### The Three-Step PRP Process

#### Step 1: Define Initial Requirements
```markdown
<!-- prps/initial.md -->
## Feature Description
[What to build]

## Examples
- @examples/similar-feature.py
- @examples/pattern.js

## Documentation
- https://docs.example.com/api
- @docs/internal-api.md

## Constraints
- Must follow existing patterns
- Security considerations
- Performance requirements
```

#### Step 2: Generate PRP
```bash
/generate-prp prps/initial.md
```

#### Step 3: Execute PRP
```bash
# Clear context first for fresh start
/clear

# Execute with full context
/execute-prp prps/generated-prp.md
```

### PRP Success Factors
1. **Comprehensive Examples** - Include multiple working examples
2. **Clear Validation Gates** - Define success criteria
3. **Anti-Patterns** - Explicitly state what NOT to do
4. **Step-by-Step Tasks** - Break down into clear, atomic steps

---

## Sub-Agent Architecture

### Sub-Agent Structure
```markdown
<!-- .claude/agents/specialist.md -->
name: specialist-agent
description: When to use this agent (CRITICAL for auto-selection)
tools: [Edit, Read, Bash]
model: claude-3-5-sonnet (optional)

## System Prompt
You are a specialized agent for [specific task].
Your only job is to [focused responsibility].

## Success Criteria
- [Measurable outcome 1]
- [Measurable outcome 2]
```

### Recommended Sub-Agents

#### 1. **Validation Gates Agent**
- Runs tests until all pass
- Iterates on failures autonomously
- Reports comprehensive results

#### 2. **Security Scanner Agent**
- Checks for exposed secrets
- Validates input sanitization
- Reviews authentication/authorization

#### 3. **Documentation Agent**
- Updates docs after code changes
- Maintains API documentation
- Generates user guides

#### 4. **Performance Optimizer**
- Profiles code for bottlenecks
- Suggests optimizations
- Implements caching strategies

### Sub-Agent Best Practices
1. **Focused Responsibility** - Each agent does ONE thing well
2. **Clear Descriptions** - Enables automatic selection
3. **Limited Tools** - Only give necessary permissions
4. **Parallel Execution** - Launch multiple sub-agents simultaneously

---

## Claude Hooks & Automation

### Hook Types & Use Cases

#### 1. **Post-Tool-Use Hook** - Logging & Monitoring
```json
{
  "hooks": [{
    "type": "post_tool_use",
    "command": "bash .claude/hooks/log-edit.sh",
    "matcher": "Edit|Write"
  }]
}
```

#### 2. **Pre-Tool-Use Hook** - Validation
```json
{
  "hooks": [{
    "type": "pre_tool_use",
    "command": "python .claude/hooks/validate-changes.py",
    "matcher": "Edit"
  }]
}
```

#### 3. **Post-Sub-Agent Hook** - Results Processing
```json
{
  "hooks": [{
    "type": "post_sub_agent",
    "command": "bash .claude/hooks/process-results.sh"
  }]
}
```

### Powerful Hook Implementations
1. **Auto-formatting** - Run linters after edits
2. **Test Runner** - Run tests after code changes
3. **Git Auto-commit** - Checkpoint after successful changes
4. **Documentation Generation** - Update docs automatically
5. **Notification System** - Alert on important events

---

## GitHub CLI Integration

### Setup
```bash
# Install GitHub CLI
# macOS: brew install gh
# Windows: winget install GitHub.cli

# Authenticate
gh auth login

# Verify
gh repo list
```

### Automated Workflows

#### Issue-to-PR Pipeline
```bash
# 1. View issue
gh issue view 123

# 2. Create branch
git checkout -b fix/issue-123

# 3. Implement fix (via Claude)

# 4. Create PR
gh pr create --title "Fix: Issue #123" \
             --body "Closes #123" \
             --assignee @me
```

### Advanced GitHub Integrations
1. **Auto-link Issues** - Reference in commits: "fix: resolve #123"
2. **PR Templates** - Standardize PR descriptions
3. **Release Automation** - Tag and release via Claude
4. **Code Review** - Claude reviews PRs via gh api

---

## YOLO Mode & Dev Containers

### When to Use YOLO Mode
- Rapid prototyping
- Experimental features
- Learning/exploration
- Isolated environments

### Safe YOLO Setup
```dockerfile
# .devcontainer/Dockerfile
FROM anthropic/claude-code:latest

# Security boundaries
RUN apt-get update && apt-get install -y \
    firewall-tools \
    sandbox-utils

# Website allowlist
ENV ALLOWED_SITES="github.com,docs.python.org"
```

### Running YOLO Mode
```bash
# 1. Open in container (VS Code)
F1 → "Reopen in Container"

# 2. Launch Claude with skip permissions
claude --dangerously-skip-permissions

# 3. Work without interruptions
# (Container provides safety boundary)
```

---

## Parallel Agent Development

### Git Worktrees Strategy

#### Setup Parallel Development
```bash
# Prep command
/prep-parallel feature-name 3

# Creates:
# - trees/feature-1/
# - trees/feature-2/
# - trees/feature-3/
```

#### Execute in Parallel
```bash
# Execute command
/execute-parallel feature-name plans/feature.md 3

# Runs 3 Claude instances simultaneously
# Each implements the same feature differently
# Choose best implementation
```

### Parallel Development Patterns

#### 1. **Competitive Implementation**
- Same feature, multiple approaches
- Pick best implementation
- Faster iteration through variety

#### 2. **Divided Conquest**
- Different features in parallel
- Frontend + Backend + Tests
- Merge all successful branches

#### 3. **A/B Testing**
- Multiple UI implementations
- Performance variations
- Architecture experiments

### Merging Strategies
```bash
# Review all implementations
cd trees/feature-1 && npm test
cd trees/feature-2 && npm test
cd trees/feature-3 && npm test

# Merge chosen implementation
git checkout main
git merge feature/approach-2
git push origin main
```

---

## Optimization Strategies

### Token Usage Optimization
1. **Model Selection**
   - Planning: Claude Opus (best reasoning)
   - Execution: Claude Sonnet (balanced)
   - Simple tasks: Kimmy K2 (cost-effective)

2. **Context Management**
   - `/clear` after major milestones
   - Don't accumulate unnecessary context
   - Use focused prompts

3. **Ultra-Think Usage**
   - Reserve for complex architecture decisions
   - Not for routine coding tasks
   - ~32,000 tokens per use

### Performance Optimization
1. **Batch Operations** - Multiple file edits in one command
2. **Parallel Execution** - Use sub-agents for concurrent tasks
3. **Smart Caching** - Reuse PRP documents
4. **Incremental Development** - Small, focused changes

### Cost Management
1. **Track Usage** - Monitor token consumption
2. **Optimize Prompts** - Concise, clear instructions
3. **Reuse Patterns** - Slash commands over repeated prompts
4. **Strategic Model Use** - Right model for right task

---

## Implementation Checklist

### Initial Setup (Day 1)
- [ ] Create global claude.md
- [ ] Configure permissions in settings.local.json
- [ ] Install Serena MCP server
- [ ] Create primer slash command
- [ ] Set up basic hooks

### Advanced Setup (Week 1)
- [ ] Create specialized sub-agents
- [ ] Implement PRP framework
- [ ] Configure GitHub CLI integration
- [ ] Build custom slash commands library
- [ ] Set up parallel development workflow

### Mastery (Month 1)
- [ ] Optimize token usage patterns
- [ ] Build team-specific workflows
- [ ] Create comprehensive hook system
- [ ] Develop custom MCP servers
- [ ] Establish best practices documentation

---

## Quick Reference Card

### Essential Commands
```bash
# System
claude --version          # Check version
claude mcp list          # List MCP servers
claude permissions       # Configure permissions
/clear                   # Clear context
/init                    # Initialize project

# Custom Commands
/primer                  # Load context
/generate-prp <file>     # Generate PRP
/execute-prp <file>      # Execute PRP
/fix-github-issue <#>    # Fix and PR

# Parallel Development
/prep-parallel <name> <count>
/execute-parallel <name> <plan> <count>
```

### Power User Tips
1. **Always start with `/primer`** when opening existing projects
2. **Use Serena MCP** for better code understanding
3. **Clear context regularly** to prevent confusion
4. **Create sub-agents** for repeated specialized tasks
5. **Leverage hooks** for automation
6. **Think in workflows**, not individual commands

---

## Conclusion

The Medina Strategy transforms Claude Code from a simple AI assistant into a comprehensive development powerhouse. By implementing these strategies, you're not just coding faster—you're building a personalized, intelligent development environment that understands your patterns, automates your workflows, and scales with your ambitions.

Remember Cole Medina's mindset: "I feel like I can build anything." With these strategies, you can.

---

*"The things we can do with these tools and frameworks now is insane."* - Cole Medina

**Last Updated:** 2025
**Strategy Version:** 1.0
**Based on:** Cole Medina's Claude Code Best Practices