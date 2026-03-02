# Recipe Save Failure Analysis - Production vs Local

## Problem Summary

Recipes are being **generated successfully** via OpenAI API, but **not being saved to the database in production**. The same code works fine locally.

## Root Cause: Transaction Context Not Used

### The Bug

In `DatabaseOrchestratorAgent.saveBatchWithTransaction()`, the code creates a transaction but **doesn't use the transaction context** when calling `storage.createRecipe()`.

**Problematic Code:**

```typescript:146:156:server/services/agents/DatabaseOrchestratorAgent.ts
await storage.transaction(async (tx) => {
  for (const validatedRecipe of batch) {
    try {
      const recipeData = this.convertToInsertRecipe(
        validatedRecipe.recipe,
        defaultImageUrl,
        recipeTierLevel
      );

      // Use transaction context for insert
      const createdRecipe = await storage.createRecipe(recipeData);
```

**The Issue:**

```typescript:327:330:server/storage.ts
async createRecipe(recipeData: InsertRecipe): Promise<Recipe> {
  const [recipe] = await db.insert(recipes).values(recipeData as any).returning();
  return recipe;
}
```

**Problem:**
- `storage.transaction()` creates a transaction context `tx`
- But `storage.createRecipe()` uses `db.insert()` directly, **ignoring the transaction context**
- This means:
  1. The inserts happen **outside the transaction**
  2. If an error occurs, the transaction rollback **doesn't affect the inserts**
  3. OR the inserts might fail silently because they're not part of the transaction
  4. In production, database connection pooling or transaction isolation might cause this to fail

### Why It Works Locally But Not in Production

1. **Local Environment:**
   - Single database connection
   - Less strict transaction isolation
   - Errors might be more visible in console
   - Auto-commit might be enabled

2. **Production Environment:**
   - Connection pooling (multiple connections)
   - Stricter transaction isolation
   - Errors might be swallowed
   - Auto-commit might be disabled
   - Database might require explicit transaction context

## Additional Issues Found

### 1. Error Handling Swallows Errors

```typescript:176:183:server/services/agents/DatabaseOrchestratorAgent.ts
} catch (error) {
  // Transaction rolled back
  const errorMsg = error instanceof Error ? error.message : String(error);
  return {
    saved: [], // No recipes saved due to rollback
    failed: batch.length,
    errors: [errorMsg]
  };
}
```

**Problem:**
- Errors are caught but may not be properly logged
- The error message might not include database-specific errors
- No distinction between transaction rollback errors and actual database errors

### 2. Transaction Rollback on Any Error

```typescript:166:173:server/services/agents/DatabaseOrchestratorAgent.ts
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  errors.push(`Failed to save ${validatedRecipe.recipe.name}: ${errorMsg}`);
  failed++;

  // Throw error to trigger transaction rollback
  throw new Error(`Recipe save failed: ${errorMsg}`);
}
```

**Problem:**
- If ANY recipe in a batch fails, the ENTIRE batch is rolled back
- This is overly aggressive - one bad recipe shouldn't prevent others from saving
- The rollback might be affecting recipes that were already saved outside the transaction

### 3. No Database Connection Error Handling

The code doesn't check for:
- Database connection failures
- Connection pool exhaustion
- Transaction timeout
- Database lock timeouts

## Solutions

### Solution 1: Fix Transaction Context (CRITICAL)

**Option A: Pass Transaction to createRecipe**

Modify `storage.createRecipe()` to accept optional transaction:

```typescript
// In storage.ts
async createRecipe(recipeData: InsertRecipe, tx?: any): Promise<Recipe> {
  const dbInstance = tx || db;
  const [recipe] = await dbInstance.insert(recipes).values(recipeData as any).returning();
  return recipe;
}
```

Then in `DatabaseOrchestratorAgent`:

```typescript
await storage.transaction(async (tx) => {
  for (const validatedRecipe of batch) {
    const recipeData = this.convertToInsertRecipe(...);
    const createdRecipe = await storage.createRecipe(recipeData, tx); // Pass tx
    // ...
  }
});
```

**Option B: Use Transaction Directly (RECOMMENDED)**

Modify `DatabaseOrchestratorAgent` to use transaction directly:

