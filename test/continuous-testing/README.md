# 🤖 Continuous Meal Plan Testing Agent

A Claude-powered autonomous testing agent that continuously monitors and tests the Meal Plan Generator system without requiring external API calls.

---

## 🚀 Quick Start

### Start Continuous Testing (Default: 5-minute intervals)

```bash
npm run test:continuous
```

### Start with Auto-Fix Enabled

```bash
npm run test:continuous:auto-fix
```

### Custom Interval (e.g., 10 minutes)

```bash
npm run test:continuous 10
```

### Test Specific Categories Only

```bash
# Unit tests only
npm run test:continuous:unit

# Integration tests only
npm run test:continuous:integration

# E2E tests only
npm run test:continuous:e2e

# All tests (not just meal plan)
npm run test:continuous:all
```

---

## 📊 What It Does

The continuous testing agent:

1. **Runs Tests Continuously**: Executes meal plan tests at regular intervals (default: 5 minutes)
2. **Detects Issues**: Automatically identifies failing tests and categorizes failures
3. **Reports Results**: Generates detailed JSON reports saved to `test-results/continuous-testing/`
4. **Auto-Fixes** (optional): Integrates with the Autonomous Bug Fixer to automatically fix detected issues
5. **Tracks History**: Maintains a history of test runs for trend analysis

---

## 🎯 Test Coverage

### Unit Tests (55 tests planned)
- `intelligentMealPlanGenerator.test.ts` - AI-powered meal plan generation
- `naturalLanguageMealPlan.test.ts` - Natural language parsing
- `mealPlanGenerator.test.ts` - Basic generation logic
- Nutritional optimization
- Recipe selection algorithms

### Integration Tests (38 tests planned)
- Trainer creates meal plan workflow
- Meal plan assignment to customers
- Customer views meal plan
- PDF export functionality
- API endpoint testing

### E2E Tests (44 tests planned)
- Complete meal plan generation flow
- Assignment and sharing workflows
- Customer viewing experience
- Visual regression testing
- Error state handling

---

## 📈 Output & Reports

### Console Output

The agent provides real-time feedback in the console:

```
🤖 Claude Subagent: Continuous Meal Plan Testing
============================================================
Configuration:
  • Interval: 5 minutes
  • Categories: unit, integration, e2e
  • Auto-fix: ✅ Enabled
  • Focus: Meal Plan Tests Only
============================================================

============================================================
🔄 Test Cycle #1 Started
   1/12/2025, 2:30:45 PM
============================================================

────────────────────────────────────────────────────────────
📊 Running UNIT tests
────────────────────────────────────────────────────────────

📈 UNIT Test Results:
   ✅ Passed:        23
   ❌ Failed:         2
   ⏭️  Skipped:       8
   📊 Total:         33
   ⏱️  Duration:     12.34s
   🎯 Success Rate: 69.7%

   ⚠️  Failures (showing up to 3):
   1. should parse natural language meal plan request
      📁 test/unit/services/naturalLanguageMealPlan.test.ts
      💥 Expected: 2500, Received: undefined

...

============================================================
📊 Cycle #1 Summary
============================================================
Total Tests:    137
✅ Passed:      125
❌ Failed:       8
⏭️  Skipped:     4
📈 Success Rate: 91.2%
⏱️  Duration:    45.67s
📄 Report:       test-results/continuous-testing/cycle-1-1234567890.json
============================================================

⏰ Next test cycle in 5 minutes...
   Current time: 2:35:12 PM
   Next run: 2:40:12 PM
```

### JSON Reports

Detailed reports saved to `test-results/continuous-testing/`:

**File Structure:**
```
test-results/continuous-testing/
├── latest.json                      # Always points to most recent run
├── cycle-1-1234567890.json         # Individual cycle reports
├── cycle-2-1234567901.json
└── ...
```

**Report Format:**
```json
{
  "cycleNumber": 1,
  "timestamp": "2025-01-12T14:30:45.123Z",
  "cycleDuration": 45670,
  "summary": {
    "totalTests": 137,
    "passed": 125,
    "failed": 8,
    "skipped": 4,
    "successRate": "91.2"
  },
  "testRuns": [
    {
      "timestamp": "2025-01-12T14:30:45.456Z",
      "category": "unit",
      "passed": 23,
      "failed": 2,
      "skipped": 8,
      "duration": 12340,
      "failures": [
        {
          "testName": "should parse natural language meal plan request",
          "testFile": "test/unit/services/naturalLanguageMealPlan.test.ts",
          "error": "Expected: 2500, Received: undefined",
          "stack": "..."
        }
      ]
    }
  ],
  "history": [ /* last 50 test runs */ ]
}
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# OpenAI API Key (required for auto-fix)
OPENAI_API_KEY=sk-...

# Auto-fix configuration
AUTO_DEPLOY_LEVEL1=true
AUTO_DEPLOY_LEVEL2=false
MAX_FIXES_PER_RUN=10
```

