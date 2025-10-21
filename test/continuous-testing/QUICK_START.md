# 🚀 Continuous Testing - Quick Start Guide

**Goal**: Get continuous meal plan testing running in under 5 minutes

---

## Step 1: Verify Prerequisites (30 seconds)

```bash
# Check Node.js is installed
node --version  # Should be v18 or higher

# Check TypeScript executor is available
npx tsx --version

# Verify you're in the project root
pwd  # Should show .../FitnessMealPlanner
```

---

## Step 2: Start the Continuous Testing Agent (1 minute)

### Option A: Basic Continuous Testing (Recommended for first run)

```bash
npm run test:continuous
```

This will:
- ✅ Run meal plan tests every 5 minutes
- ✅ Display results in console
- ✅ Save reports to `test-results/continuous-testing/`
- ❌ NOT auto-fix issues (just report them)

### Option B: With Auto-Fix Enabled (Recommended after first successful run)

```bash
npm run test:continuous:auto-fix
```

This will:
- ✅ Everything from Option A, PLUS:
- ✅ Automatically fix detected issues
- ✅ Verify fixes work
- ✅ Re-run tests after fixes

---

## Step 3: Watch It Work (2 minutes)

You should see output like this:

```
🤖 Claude Subagent: Continuous Meal Plan Testing
============================================================
Configuration:
  • Interval: 5 minutes
  • Categories: unit, integration, e2e
  • Auto-fix: ❌ Disabled
  • Focus: Meal Plan Tests Only
============================================================

============================================================
🔄 Test Cycle #1 Started
   1/12/2025, 2:30:45 PM
============================================================

────────────────────────────────────────────────────────────
📊 Running UNIT tests
────────────────────────────────────────────────────────────
   Command: npx vitest run test/unit/services/intelligentMealPlanGenerator.test.ts ...

📈 UNIT Test Results:
   ✅ Passed:        23
   ❌ Failed:         2
   ⏭️  Skipped:       8
   📊 Total:         33
   ⏱️  Duration:     12.34s
   🎯 Success Rate: 69.7%
```

---

## Step 4: Check the Reports (1 minute)

```bash
# View latest report
cat test-results/continuous-testing/latest.json | jq .

# Or just the summary
cat test-results/continuous-testing/latest.json | jq '.summary'
```

Example output:
```json
{
  "totalTests": 137,
  "passed": 125,
  "failed": 8,
  "skipped": 4,
  "successRate": "91.2"
}
```

---

## Step 5: Stop When Done (5 seconds)

Press `Ctrl+C` to stop the agent.

---

## ✅ You're Done!

**Next Steps:**
1. Let it run for a few cycles to establish baseline
2. Enable auto-fix: `npm run test:continuous:auto-fix`
3. Review reports to track improvements
4. Celebrate as test success rate improves! 🎉

---

## 🎯 Common Commands Cheat Sheet

```bash
# Start with defaults (5-min interval, no auto-fix)
npm run test:continuous

# Start with auto-fix enabled
npm run test:continuous:auto-fix

# Change interval to 10 minutes
npm run test:continuous 10

# Run only unit tests continuously
npm run test:continuous:unit

# Run only E2E tests continuously
npm run test:continuous:e2e

# Run all tests (not just meal plan)
npm run test:continuous:all

# View latest report summary
cat test-results/continuous-testing/latest.json | jq '.summary'

# Stop the agent
# Press Ctrl+C
```

---

## ❓ Troubleshooting

### Problem: Agent won't start

```bash
# Install dependencies
npm install

# Try running tests manually first
npm run test:unit
```

### Problem: Tests are failing

**Expected!** The agent is designed to detect failures. Let it run a few cycles and:
- Review the reports
- Enable auto-fix to let it fix issues automatically
- Or fix issues manually based on the failure reports

### Problem: No tests running

Check that test files exist and aren't skipped:

```bash
# List meal plan test files
ls test/unit/services/*meal*plan*.test.ts
ls test/integration/*meal*plan*.test.ts
ls test/e2e/*meal*plan*.spec.ts
```

---

## 📚 Full Documentation

For complete documentation, see:
- `README.md` - Full user guide
- `CLAUDE_SUBAGENT_SPEC.md` - Technical specification

---

**Status**: ✅ Ready to use!

Start now:
```bash
npm run test:continuous
```