```typescript
private async saveBatchWithTransaction(
  batch: ValidatedRecipe[],
  defaultImageUrl: string,
  tierLevel: 'starter' | 'professional' | 'enterprise' = 'starter'
): Promise<{
  saved: SavedRecipeResult[];
  failed: number;
  errors: string[];
}> {
  const saved: SavedRecipeResult[] = [];
  const errors: string[] = [];
  let failed = 0;

  try {
    await storage.transaction(async (tx) => {
      for (const validatedRecipe of batch) {
        try {
          const recipeData = this.convertToInsertRecipe(
            validatedRecipe.recipe,
            defaultImageUrl,
            tierLevel
          );

          // Use transaction context directly
          const [createdRecipe] = await tx.insert(recipes)
            .values(recipeData as any)
            .returning();

          saved.push({
            recipeId: createdRecipe.id,
            recipeName: createdRecipe.name,
            recipeDescription: createdRecipe.description || '',
            mealTypes: createdRecipe.mealTypes || [],
            success: true,
            imageUrl: createdRecipe.imageUrl || null
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to save ${validatedRecipe.recipe.name}: ${errorMsg}`);
          failed++;
          // Don't throw - continue with other recipes
        }
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[database] Transaction failed:', errorMsg);
    // Log full error details
    if (error instanceof Error && error.stack) {
      console.error('[database] Stack trace:', error.stack);
    }
    return {
      saved: [],
      failed: batch.length,
      errors: [errorMsg]
    };
  }

  return { saved, failed, errors };
}
```

### Solution 2: Improve Error Handling

Add detailed error logging:

```typescript
catch (error) {
  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    type: error instanceof Error ? error.constructor.name : 'Unknown',
    stack: error instanceof Error ? error.stack : undefined,
    code: (error as any)?.code, // PostgreSQL error code
    detail: (error as any)?.detail, // PostgreSQL error detail
    constraint: (error as any)?.constraint, // Constraint name if violated
    timestamp: new Date().toISOString()
  };
  
  console.error('[database] Recipe save error:', JSON.stringify(errorDetails, null, 2));
  
  errors.push(`Failed to save ${validatedRecipe.recipe.name}: ${errorDetails.message}`);
  failed++;
  
  // Don't throw - allow other recipes to save
}
```

### Solution 3: Remove Aggressive Rollback

Instead of rolling back the entire batch on one error, save recipes individually:

```typescript
await storage.transaction(async (tx) => {
  for (const validatedRecipe of batch) {
    try {
      // Save recipe
      const [createdRecipe] = await tx.insert(recipes)
        .values(recipeData as any)
        .returning();
      
      saved.push({...});
    } catch (error) {
      // Log error but continue
      errors.push(`Failed: ${error.message}`);
      failed++;
      // Don't throw - continue with next recipe
    }
  }
});
```

### Solution 4: Add Database Connection Validation

Add startup check:

```typescript
// In server/index.ts or db.ts
async function testDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection: OK');
    
    // Test transaction
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT 1`);
    });
    console.log('✅ Database transactions: OK');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
```

## Immediate Action Items

1. ✅ **Fix Transaction Context** (Priority 1)
   - Modify `DatabaseOrchestratorAgent` to use transaction context directly
   - OR modify `storage.createRecipe()` to accept transaction parameter

2. ✅ **Add Error Logging** (Priority 2)
   - Log full error details including PostgreSQL error codes
   - Log transaction state

3. ✅ **Test in Production** (Priority 3)
   - Deploy fix
   - Monitor logs for database errors
   - Verify recipes are being saved

4. ✅ **Add Database Health Check** (Priority 4)
   - Add connection validation on startup
   - Add transaction test

## Expected Error Messages in Production

If transaction context is the issue, you might see:
- No errors (silent failure)
- `"Transaction already committed"`
- `"Connection pool exhausted"`
- `"Cannot perform operation: transaction not found"`

If database connection is the issue:
- `"Connection refused"`
- `"Connection timeout"`
- `"Too many connections"`
- `"Database does not exist"`

If constraint violations:
- `"duplicate key value violates unique constraint"`
- `"null value in column violates not-null constraint"`
- `"value too long for type"`

## Verification Steps

1. **Check Production Logs:**
   ```bash
   # Look for these log messages
   grep "[BMAD] Database response" production.log
   grep "[database] Recipe save error" production.log
   grep "Transaction" production.log
   ```

2. **Check Database:**
   ```sql
   -- Check if recipes table exists and is accessible
   SELECT COUNT(*) FROM recipes;
   
   -- Check recent inserts
   SELECT id, name, created_at 
   FROM recipes 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Test Transaction:**
   ```typescript
   // Add test endpoint
   app.get('/api/test/db-transaction', async (req, res) => {
     try {
       await storage.transaction(async (tx) => {
         const [test] = await tx.insert(recipes).values({
           name: 'Test Recipe',
           description: 'Test',
           // ... minimal required fields
         }).returning();
         console.log('Test recipe created:', test.id);
       });
       res.json({ success: true });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

## Conclusion

The primary issue is that **`storage.createRecipe()` is not using the transaction context** passed to `storage.transaction()`. This causes inserts to happen outside the transaction, which can fail silently in production due to connection pooling and transaction isolation differences.

**Fix:** Use the transaction context directly in `DatabaseOrchestratorAgent` or modify `storage.createRecipe()` to accept and use the transaction parameter.


