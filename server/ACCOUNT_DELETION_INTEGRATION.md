# Account Deletion Feature - Integration Steps

## Backend Implementation Status

✅ **Completed:**
1. S3 cleanup service created (`server/services/s3Cleanup.ts`)
2. Account deletion service created (`server/services/accountDeletion.ts`)
3. Account deletion route created (`server/routes/accountDeletion.ts`)

⏳ **Pending Manual Integration:**
The following changes need to be manually added to `server/index.ts` due to hot reload conflicts:

### Step 1: Add Import

Add this line after `profileRouter` import (around line 24):
```typescript
import accountDeletionRouter from './routes/accountDeletion';
```

Full context:
```typescript
import profileRouter from './routes/profileRoutes';
import accountDeletionRouter from './routes/accountDeletion';  // ADD THIS LINE
import { favoritesRouter } from './routes/favorites';
```

### Step 2: Register Route

Add this line after the `/api/profile` route registration (around line 194):
```typescript
app.use('/api/account', requireAuth, accountDeletionRouter);
```

Full context:
```typescript
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/account', requireAuth, accountDeletionRouter);  // ADD THIS LINE
app.use('/api/grocery-lists', requireAuth, groceryListsRouter);
```

## API Endpoint

Once integrated, the endpoint will be available at:

**DELETE** `http://localhost:4000/api/account`

**Request:**
```json
{
  "password": "user_password",
  "confirmDeletion": true
}
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response:**
- `204 No Content` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid password
- `403 Forbidden` - Not a customer
- `404 Not Found` - User not found
- `500 Internal Server Error` - S3 or database failure

## Testing the Integration

After manually adding the above changes:

1. **Restart the dev server:**
   ```bash
   npm run dev
   ```

2. **Test with curl:**
   ```bash
   curl -X DELETE http://localhost:4000/api/account \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"password":"TestCustomer123!","confirmDeletion":true}'
   ```

3. **Expected behavior:**
   - S3 cleanup logs appear
   - Database transaction completes
   - User record deleted
   - Session invalidated
   - 204 response returned

## Next Steps

After integration:
1. ✅ Backend complete
2. ⏳ Add frontend UI (Customer profile page)
3. ⏳ Write unit tests (24 tests)
4. ⏳ Write E2E tests (10 tests)
5. ⏳ QA review

---

**Note:** The hot reload was interfering with file edits. Manual integration ensures clean application of changes.
