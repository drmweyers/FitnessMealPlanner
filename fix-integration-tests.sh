#!/bin/bash

echo "Fixing integration test imports..."

# Fix all .test.tsx files in integration directory
for file in test/integration/*.test.tsx; do
    echo "Processing $file"

    # Fix apiRequest imports
    sed -i "s|from '../../client/src/lib/queryClient'|from '@/lib/queryClient'|g" "$file"
    sed -i "s|vi.mock('../../client/src/lib/queryClient'|vi.mock('@/lib/queryClient'|g" "$file"

    # Fix other common import issues
    sed -i "s|from '../../client/src/|from '@/|g" "$file"
    sed -i "s|vi.mock('../../client/src/|vi.mock('@/|g" "$file"
done

# Fix all .test.ts files in integration directory
for file in test/integration/*.test.ts; do
    echo "Processing $file"

    # Fix database imports
    sed -i "s|from '../../server/db'|from '../../server/db'|g" "$file"
    sed -i "s|import { db } from '../helpers/database-helpers'|import { getTestDB } from '../helpers/database-helpers'|g" "$file"
done

echo "Import fixes complete!"