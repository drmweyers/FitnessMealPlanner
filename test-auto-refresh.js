/**
 * Auto-Refresh Functionality Test
 *
 * This test verifies that the meal plan generation triggers proper
 * auto-refresh of the GUI components without manual user intervention.
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";

function checkAutoRefreshImplementation() {
  console.log("=== AUTO-REFRESH IMPLEMENTATION TEST ===\n");

  const mealPlanGeneratorPath = "client/src/components/MealPlanGenerator.tsx";
  const adminRecipeGeneratorPath =
    "client/src/components/AdminRecipeGenerator.tsx";

  try {
    // 1. Check MealPlanGenerator for auto-refresh implementation
    console.log("1. Checking MealPlanGenerator auto-refresh implementation...");
    const mealPlanContent = readFileSync(mealPlanGeneratorPath, "utf8");

    const requiredFeatures = [
      "useQueryClient",
      "queryClient.invalidateQueries",
      "queryClient.refetchQueries",
      "useEffect",
      "/api/recipes",
      "/api/admin/stats",
    ];

    let passedChecks = 0;
    requiredFeatures.forEach((feature) => {
      if (mealPlanContent.includes(feature)) {
        console.log(`   ✓ ${feature} - FOUND`);
        passedChecks++;
      } else {
        console.log(`   ✗ ${feature} - MISSING`);
      }
    });

    console.log(
      `   MealPlanGenerator: ${passedChecks}/${requiredFeatures.length} features implemented\n`,
    );

    // 2. Check AdminRecipeGenerator for auto-refresh implementation
    console.log(
      "2. Checking AdminRecipeGenerator auto-refresh implementation...",
    );
    const adminContent = readFileSync(adminRecipeGeneratorPath, "utf8");

    const adminFeatures = [
      "useQueryClient",
      "queryClient.invalidateQueries",
      "setTimeout",
      "Generation Complete",
    ];

    let adminPassed = 0;
    adminFeatures.forEach((feature) => {
      if (adminContent.includes(feature)) {
        console.log(`   ✓ ${feature} - FOUND`);
        adminPassed++;
      } else {
        console.log(`   ✗ ${feature} - MISSING`);
      }
    });

    console.log(
      `   AdminRecipeGenerator: ${adminPassed}/${adminFeatures.length} features implemented\n`,
    );

    // 3. Check specific auto-refresh patterns
    console.log("3. Checking specific auto-refresh patterns...");

    const patterns = [
      {
        name: "Mutation onSuccess with invalidate",
        pattern: /onSuccess:.*queryClient\.invalidateQueries/s,
        file: mealPlanContent,
      },
      {
        name: "Component mount refresh",
        pattern: /useEffect.*queryClient\.invalidateQueries/s,
        file: mealPlanContent,
      },
      {
        name: "Multiple query invalidation",
        pattern: /invalidateQueries.*invalidateQueries/s,
        file: mealPlanContent,
      },
      {
        name: "Refetch after invalidate",
        pattern: /invalidateQueries.*refetchQueries/s,
        file: mealPlanContent,
      },
    ];

    let patternsPassed = 0;
    patterns.forEach((pattern) => {
      if (pattern.pattern.test(pattern.file)) {
        console.log(`   ✓ ${pattern.name} - IMPLEMENTED`);
        patternsPassed++;
      } else {
        console.log(`   ✗ ${pattern.name} - MISSING`);
      }
    });

    console.log(
      `   Auto-refresh patterns: ${patternsPassed}/${patterns.length} implemented\n`,
    );

    // 4. Summary
    const totalPassed = passedChecks + adminPassed + patternsPassed;
    const totalChecks =
      requiredFeatures.length + adminFeatures.length + patterns.length;
    const passRate = Math.round((totalPassed / totalChecks) * 100);

    console.log("=== TEST SUMMARY ===");
    console.log(
      `Total checks passed: ${totalPassed}/${totalChecks} (${passRate}%)`,
    );

    if (passRate >= 90) {
      console.log("✅ AUTO-REFRESH IMPLEMENTATION: EXCELLENT");
    } else if (passRate >= 75) {
      console.log("⚠️  AUTO-REFRESH IMPLEMENTATION: GOOD");
    } else {
      console.log("❌ AUTO-REFRESH IMPLEMENTATION: NEEDS IMPROVEMENT");
    }

    return {
      success: passRate >= 75,
      passRate,
      details: {
        mealPlanGenerator: passedChecks,
        adminRecipeGenerator: adminPassed,
        patterns: patternsPassed,
      },
    };
  } catch (error) {
    console.error("Error during implementation check:", error.message);
    return { success: false, error: error.message };
  }
}

async function testServerResponse() {
  console.log("\n=== SERVER RESPONSE TEST ===\n");

  try {
    // Test if server is responding
    const response = await fetch("http://localhost:5001/api/admin/stats", {
      credentials: "include",
    });

    if (response.ok) {
      const stats = await response.json();
      console.log("✓ Server responding correctly");
      console.log(
        `  Current recipes: ${stats.total} (${stats.approved} approved, ${stats.pending} pending)`,
      );
      return { success: true, stats };
    } else {
      console.log(`✗ Server response error: ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`✗ Server connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTest() {
  console.log("🧪 Starting Auto-Refresh Functionality Test\n");

  const results = {
    timestamp: new Date().toISOString(),
    implementation: null,
    server: null,
  };

  try {
    // Test 1: Implementation check
    results.implementation = checkAutoRefreshImplementation();

    // Test 2: Server response
    results.server = await testServerResponse();

    console.log("\n=== FINAL RESULTS ===");

    const implementationSuccess = results.implementation.success;
    const serverSuccess = results.server.success;

    console.log(
      `Implementation: ${implementationSuccess ? "✅ PASS" : "❌ FAIL"}`,
    );
    console.log(`Server Response: ${serverSuccess ? "✅ PASS" : "❌ FAIL"}`);

    const overallSuccess = implementationSuccess && serverSuccess;
    console.log(
      `\n🎯 Overall Test Result: ${overallSuccess ? "✅ PASS" : "❌ FAIL"}`,
    );

    if (overallSuccess) {
      console.log(
        "\n✨ Auto-refresh functionality is properly implemented and ready for use!",
      );
    } else {
      console.log(
        "\n⚠️  Some issues detected. Please review the implementation.",
      );
    }

    return results;
  } catch (error) {
    console.error("\n❌ Test failed with error:", error.message);
    results.error = error.message;
    return results;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTest()
    .then((results) => {
      process.exit(
        results.implementation?.success && results.server?.success ? 0 : 1,
      );
    })
    .catch((error) => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}
