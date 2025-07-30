# How to Logout and Login as Trainer

## 🔓 Step 1: Logout Current Customer Account

### Option A: Use Logout Button
1. Look for a "Logout" or "Sign Out" button in the UI
2. Click it to logout

### Option B: Clear Browser Storage (if no logout button)
1. **Open Browser Dev Tools** (F12)
2. **Go to Application tab**
3. **Click "Local Storage" > "http://localhost:4000"**
4. **Delete these items:**
   - `token` (authentication token)
   - Any other user-related data
5. **Refresh the page** - you should be redirected to login

### Option C: Use Incognito/Private Window
1. **Open new incognito/private window**
2. **Go to** `http://localhost:4000/login`

## 👨‍💼 Step 2: Login as Trainer

You need trainer credentials. If you don't have any, you'll need to:

### Create a Trainer Account:
1. **Go to** `http://localhost:4000/register`
2. **Fill out the form:**
   - Email: `trainer@test.com` (or any email)
   - Password: `Password123!` (or meet password requirements)
   - **Role: Select "Trainer"** ⚠️ **This is crucial!**
3. **Submit registration**

### Login with Trainer Credentials:
1. **Go to** `http://localhost:4000/login`  
2. **Use trainer email and password**
3. **Make sure you see trainer interface, not customer interface**

## ✅ Step 3: Verify You're Logged in as Trainer

After logging in, you should see:
- **Console logs showing `Trainer.tsx`** (not `Customer.tsx`)
- **Trainer navigation tabs:** Recipes, Generate Plans, Saved Plans, **Customers**
- **URL should work:** `http://localhost:4000/trainer/customers`

## 🚨 Common Issues:

1. **Still seeing Customer interface?** 
   - You're logged in as customer, not trainer
   - Clear storage and try again

2. **Registration says "User already exists"?**
   - Try a different email address
   - Or login with existing credentials

3. **Can't find trainer role in registration?**
   - Check the registration form has a role selector
   - Make sure you select "Trainer" not "Customer"

## 🎯 Expected Result:
Once logged in as trainer:
- Navigate to `http://localhost:4000/trainer/customers`
- Should see Customer Management interface (not 404)
- Should see the Customers tab working properly

---

**The feature is working perfectly - you just need the right user role!** 🔐