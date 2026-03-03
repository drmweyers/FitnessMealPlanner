# How to Access Bulk Recipe Generation Page

## Quick Access Methods

### Method 1: Direct URL (Easiest)

Simply navigate to:
```
http://localhost:5173/admin/bulk-generation
```
(Replace `localhost:5173` with your actual domain in production)

**Requirements:**
- ✅ Must be logged in
- ✅ Must have **admin** role

---

### Method 2: From Admin Dashboard

1. Go to `/admin` (Admin dashboard)
2. Type `/admin/bulk-generation` in the browser address bar
3. Press Enter

---

### Method 3: Manual Navigation (If Logged In)

1. Make sure you're logged in as an **admin** user
2. In your browser's address bar, type:
   ```
   /admin/bulk-generation
   ```
3. Press Enter

---

## Verification

To verify you can access the page:

1. **Check your role**: Make sure you're logged in as an admin
2. **Check URL**: Should be `/admin/bulk-generation`
3. **Check page title**: Should see "Bulk Recipe Generation" heading
4. **Check form**: Should see batch size buttons (100, 500, 1000, etc.)

---

## If You Can't Access

### Issue: "You must be an admin" error

**Solution:**
- Log in with an admin account
- Check your user role in the database
- Verify the user has `role: 'admin'`

### Issue: Page not found (404)

**Solution:**
- Make sure the route is registered in `Router.tsx`
- Restart the development server
- Check browser console for errors
- Verify the file `BulkRecipeGeneration.tsx` exists

### Issue: Blank page or errors

**Solution:**
- Check browser console (F12) for errors
- Check server logs for errors
- Verify all dependencies are installed
- Make sure the backend route is registered

---

## Quick Test

To quickly test if everything is set up:

1. **Start your dev server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Log in as admin**

3. **Navigate to**: `http://localhost:5173/admin/bulk-generation`

4. **You should see**:
   - ✅ "Bulk Recipe Generation" heading
   - ✅ Batch size buttons (100, 500, 1000, 2000, 4000, 5000)
   - ✅ Form with meal types, dietary restrictions, etc.
   - ✅ "Start Generation" button

---

## Adding a Navigation Link (Optional)

If you want to add a link to the navigation menu, you can:

1. Add to Admin page navigation
2. Add to Layout navigation for admins
3. Add to Admin dashboard page

**Example: Add to Admin page**

In `client/src/pages/Admin.tsx`, add a link:
```tsx
<Link href="/admin/bulk-generation">
  <Button>Bulk Generation</Button>
</Link>
```

---

## API Endpoint

The backend endpoint is:
```
POST /api/admin/generate-bulk
```

Make sure this route is registered in `server/index.ts`:
```typescript
app.use('/api/admin/generate-bulk', bulkGenerationRouter);
```

---

## Production URL

In production, the URL will be:
```
https://yourdomain.com/admin/bulk-generation
```

---

## Need Help?

If you're still having issues:
1. Check server logs
2. Check browser console (F12)
3. Verify route registration
4. Check authentication/authorization
5. Verify admin role in database


