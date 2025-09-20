# Database Scripts

## Insert Test Measurements

This script populates the test customer account with realistic measurement data showing a 90-day fitness journey.

### Files:
- `insert-test-measurements.js` - Node.js script that executes the SQL
- `insert-test-measurements-simple.sql` - SQL file with 31 measurement records

### Usage:
```bash
npm run insert:test-measurements
```

### What it does:
1. Connects to the PostgreSQL database using existing configuration
2. Verifies the test customer exists (customer.test@evofitmeals.com)
3. Deletes any existing measurements for this customer
4. Inserts 31 measurements over a 90-day period showing:
   - Weight loss from 200 lbs to 180 lbs (20 lb total loss)
   - Body fat reduction from 25.5% to 20.0%
   - Waist reduction from 95.0 cm to 84.2 cm
   - Realistic fluctuations and plateaus
   - Progressive muscle mass gain
   - Encouraging progress notes

### Test Customer Details:
- **Customer ID**: `d241295e-3d34-451c-9585-01e47b112374`
- **Email**: `customer.test@evofitmeals.com`
- **Password**: `TestCustomer123!`

### Database Configuration:
The script uses the same database connection as the main application via `server/db.ts`. Make sure your `.env` file has the correct DATABASE_URL pointing to the `fitnessmealplanner` database.

### Error Handling:
The script includes comprehensive error handling and progress reporting. If any INSERT fails, it will show the exact error and continue with remaining statements.

### Verification:
After running, the script displays:
- Number of records inserted
- Sample data from the first few records
- Summary statistics (total weight loss, body fat reduction, etc.)

You can now log into the application as the test customer and view the progress tracking data in the Progress tab.