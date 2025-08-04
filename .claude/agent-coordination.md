# Agent Coordination Instructions - Performance Optimization

## 🤖 Active Agents

### Frontend GUI Agent
**Focus**: React performance, bundle optimization, UI responsiveness
**Current Task**: Analyzing component re-renders and implementing optimizations
**Tools**: Read, Write, Edit, MultiEdit, Bash (npm commands)

### Backend API Developer  
**Focus**: Database queries, API response times, caching
**Current Task**: Profiling database queries and adding indexes
**Tools**: Read, Write, Edit, MultiEdit, Bash (database operations)

### Full Stack Developer
**Focus**: End-to-end optimization, data flow, state management
**Current Task**: Implementing API response caching and pagination
**Tools**: Read, Write, Edit, MultiEdit, Bash

### DevOps Engineer
**Focus**: Docker optimization, production configuration, monitoring
**Current Task**: Optimizing Docker builds and setting up performance monitoring
**Tools**: Read, Edit, Bash (Docker commands)

### QA Testing Agent
**Focus**: Performance testing, load testing, metrics validation
**Current Task**: Setting up performance test suite
**Tools**: Read, Write, Edit, Bash (test commands)

## 📋 Coordination Rules

1. **Check Before Starting**: Always read `performance-optimization-tasks.md` 
2. **Claim Your Task**: Mark task as `[IN PROGRESS - Agent Name]` before starting
3. **Commit Frequently**: Make atomic commits with descriptive messages
4. **Update Status**: Mark tasks as `[DONE]` immediately upon completion
5. **Communicate Issues**: Add comments in the task file if blocked
6. **Test Your Changes**: Ensure all tests pass before marking done

## 🔄 Workflow

1. Read current task status
2. Pick unclaimed task from your section
3. Implement optimization
4. Test thoroughly
5. Commit with clear message
6. Update task status
7. Move to next task

## 📊 Performance Targets

- **API Response**: < 200ms (95th percentile)
- **Page Load**: < 2 seconds
- **Bundle Size**: < 500KB initial
- **Database Queries**: < 50ms
- **Memory Usage**: < 100MB baseline

## 🚨 Escalation

If you encounter issues:
1. Document in task file
2. Try alternative approach
3. Mark as `[BLOCKED - reason]`
4. CTO will coordinate resolution

## 💬 Inter-Agent Communication

Use task file comments:
```
### Comment @AgentName
Your message here
```

---
*Coordination started: ${new Date().toISOString()}*