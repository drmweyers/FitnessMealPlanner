-- Cleanup duplicate "My Grocery List" entries
-- Keep only lists with items or unique names

-- First, let's see what we have
SELECT
    name,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as ids
FROM grocery_lists
WHERE customer_id = '1f39f571-3de8-4611-bbca-371ccb8860a9'
GROUP BY name
ORDER BY count DESC;

-- Delete duplicates, keeping one "My Grocery List" with most items
WITH ranked_lists AS (
    SELECT
        gl.id,
        gl.name,
        gl.created_at,
        COUNT(gli.id) as item_count,
        ROW_NUMBER() OVER (
            PARTITION BY gl.name
            ORDER BY COUNT(gli.id) DESC, gl.created_at ASC
        ) as rn
    FROM grocery_lists gl
    LEFT JOIN grocery_list_items gli ON gli.grocery_list_id = gl.id
    WHERE gl.customer_id = '1f39f571-3de8-4611-bbca-371ccb8860a9'
        AND gl.name = 'My Grocery List'
    GROUP BY gl.id, gl.name, gl.created_at
)
DELETE FROM grocery_lists
WHERE id IN (
    SELECT id
    FROM ranked_lists
    WHERE rn > 1
);

-- Keep only meaningful lists
DELETE FROM grocery_lists
WHERE customer_id = '1f39f571-3de8-4611-bbca-371ccb8860a9'
    AND name = 'My Grocery List'
    AND id NOT IN (
        SELECT DISTINCT gl.id
        FROM grocery_lists gl
        LEFT JOIN grocery_list_items gli ON gli.grocery_list_id = gl.id
        WHERE gl.customer_id = '1f39f571-3de8-4611-bbca-371ccb8860a9'
            AND gl.name = 'My Grocery List'
        GROUP BY gl.id
        HAVING COUNT(gli.id) > 0
    )
    AND id NOT IN (
        SELECT id
        FROM grocery_lists
        WHERE customer_id = '1f39f571-3de8-4611-bbca-371ccb8860a9'
            AND name = 'My Grocery List'
        ORDER BY created_at ASC
        LIMIT 1
    );

-- Show final count
SELECT
    name,
    COUNT(*) as count
FROM grocery_lists
WHERE customer_id = '1f39f571-3de8-4611-bbca-371ccb8860a9'
GROUP BY name
ORDER BY count DESC;