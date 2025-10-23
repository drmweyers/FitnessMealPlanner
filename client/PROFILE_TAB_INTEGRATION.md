# Profile Tab Integration - Manual Steps

## Files Created

✅ **DeleteAccountSection Component:**
- `client/src/components/DeleteAccountSection.tsx` (167 lines)
- Fully implemented danger zone UI with password confirmation
- Includes error handling, loading states, toast notifications
- Calls `DELETE /api/account` endpoint

## Manual Integration Required

Hot reload is interfering. Please manually make these changes to `client/src/pages/Customer.tsx`:

---

### Step 1: Add Import (Line ~27)

Add this line after the GroceryListWrapper import:

```typescript
import { DeleteAccountSection } from '../components/DeleteAccountSection';
```

**Full context:**
```typescript
import ProgressTracking from '../components/ProgressTracking';
import GroceryListWrapper from '../components/GroceryListWrapper';
import { DeleteAccountSection } from '../components/DeleteAccountSection';  // ADD THIS LINE
```

---

### Step 2: Update TabsList Grid (Line ~349)

Change `grid-cols-3` to `grid-cols-4`:

```typescript
<TabsList className="grid w-full max-w-lg grid-cols-4 bg-white/60 backdrop-blur-sm">
```

**Before:**
```typescript
<TabsList className="grid w-full max-w-lg grid-cols-3 bg-white/60 backdrop-blur-sm">
```

**After:**
```typescript
<TabsList className="grid w-full max-w-lg grid-cols-4 bg-white/60 backdrop-blur-sm">
```

---

### Step 3: Add Profile Tab Trigger (Line ~361, after Grocery tab)

Add this new tab trigger:

```typescript
<TabsTrigger value="profile" className="flex items-center space-x-2">
  <User className="w-4 h-4" />
  <span>Profile</span>
</TabsTrigger>
```

**Full context:**
```typescript
<TabsTrigger value="grocery-list" className="flex items-center space-x-2">
  <ShoppingCart className="w-4 h-4" />
  <span>Grocery</span>
</TabsTrigger>
<TabsTrigger value="profile" className="flex items-center space-x-2">  {/* ADD THIS */}
  <User className="w-4 h-4" />
  <span>Profile</span>
</TabsTrigger>
```

**Note:** The `User` icon is already imported on line 11.

---

### Step 4: Update URL Handling (Line ~338-346)

Add profile tab to URL parameter handling. Replace the entire onValueChange handler:

**Before:**
```typescript
onValueChange={(value) => {
  setActiveTab(value);
  const url = new URL(window.location.href);
  if (value === 'progress') {
    url.searchParams.set('tab', 'progress');
  } else if (value === 'grocery-list') {
    url.searchParams.set('tab', 'grocery-list');
  } else {
    url.searchParams.delete('tab');
  }
  window.history.replaceState({}, '', url.toString());
}}
```

**After:**
```typescript
onValueChange={(value) => {
  setActiveTab(value);
  const url = new URL(window.location.href);
  if (value === 'progress') {
    url.searchParams.set('tab', 'progress');
  } else if (value === 'grocery-list') {
    url.searchParams.set('tab', 'grocery-list');
  } else if (value === 'profile') {
    url.searchParams.set('tab', 'profile');
  } else {
    url.searchParams.delete('tab');
  }
  window.history.replaceState({}, '', url.toString());
}}
```

---

### Step 5: Add Profile Tab Content (Line ~656, after grocery-list tab)

Add this new TabsContent:

```typescript
<TabsContent value="profile">
  <div className="max-w-3xl mx-auto">
    <Card className="border-0 bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Account Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Email</h3>
          <p className="text-base text-gray-900">{user?.email}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Role</h3>
          <Badge variant="secondary" className="text-sm">
            {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
          </Badge>
        </div>
        <div className="pt-6 border-t">
          <DeleteAccountSection />
        </div>
      </CardContent>
    </Card>
  </div>
</TabsContent>
```

**Full context:**
```typescript
<TabsContent value="grocery-list">
  {/* Grocery list tab content */}
  <GroceryListWrapper
    activeMealPlan={activeMealPlan}
  />
</TabsContent>

<TabsContent value="profile">  {/* ADD THIS ENTIRE BLOCK */}
  <div className="max-w-3xl mx-auto">
    <Card className="border-0 bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Account Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Email</h3>
          <p className="text-base text-gray-900">{user?.email}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Role</h3>
          <Badge variant="secondary" className="text-sm">
            {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
          </Badge>
        </div>
        <div className="pt-6 border-t">
          <DeleteAccountSection />
        </div>
      </CardContent>
    </Card>
  </div>
</TabsContent>

</Tabs>  {/* Existing closing tag */}
```

---

### Step 6: Update Initial Tab Logic (Line ~76-83)

Add profile tab to initial tab detection:

**Before:**
```typescript
const [activeTab, setActiveTab] = useState(() => {
  if (initialTab) return initialTab;
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'progress') return 'progress';
  if (tab === 'grocery-list') return 'grocery-list';
  return 'meal-plans';
});
```

**After:**
```typescript
const [activeTab, setActiveTab] = useState(() => {
  if (initialTab) return initialTab;
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'progress') return 'progress';
  if (tab === 'grocery-list') return 'grocery-list';
  if (tab === 'profile') return 'profile';
  return 'meal-plans';
});
```

---

## Testing the Integration

After manually making all changes:

1. **View the UI:**
   - Navigate to: http://localhost:4000/customer
   - You should see 4 tabs: Meal Plans, Progress, Grocery, Profile

2. **Click Profile Tab:**
   - Should show account settings card
   - Email and role displayed
   - Danger Zone section at bottom

3. **Test Delete Account:**
   - Click "Delete My Account" button
   - Dialog should open
   - Enter password: `TestCustomer123!`
   - Check "I understand..." checkbox
   - Click "Delete Account"
   - Should see loading state
   - Should call DELETE /api/account endpoint

4. **URL Parameters:**
   - Profile tab URL should be: `http://localhost:4000/customer?tab=profile`
   - Refreshing should maintain tab selection

---

## Expected UI

**Profile Tab Layout:**
```
┌─────────────────────────────────────┐
│  Account Settings                   │
├─────────────────────────────────────┤
│  Email                              │
│  customer.test@evofitmeals.com     │
│                                      │
│  Role                               │
│  Customer                            │
│                                      │
│  ─────────────────────────────      │
│                                      │
│  ⚠️ Danger Zone                     │
│  Once you delete your account...    │
│                                      │
│  This will permanently delete:      │
│  • Your profile and personal info   │
│  • All your meal plans...           │
│  • Your grocery lists               │
│  • Your progress tracking data      │
│  • Your trainer relationships       │
│  • All uploaded images              │
│                                      │
│  [🗑️ Delete My Account]            │
└─────────────────────────────────────┘
```

---

## Summary of Changes

- ✅ 1 new import
- ✅ 1 grid column change (3 → 4)
- ✅ 1 new tab trigger
- ✅ 1 URL handler update
- ✅ 1 new TabsContent block
- ✅ 1 initial tab state update

**Total Lines Changed:** ~60 lines
**New Component:** DeleteAccountSection (167 lines)

---

**Note:** Hot reload was interfering with automatic edits. Manual integration ensures clean application of changes.
