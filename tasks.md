# FitnessMealPlanner - Pending Tasks

## 🔴 High Priority

### Email System - Domain Verification (Check: 2025-08-03)
- [ ] Check Resend domain verification status (https://resend.com/domains)
- [ ] Verify DNS records have propagated for bcinnovationlabs.com
- [ ] Click "Verify DNS Records" button in Resend dashboard
- [ ] Once verified, update FROM_EMAIL in .env to: `EvoFitMeals <evofitmeals@bcinnovationlabs.com>`
- [ ] Test email sending to external recipients (dr.m.weyers@bcinnovationlabs.com)
- [ ] Update production environment variables with new FROM_EMAIL

**Current Status**: Domain added but showing "Not Started". DNS records added ~24 hours ago but not yet propagated.

## 🟡 Medium Priority

### Code Cleanup
- [x] Remove temporary test files and scripts
- [x] Update .gitignore for test artifacts
- [ ] Review and commit useful test files in test/ directory

### Testing & Quality
- [ ] Run full test suite after domain verification
- [ ] Test complete user invitation flow with real emails
- [ ] Verify PDF export works in production environment

## 🟢 Low Priority / Future Enhancements

### Features to Consider
- [ ] Email notification preferences for users
- [ ] Bulk invitation sending for trainers
- [ ] Email templates customization
- [ ] Analytics dashboard for email delivery rates

## 📝 Notes

- Email system is fully implemented and tested
- Only blocker is domain verification with Resend
- All other features are working in development

---
*Last Updated: 2025-08-02*