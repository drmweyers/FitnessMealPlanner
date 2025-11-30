# Integration Documentation Governance Process

**Version:** 1.0
**Last Updated:** 2025-01-23
**Applies To:** n8n-fitnessmealplanner integration

---

## Quick Reference

**Primary Repository:** N8N_Automation (source of truth)
**Secondary Repository:** FitnessMealPlanner (syncs from primary)
**Sync Method:** Git subtree
**Sync Frequency:** Within 48 hours of primary repo update

---

## Update Process

### When to Update Documentation

**MUST update when:**
- Webhook payload structure changes
- New/removed API endpoints
- Environment variable requirements change
- Workflow logic modified
- Email template structure changed

**SHOULD update when:**
- New troubleshooting tips discovered
- Performance optimization notes added
- Code examples added for clarity

### How to Update (Primary Repo - N8N_Automation)

```bash
# 1. Make changes in N8N_Automation
cd C:\Users\drmwe\Claude\N8N_Automation
git checkout -b docs/update-n8n-integration

# 2. Edit documentation files
# (edit files in docs/integrations/n8n-fitnessmealplanner/)

# 3. Update MANIFEST.md
vim docs/integrations/MANIFEST.md
# - Update "Last Updated" date
# - Set sync status to "⚠️ Pending Sync"

# 4. Commit with standardized message
git add docs/integrations/
git commit -m "docs(integration): Update n8n webhook specification

- Added new /api/webhooks/subscription-updated endpoint
- Updated payload schema with tier information

SYNC REQUIRED: FitnessMealPlanner
Integration: n8n-fitnessmealplanner
Version: 2025-01-23
"

# 5. Push and create PR
git push origin docs/update-n8n-integration
```

### How to Sync (Secondary Repo - FitnessMealPlanner)

```bash
# 1. After primary repo PR is merged, sync to FitnessMealPlanner
cd C:\Users\drmwe\Claude\FitnessMealPlanner
git checkout -b docs/sync-n8n-integration-2025-01-23

# 2. Run sync script (once created)
npm run docs:sync n8n-fitnessmealplanner

# OR manual sync using git subtree:
git subtree pull --prefix=docs/integrations/n8n-fitnessmealplanner \
  ../N8N_Automation docs/integrations/n8n-fitnessmealplanner main --squash

# 3. Update MANIFEST.md sync status
vim docs/integrations/MANIFEST.md
# - Set sync status to "✅ Synced"

# 4. Commit and push
git add docs/integrations/
git commit -m "docs(integration): Sync n8n documentation from primary repo

Synced from: N8N_Automation
Version: 2025-01-23

Closes #<issue-number>
"

git push origin docs/sync-n8n-integration-2025-01-23
```

---

## Ownership

| Role | Responsibility | Person/Team |
|------|---------------|-------------|
| **Primary Owner** | Content accuracy, change notifications | N8N_Automation team |
| **Secondary Maintainer** | Sync execution, context adaptation | FitnessMealPlanner team |
| **Integration Owner** | Architecture changes, conflict resolution | Backend Lead |

---

## Verification

**Before merging documentation PR:**

- [ ] MANIFEST.md updated with correct version
- [ ] All internal links work
- [ ] Code examples use correct paths
- [ ] No sensitive information (API keys, secrets)
- [ ] Sync issue created in secondary repo (if primary change)
- [ ] Commit message follows format

**Run automated verification:**
```bash
npm run docs:verify
```

---

## Sync Schedule

- **After Every Update:** Sync within 48 hours
- **Weekly:** Review MANIFEST.md for pending syncs
- **Monthly:** Audit documentation accuracy
- **Quarterly:** Full cross-repo consistency check

---

## Troubleshooting

### Sync Script Fails

**Solution:** Manual sync using git subtree (see sync process above)

### Documentation Conflicts

**Solution:** Primary repo (N8N_Automation) content takes precedence. Secondary repo reverts its changes and re-applies on top of primary's update.

### Out of Sync >7 Days

**Action:**
1. Immediate audit of both repos
2. Update primary repo documentation
3. Priority sync to secondary repo (within 24h)
4. Root cause analysis and process improvement

---

**For full governance details, see:** `docs/integrations/MANIFEST.md`
