# React Query Cache Conflict Resolution - Trainer Features
**Date Resolved:** September 5, 2025  
**Issue Type:** Critical Bug - Feature Conflict  
**Components Affected:** TrainerMealPlans, CustomerManagement, TrainerProfile

## 🚨 The Problem

### Symptoms
1. **Saved Meal Plans tab** - When working, assigned customers disappear from trainer profile
2. **Customers tab** - When working (after logout/login), saved meal plans stop displaying
3. Features were mutually exclusive - only one could work at a time
4. Required logout/login cycle to switch between features

### User Impact
- Trainers couldn't navigate between Saved Plans and Customers without logging out
- Poor user experience with broken tab navigation
- Data would appear/disappear based on which tab was visited

## 🔍 Root Cause Analysis

### The Conflict
**React Query cache key collision** between multiple components:

```typescript
// TrainerProfile.tsx (ORIGINAL - PROBLEMATIC)
const { data: customers } = useQuery({
  queryKey: ['trainerCustomers'],  // ⚠️ SAME KEY
  queryFn: async () => {
    const res = await apiRequest('GET', '/api/trainer/customers');
    return res.json();
  }
});

// CustomerManagement.tsx (ORIGINAL - PROBLEMATIC)
const { data: customersData } = useQuery({
  queryKey: ['trainerCustomers'],  // ⚠️ SAME KEY - COLLISION!
  queryFn: async () => {
    const res = await apiRequest('GET', '/api/trainer/customers');
    return res.json();
  }
});
```

### Why This Caused Problems
1. Both components shared the same cache key
2. React Query would serve cached data from one component to the other
3. Components had different data requirements and update cycles
4. Cache invalidation from one component affected the other
5. Stale data and race conditions occurred during tab switches

## ✅ The Solution

### 1. Unique Query Keys for Each Component

**TrainerProfile.tsx (FIXED)**
```typescript
const { data: customers } = useQuery({
  queryKey: ['trainerProfileCustomers', user?.id], // ✅ UNIQUE KEY
  queryFn: async () => {
    const res = await apiRequest('GET', '/api/trainer/customers');
    return res.json();
  },
  enabled: !!user,
  refetchOnMount: false,  // Don't refetch on every mount
  staleTime: 30000,       // Cache for 30 seconds
});
```

**CustomerManagement.tsx (FIXED)**
```typescript
const { data: customersData, refetch } = useQuery({
  queryKey: ['trainerCustomers'],  // Kept original for this component
  queryFn: async () => {
    const res = await apiRequest('GET', '/api/trainer/customers');
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },
  refetchOnMount: true,     // Always fresh data on mount
  refetchOnWindowFocus: true,
  staleTime: 0,             // Always consider stale
});

// Force refetch when component mounts
useEffect(() => {
  refetch();
}, [refetch]);
```

**TrainerMealPlans.tsx (FIXED)**
```typescript
const { data, refetch } = useQuery({
  queryKey: ['trainer-meal-plans', user?.id],  // User-specific key
  queryFn: async () => {
    const response = await apiRequest('GET', '/api/trainer/meal-plans');
    if (!response.ok) {
      throw new Error('Failed to fetch meal plans');
    }
    return response.json();
  },
  enabled: !!user?.id,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  staleTime: 0,
});

// Force refetch when component mounts
useEffect(() => {
  if (user?.id) {
    refetch();
  }
}, [user?.id, refetch]);
```

### 2. Query Invalidation Coordination

```typescript
// TrainerMealPlans.tsx - Invalidation strategy
queryClient.invalidateQueries({ queryKey: ['trainer-meal-plans'] });
queryClient.invalidateQueries({ queryKey: ['trainerCustomersForAssignment'] });
queryClient.invalidateQueries({ queryKey: ['trainerCustomers'] }); // Keep CustomerManagement updated
```

## 🧪 Testing Strategy

### Playwright Tests Created
1. **trainer-features-integration.test.ts** - Main integration tests
2. **trainer-features-edge-cases.test.ts** - Stress testing and edge cases
3. **final-trainer-features-test.test.ts** - Comprehensive validation

### Test Coverage
- ✅ Rapid tab switching (10+ cycles)
- ✅ Page refresh on each tab
- ✅ Browser back/forward navigation
- ✅ Multiple window/session testing
- ✅ Search functionality on both tabs
- ✅ API call verification
- ✅ Data persistence checks

## 📋 Prevention Guidelines

### Best Practices for React Query
1. **Always use unique query keys** for different components
2. **Include user ID** in query keys for user-specific data
3. **Document query key usage** in a central location
4. **Use TypeScript** for query key type safety
5. **Consider query key factories** for consistency

### Query Key Naming Convention
```typescript
// Good patterns
['componentName-resource', userId]
['pageContext-resource', filters]
['featureName-data', ...dependencies]

// Avoid
['customers']           // Too generic
['data']               // Ambiguous
['trainerCustomers']   // If used in multiple places
```

### Cache Management Strategy
```typescript
// Component-specific cache settings
{
  refetchOnMount: true,      // For frequently changing data
  refetchOnWindowFocus: true, // For user-facing lists
  staleTime: 0,              // For critical real-time data
}

// Shared data cache settings
{
  refetchOnMount: false,     // Avoid unnecessary refetches
  staleTime: 30000,          // Cache for reasonable time
  cacheTime: 300000,         // Keep in cache longer
}
```

## 🔧 Troubleshooting Similar Issues

### Symptoms to Watch For
1. Data disappearing when navigating between tabs/pages
2. Features working only after logout/login
3. Inconsistent data between components
4. API calls not being made when expected

### Debugging Steps
1. **Check React Query DevTools** - Look for duplicate cache entries
2. **Search for duplicate query keys** - `grep -r "queryKey.*'sameName'" src/`
3. **Add console logs** - Log query key and data in useQuery hooks
4. **Monitor network tab** - Verify API calls are being made
5. **Test in isolation** - Comment out one component at a time

### Quick Fix Checklist
- [ ] Identify all components using the same query key
- [ ] Give each component a unique query key
- [ ] Add appropriate cache settings for each use case
- [ ] Update query invalidations to use new keys
- [ ] Test tab switching without logout
- [ ] Verify data persists correctly

## 📊 Impact and Results

### Before Fix
- 🔴 Saved Plans OR Customers worked (not both)
- 🔴 Required logout/login to switch features
- 🔴 Poor user experience
- 🔴 Data inconsistency

### After Fix
- ✅ Both features work simultaneously
- ✅ Seamless tab switching
- ✅ No logout required
- ✅ Consistent data display
- ✅ Improved performance

## 🎯 Key Takeaways

1. **React Query cache keys must be unique** across different components
2. **Shared cache keys cause conflicts** even with the same API endpoint
3. **Proper cache configuration** is crucial for multi-tab applications
4. **Testing tab interactions** should be part of the QA process
5. **Component isolation** helps identify cache-related issues

## 📚 Related Documentation
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Cache Management](https://tanstack.com/query/latest/docs/react/guides/caching)
- [Query Invalidation](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)

---
*This issue was discovered and resolved during the FitnessMealPlanner development. The fix ensures trainers can seamlessly navigate between all features without conflicts.*