### Command-Line Arguments

```bash
# Interval in minutes (default: 5)
npm run test:continuous 10

# Enable auto-fix
npm run test:continuous -- --auto-fix

# Run only specific test category
npm run test:continuous -- --unit-only
npm run test:continuous -- --integration-only
npm run test:continuous -- --e2e-only

# Run all tests (not just meal plan)
npm run test:continuous -- --all-tests

# Combine options
npm run test:continuous 15 --auto-fix --unit-only
```

---

## 🛑 Stopping the Agent

Press `Ctrl+C` to gracefully shut down the agent.

The agent will:
1. Complete the current test run
2. Save final reports
3. Display summary statistics
4. Exit cleanly

---

## 🔗 Integration with Autonomous Bug Fixer

When `--auto-fix` is enabled, the agent automatically:

1. **Detects failures** in test runs
2. **Sends failures** to the Autonomous Bug Fixer
3. **Waits for fixes** to be implemented
4. **Re-runs tests** to verify fixes worked
5. **Continues monitoring** for new issues

### Fix Levels

The Autonomous Bug Fixer classifies issues into 4 levels:

- **Level 1** (Auto-fix, no approval): Selector updates, import fixes, type errors
- **Level 2** (Auto-fix after verification): UI bugs, API fixes, performance
- **Level 3** (Requires approval): Auth logic, business logic, schema changes
- **Level 4** (Manual only): Architecture changes, complex integrations

---

## 📊 Viewing Reports

### View Latest Report

```bash
cat test-results/continuous-testing/latest.json | jq .
```

### View Summary Only

```bash
cat test-results/continuous-testing/latest.json | jq '.summary'
```

### View Recent Failures

```bash
cat test-results/continuous-testing/latest.json | jq '.testRuns[].failures[]'
```

### View History

```bash
cat test-results/continuous-testing/latest.json | jq '.history[-10:]'
```

---

## 🎯 Success Metrics

**Target Metrics:**
- ✅ **Test Coverage**: 95%+ for meal plan services
- ✅ **Success Rate**: 98%+ tests passing
- ✅ **Auto-Fix Rate**: 70%+ of failures fixed automatically
- ✅ **Detection Time**: <5 minutes to detect new failures
- ✅ **Fix Time**: <10 minutes from detection to verified fix

**Track Your Progress:**
The agent displays metrics after each cycle showing your current success rate and trends over time.

---

## 🐛 Troubleshooting

### Agent Won't Start

**Problem**: `Error: Cannot find module 'tsx'`

**Solution**:
```bash
npm install -D tsx
```

### Tests Not Running

**Problem**: No tests found or tests skip

**Solution**: Check test files exist and remove `.skip` from test descriptions:
```typescript
// Before (skipped)
describe.skip('Natural Language Meal Plan Parser', () => {

// After (active)
describe('Natural Language Meal Plan Parser', () => {
```

### OpenAI Errors (Auto-Fix)

**Problem**: `Error: OpenAI API key is required`

**Solution**: Set your OpenAI API key:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

### Port Conflicts

**Problem**: Server not starting due to port in use

**Solution**:
```bash
npm run cleanup-port
npm run test:continuous
```

---

## 📚 Documentation

- **Specification**: `CLAUDE_SUBAGENT_SPEC.md` - Complete architecture and design
- **Autonomous Fixer**: `test/autonomous-fix/README.md` - Bug fixer documentation
- **Master Testing Guide**: `INTELLIGENT_PLAYWRIGHT_TESTING_SYSTEM_PROMPT.md` - Complete testing framework

---

## 🤝 Contributing

### Adding New Tests

1. Create test file in appropriate directory:
   - `test/unit/services/` for unit tests
   - `test/integration/` for integration tests
   - `test/e2e/` for E2E tests

2. Follow existing patterns and naming conventions

3. Tests will automatically be picked up by the continuous agent

### Modifying Test Categories

Edit `continuous-test-agent.ts` and update the `getTestCommand()` method to include/exclude test files.

---

## 🆘 Support

**Issues or questions?**
- Check the [troubleshooting section](#-troubleshooting)
- Review the specification document
- Open an issue on GitHub

---

**Status**: ✅ **READY TO USE**

Start continuous testing now:
```bash
npm run test:continuous:auto-fix
```

Let the agent find and fix bugs while you focus on building features! 🚀
