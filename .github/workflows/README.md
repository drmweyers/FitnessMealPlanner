# GitHub Actions Workflows

This directory contains automated workflows for the FitnessMealPlanner project.

## 🏗️ Architecture: DigitalOcean Auto-Deploy + GitHub Actions Testing

**Current Setup (Option 1):**
- ✅ **DigitalOcean App Platform** handles production deployments automatically on push to `main`
- ✅ **GitHub Actions** runs tests for visibility (does NOT block deploys)
- ✅ **Staging environments** for PR testing before merge

> **Note:** This is an "informational only" CI setup. Tests run for visibility but don't gate deployments. To add deployment gates, see "Option 2" section below.

---

## 📋 Available Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** (`ci.yml`) | Push/PR to `main`, `qa-ready` | Test, type check, security scan (informational) |
| **Staging** (`staging.yml`) | PR to `main` | Preview deployment + E2E tests |
| **Nightly** (`nightly.yml`) | Daily at 2 AM UTC | Full tests, audits, health checks |
| **Lint** (`lint.yml`) | Push/PR to `main`, `qa-ready` | ESLint checks |
| **Redis CI/CD** (`redis-ci-cd.yml`) | Redis file changes | Redis-specific pipeline |
| ~~CD~~ (`cd.yml.disabled`) | — | Disabled - DO handles deploys |

---

## 🚀 How It Works

### Current Flow (Auto-Deploy Enabled)

```
Developer pushes to branch
         ↓
Create Pull Request
         ↓
┌──────────────────────┐
│  CI runs tests       │ ← Informational only
│  - Type check        │
│  - Lint              │
│  - Unit tests        │
│  - Security audit    │
└──────────────────────┘
         ↓
┌──────────────────────┐
│  Staging Deploy      │ ← PR preview environment
│  - Build image       │
│  - Deploy to DO      │
│  - Post URL to PR    │
└──────────────────────┘
         ↓
Code Review
         ↓
Merge to main
         ↓
┌──────────────────────┐
│  DigitalOcean        │ ← AUTO-DEPLOYS (independent of CI)
│  - Pulls code        │
│  - Builds image      │
│  - Deploys to prod   │
└──────────────────────┘
         ↓
Production Live
```

**Key Point:** CI runs for visibility but does NOT block DigitalOcean's auto-deploy.

---

## 📖 Workflow Details

### 1. CI - Test & Code Quality (`ci.yml`)

**Status:** Informational only (does not block deploys)

**Triggers:**
- Every push to `main` or `qa-ready`
- Every pull request

**Jobs:**
1. **Code Quality** - TypeScript type check + ESLint
2. **Unit Tests** - Fast unit tests with coverage
3. **Integration Tests** - Tests with PostgreSQL
4. **Docker Build** - Verifies production image builds
5. **Security Audit** - npm audit + Trivy scan

**Purpose:** Provides visibility into code quality. Check results before merging, but know that DigitalOcean will deploy regardless.

---

### 2. Staging Preview (`staging.yml`)

**Triggers:**
- Pull requests to `main`
- PR closed (cleanup)

**What it does:**
- Builds and deploys PR to staging environment
- Runs E2E tests against staging
- Posts staging URL as PR comment
- Cleans up when PR is closed

**Staging URL:** `https://staging-pr-{number}.evofitmeals.com`

**Required Secrets:**
- `DIGITALOCEAN_ACCESS_TOKEN`
- `DO_STAGING_APP_ID`

---

### 3. Lint Code (`lint.yml`)

**Triggers:**
- Every push/PR to `main`, `qa-ready`

**What it does:**
- Runs ESLint on client code
- Runs ESLint on server code
- Comments on PRs with results

---

### 4. Nightly Tests (`nightly.yml`)

**Triggers:**
- Daily at 2:00 AM UTC
- Manual workflow dispatch

**What it does:**
- Full test suite with coverage
- Dependency security audit
- Outdated package check
- Production health check

---

### 5. Redis CI/CD (`redis-ci-cd.yml`)

**Triggers:**
- Changes to `redis/**` directory

See Redis-specific documentation.

---

## 🔐 Required Secrets

Configure in **Settings > Secrets and variables > Actions**:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `DIGITALOCEAN_ACCESS_TOKEN` | DigitalOcean API token | Staging deploys, Redis CD |
| `DO_STAGING_APP_ID` | Staging app ID | Staging preview environments |
| `REDIS_PASSWORD` | Redis auth password | Redis CD |

---

## 🛡️ Option 2: Add Deployment Gates (Future)

If you want CI to **block** broken code from deploying:

### Step 1: Disable DigitalOcean Auto-Deploy
1. Go to [DigitalOcean App Platform Dashboard](https://cloud.digitalocean.com/apps)
2. Select your app → Settings → GitHub
3. **Turn OFF "Deploy on Push"**

### Step 2: Enable GitHub Actions CD
```bash
mv .github/workflows/cd.yml.disabled .github/workflows/cd.yml
```

### Step 3: Add Branch Protection
1. Go to **Settings > Branches**
2. Add rule for `main`:
   - ✅ Require PR before merging
   - ✅ Require status checks to pass
   - ✅ Select checks: `code-quality`, `unit-tests`, `docker-build`

### Result
- CI must pass before merging
- GitHub Actions controls deployments
- Broken code cannot reach production

---

## 🧪 Local Development

Run the same checks locally before pushing:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test:unit

# Integration tests (requires PostgreSQL)
npm run test:integration

# Docker build test
docker build --target prod -t fitnessmealplanner:test .
```

---

## 📊 Status Badges

Add to your README.md:

```markdown
[![CI](https://github.com/drmweyers/FitnessMealPlanner/actions/workflows/ci.yml/badge.svg)](https://github.com/drmweyers/FitnessMealPlanner/actions/workflows/ci.yml)
[![Staging](https://github.com/drmweyers/FitnessMealPlanner/actions/workflows/staging.yml/badge.svg)](https://github.com/drmweyers/FitnessMealPlanner/actions/workflows/staging.yml)
[![Nightly](https://github.com/drmweyers/FitnessMealPlanner/actions/workflows/nightly.yml/badge.svg)](https://github.com/drmweyers/FitnessMealPlanner/actions/workflows/nightly.yml)
```

---

## 🚨 Troubleshooting

### Tests fail but code still deployed
**This is expected** with Option 1. CI is informational only.

To fix: Check test results and fix issues before merging, even though deploy happens regardless.

### Staging deploy fails
Check:
1. `DIGITALOCEAN_ACCESS_TOKEN` is set correctly
2. `DO_STAGING_APP_ID` is set (create a separate staging app in DO if needed)
3. Staging app exists in DigitalOcean

### Want to prevent broken deploys
See **Option 2** section above to add deployment gates.

---

**Last Updated:** March 2026
