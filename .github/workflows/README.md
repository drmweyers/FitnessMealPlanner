# GitHub Actions Workflows

This directory contains automated workflows for the FitnessMealPlanner project.

## 📋 Available Workflows

### 1. **Lint Code** (`lint.yml`)

**Triggers:**
- Every push to `main`, `qa-ready`, or `qa-ready-clean` branches
- Every pull request to these branches

**What it does:**
- ✅ Runs ESLint on client code (production frontend)
- ✅ Runs ESLint on server code
- ✅ Generates a summary report
- ✅ Comments on pull requests with detailed results
- ❌ **Fails the build** if client code has errors (production must be error-free)
- ⚠️ Warns about server errors but doesn't fail the build

**Status:**
- Client errors will **block merging** (required check)
- Server errors are **informational only**

### 2. **Auto-fix Lint Issues** (`lint-autofix.yml`)

**Triggers:**
- Manual trigger (workflow_dispatch)
- Automatic on push to `feature/**`, `fix/**`, `hotfix/**` branches

**What it does:**
- ✅ Runs ESLint with `--fix` flag
- ✅ Automatically commits fixable issues
- ✅ Pushes fixes back to the branch
- ✅ Adds a comment to notify about auto-fixes
- ⏭️ Skips if commit message contains `[skip-lint]`

## 🚀 How to Use

### For Local Development

Run linting locally before pushing:

```bash
# Check all code
npm run lint

# Check only client (production)
npm run lint:client

# Check only server
npm run lint:server

# Auto-fix what can be fixed
npm run lint:fix
```

## 📊 Status Badge

Add to your README.md:

```markdown
[![Lint](https://github.com/YOUR_USERNAME/FitnessMealPlanner/workflows/Lint%20Code/badge.svg)](https://github.com/YOUR_USERNAME/FitnessMealPlanner/actions/workflows/lint.yml)
```

---

**Last Updated:** January 2025
