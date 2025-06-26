/**
 * Comprehensive Admin Component Rendering Test
 *
 * This script tests authentication, API responses, and component rendering
 * to identify why the admin sections are not visible in the GUI.
 */

const fs = require("fs");

async function testAdminRendering() {
  console.log("🔍 Starting Comprehensive Admin Rendering Test...\n");

  try {
    // Test 1: Direct API calls
    console.log("=== Test 1: API Endpoint Testing ===");

    const authResponse = await fetch("http://localhost:5001/api/auth/user");
    console.log(`Auth endpoint status: ${authResponse.status}`);

    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log("User authenticated:", authData.email);

      // Test admin stats with auth
      const statsResponse = await fetch(
        "http://localhost:5001/api/admin/stats",
      );
      console.log(`Admin stats status: ${statsResponse.status}`);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log("Stats data:", statsData);
      } else {
        console.log("Stats error:", await statsResponse.text());
      }
    } else {
      console.log("Auth failed:", await authResponse.text());
    }

    // Test 2: Check if admin page loads at all
    console.log("\n=== Test 2: Admin Page Loading ===");
    const adminPageResponse = await fetch("http://localhost:5001/admin");
    console.log(`Admin page status: ${adminPageResponse.status}`);

    // Test 3: Component file existence
    console.log("\n=== Test 3: Component File Check ===");
    const adminPath = "./client/src/pages/Admin.tsx";

    if (fs.existsSync(adminPath)) {
      console.log("✅ Admin.tsx file exists");
      const content = fs.readFileSync(adminPath, "utf8");

      // Check for key elements
      const hasDebugSection = content.includes("DEBUG: Component Test");
      const hasRecipeManagement = content.includes(
        "Recipe Database Management",
      );
      const hasReturn = content.includes("return (");

      console.log("Has debug section:", hasDebugSection);
      console.log("Has recipe management:", hasRecipeManagement);
      console.log("Has return statement:", hasReturn);

      // Check for early returns or conditions
      const earlyReturns = content.match(/if \([^)]+\) {\s*return/g);
      console.log("Early return conditions:", earlyReturns?.length || 0);
    } else {
      console.log("❌ Admin.tsx file not found");
    }

    // Test 4: Check routing
    console.log("\n=== Test 4: Routing Check ===");
    const appPath = "./client/src/App.tsx";

    if (fs.existsSync(appPath)) {
      const appContent = fs.readFileSync(appPath, "utf8");
      const hasAdminRoute =
        appContent.includes("/admin") || appContent.includes("Admin");
      console.log("App.tsx has admin route:", hasAdminRoute);
    }

    console.log("\n✅ Test completed");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testAdminRendering();
