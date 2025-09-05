# FitnessMealPlanner Troubleshooting Guide
**Last Updated:** September 5, 2025

## 🔍 Common Issues and Solutions

### 1. React Query Cache Conflicts

#### Symptoms:
- Features work independently but not together
- Data disappears when switching between tabs/pages
- Need to logout/login to see different data
- One component's data affects another unrelated component

#### Root Cause:
Multiple components using the same React Query cache key

#### Solution:
```typescript
// ❌ WRONG - Multiple components using same key
// Component A
useQuery({ queryKey: ['customers'] })
// Component B
useQuery({ queryKey: ['customers'] })

// ✅ CORRECT - Unique keys for each component
// Component A
useQuery({ queryKey: ['profileCustomers', userId] })
// Component B  
useQuery({ queryKey: ['managementCustomers', userId] })
```

#### Quick Fix:
1. Search for duplicate query keys: `grep -r "queryKey.*'keyname'" src/`
2. Give each component unique query keys
3. Update invalidation calls to use new keys
4. Test without logout/login

**Reference:** See `REACT_QUERY_CACHE_CONFLICT_RESOLUTION.md` for detailed case study

---

### 2. Saved Meal Plans Not Displaying

#### Symptoms:
- Saved Plans tab shows empty state despite having plans
- API returns data but UI doesn't display it
- Works after logout/login

#### Solution:
```typescript
// Add proper refetch configuration
const { data, refetch } = useQuery({
  queryKey: ['trainer-meal-plans', user?.id],
  queryFn: fetchMealPlans,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  staleTime: 0,
});

// Force refetch on mount
useEffect(() => {
  if (user?.id) refetch();
}, [user?.id, refetch]);
```

---

### 3. Customer Data Not Loading

#### Symptoms:
- Customers tab shows "0 Customers" despite having customers
- API call not being made
- Data loads after page refresh

#### Solution:
Check for query key conflicts (see #1) and ensure proper mounting behavior:
```typescript
useEffect(() => {
  refetch(); // Force data fetch on component mount
}, [refetch]);
```

---

### 4. Tab Switching Issues

#### Symptoms:
- Data doesn't update when switching tabs
- Previous tab's data appears in new tab
- API calls not triggered on tab change

#### Solution:
1. Ensure unique query keys per component
2. Use `refetchOnMount: true` for tab content components
3. Clear stale data with `staleTime: 0` for real-time data

---

### 5. Authentication/Rate Limiting

#### Symptoms:
- "Too many login attempts" error
- Tests failing with rate limit errors

#### Solution:
```javascript
// Add delay between login attempts in tests
await page.waitForTimeout(5000); // Wait for rate limit to clear

// Clear cookies before new login
await context.clearCookies();
```

---

## 🛠️ Debugging Tools & Techniques

### React Query DevTools
```typescript
// Add to your app for debugging
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### Console Debugging for Data Issues
```typescript
useEffect(() => {
  console.log('[ComponentName] Data received:', data);
  console.log('[ComponentName] Loading:', isLoading);
  console.log('[ComponentName] Error:', error);
}, [data, isLoading, error]);
```

### Playwright Testing for Feature Conflicts
```typescript
// Test both features work together
await page.click('button:has-text("Feature A")');
const featureAWorks = await page.locator('.feature-a').isVisible();

await page.click('button:has-text("Feature B")');  
const featureBWorks = await page.locator('.feature-b').isVisible();

// Go back to Feature A - should still work
await page.click('button:has-text("Feature A")');
const featureAStillWorks = await page.locator('.feature-a').isVisible();

expect(featureAWorks && featureBWorks && featureAStillWorks).toBeTruthy();
```

---

## 📊 Performance Issues

### Slow Tab Switching
- **Cause:** Too many refetches or large stale times
- **Solution:** Balance between fresh data and performance:
  ```typescript
  {
    staleTime: 30000,  // Cache for 30 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
  }
  ```

### Excessive API Calls
- **Cause:** Missing or short stale times
- **Solution:** Use appropriate cache settings:
  ```typescript
  {
    staleTime: 60000,        // 1 minute for lists
    refetchOnWindowFocus: false, // Disable for background tabs
  }
  ```

---

## 🚨 Critical Issues

### Data Loss/Corruption
**If data appears to be lost:**
1. Check browser DevTools Network tab for API responses
2. Verify React Query cache in DevTools
3. Check for console errors
4. Verify database directly

### Complete Feature Failure
**If entire features stop working:**
1. Clear browser cache and cookies
2. Check for JavaScript errors in console
3. Verify API endpoints are responding
4. Check Docker containers are running: `docker ps`
5. Restart development environment: `docker-compose --profile dev restart`

---

## 📝 Preventive Measures

### Code Review Checklist
- [ ] All query keys are unique across components
- [ ] Query keys include user ID for user-specific data
- [ ] Proper cache configuration for data freshness needs
- [ ] Error boundaries in place for component failures
- [ ] Loading states handled properly
- [ ] Empty states have appropriate messages

### Testing Checklist
- [ ] Test tab/page switching without logout
- [ ] Test rapid navigation between features
- [ ] Test page refresh on each feature
- [ ] Test with multiple browser tabs
- [ ] Test with slow network conditions

---

## 📞 Getting Help

### Before Asking for Help:
1. Check this troubleshooting guide
2. Search existing issues in the project
3. Check React Query documentation
4. Review recent code changes

### When Reporting Issues:
Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser console errors
- Network tab screenshot
- React Query DevTools screenshot

---

## 🔗 Related Documentation
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [REACT_QUERY_CACHE_CONFLICT_RESOLUTION.md](./REACT_QUERY_CACHE_CONFLICT_RESOLUTION.md)
- [BMAD_IMPLEMENTATION_STATUS.md](./BMAD_IMPLEMENTATION_STATUS.md)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)