# Integration Documentation Manifest

**Last Updated:** 2025-01-23
**Governance Version:** 1.0

This manifest tracks all integration documentation and sync status across repositories.

---

## Documentation Inventory

| Integration | Primary Repo | Last Updated | Sync Status | Version |
|------------|--------------|--------------|-------------|---------|
| n8n-fitnessmealplanner | N8N_Automation | 2025-01-23 | ⚠️ Initial Setup | 2025-01-23 |

### Sync Status Legend
- ✅ **Synced** - Documentation identical in both repos
- ⚠️ **Pending Sync** - Update required in secondary repo
- ❌ **Out of Sync** - Documentation differs (>7 days since primary update)
- 🚧 **In Progress** - Sync PR open in secondary repo
- 🆕 **Initial Setup** - First-time documentation creation

---

## File Inventory

### n8n-fitnessmealplanner
**Primary Repository:** N8N_Automation
**Last Updated:** 2025-01-23

- [x] README.md (2025-01-23) - Quick start & overview
- [ ] ARCHITECTURE.md (Pending) - System architecture & data flow
- [ ] WEBHOOK_SPECIFICATION.md (Pending) - Webhook contracts & endpoints
- [ ] IMPLEMENTATION_STATUS.md (Pending) - Current implementation state
- [ ] TEST_RESULTS.md (Pending) - Test reports & validation
- [ ] DEPLOYMENT_GUIDE.md (Pending) - Deployment procedures
- [ ] TROUBLESHOOTING.md (Pending) - Common issues & solutions
- [ ] GOVERNANCE.md (Pending) - Documentation governance process

**Workflows Documentation:**
- [ ] workflows/lead-magnet-delivery.md (Pending)
- [ ] workflows/7-day-nurture-sequence.md (Pending)
- [ ] workflows/long-term-nurture.md (Pending)
- [ ] workflows/welcome-onboarding.md (Pending)
- [ ] workflows/aha-moment-celebration.md (Pending)

**API Documentation:**
- [ ] api/endpoints.md (Pending)
- [ ] api/payload-schemas.md (Pending)

**Changelog:**
- [ ] changelog/CHANGELOG.md (Pending)

**Pending Changes:**
- 🚧 Initial documentation migration in progress
- 🚧 Sync to FitnessMealPlanner pending completion

---

## Sync History

| Date | Integration | Action | Primary Repo Commit | Secondary Repo PR |
|------|------------|--------|-------------------|------------------|
| 2025-01-23 | n8n-fitnessmealplanner | Initial Setup | Pending | Pending |

---

## Maintenance Schedule

- **Weekly Check:** Review sync status, create issues for pending syncs
- **Monthly Review:** Audit documentation accuracy against implementation
- **Quarterly Audit:** Full cross-repository consistency check

---

## Governance Process

**Source of Truth:** N8N_Automation (for n8n-fitnessmealplanner integration)

**Sync Strategy:** Git subtree
- **Command:** `npm run docs:sync n8n-fitnessmealplanner` (in FitnessMealPlanner)
- **Frequency:** After every primary repo documentation update
- **Maximum Lag:** 48 hours from primary repo update

**Ownership:**
- **Primary Owner:** N8N_Automation team (marketing automation logic)
- **Secondary Maintainer:** FitnessMealPlanner team (API integration)
- **Integration Owner:** Backend Lead (cross-repo coordination)

**See:** `docs/integrations/n8n-fitnessmealplanner/GOVERNANCE.md` for full governance process

---

## Current Status

**Phase:** Initial Setup (Week 1)

### Completed:
- [x] Folder structure created in both repos
- [x] MANIFEST.md created
- [x] README.md created in N8N_Automation

### In Progress:
- [ ] Migrating existing documentation to new structure
- [ ] Creating core documentation files
- [ ] Setting up sync scripts

### Pending:
- [ ] First sync to FitnessMealPlanner
- [ ] Verification scripts setup
- [ ] CI/CD integration
- [ ] Team training

---

## Next Actions

1. **Complete documentation migration** (N8N_Automation)
   - Migrate INTEGRATION_COMPLETE.md → IMPLEMENTATION_STATUS.md
   - Migrate N8N_WEBHOOK_INTEGRATION_COMPLETE.md → WEBHOOK_SPECIFICATION.md
   - Migrate TEST_RESULTS_SUMMARY.md → TEST_RESULTS.md
   - Migrate N8N_ARCHITECTURE_RESEARCH.md → ARCHITECTURE.md
   - Create DEPLOYMENT_GUIDE.md (new)
   - Create TROUBLESHOOTING.md (new)

2. **Set up sync tooling**
   - Create `scripts/sync-integration-docs.js` in both repos
   - Add npm script: `"docs:sync": "node scripts/sync-integration-docs.js"`
   - Test sync from N8N_Automation → FitnessMealPlanner

3. **Initial sync**
   - Run first git subtree sync to FitnessMealPlanner
   - Verify MANIFEST.md identical in both repos
   - Update sync status to ✅ Synced

4. **Team rollout**
   - Share governance process with both teams
   - Train on commit message format
   - Demonstrate sync script usage

---

**Process Version:** 1.0
**Last Review:** 2025-01-23
**Next Review:** 2025-04-23
