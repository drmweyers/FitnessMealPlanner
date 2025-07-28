@echo off
echo Testing EvoFit PDF Export API...
echo.

curl -X POST http://localhost:4000/api/pdf/export ^
  -H "Content-Type: application/json" ^
  -d "{\"mealPlanData\":{\"id\":\"test-001\",\"planName\":\"EvoFit Test Plan\",\"fitnessGoal\":\"weight_loss\",\"description\":\"Test plan for PDF generation\",\"dailyCalorieTarget\":1800,\"days\":1,\"mealsPerDay\":2,\"meals\":[{\"day\":1,\"mealNumber\":1,\"mealType\":\"breakfast\",\"recipe\":{\"id\":\"recipe-001\",\"name\":\"Test Breakfast\",\"description\":\"A simple test recipe\",\"caloriesKcal\":300,\"proteinGrams\":\"20\",\"carbsGrams\":\"30\",\"fatGrams\":\"10\",\"prepTimeMinutes\":10,\"servings\":1,\"mealTypes\":[\"breakfast\"],\"dietaryTags\":[\"test\"],\"ingredientsJson\":[{\"name\":\"Eggs\",\"amount\":\"2\",\"unit\":\"large\"},{\"name\":\"Toast\",\"amount\":\"1\",\"unit\":\"slice\"}],\"instructionsText\":\"1. Cook eggs. 2. Toast bread. 3. Serve together.\"}}]},\"customerName\":\"Test User\",\"options\":{\"includeShoppingList\":true,\"includeMacroSummary\":true,\"includeRecipePhotos\":false,\"orientation\":\"portrait\",\"pageSize\":\"A4\"}}" ^
  --output "EvoFit_Test_Export.pdf"

if %errorlevel% == 0 (
    echo.
    echo ✅ SUCCESS! EvoFit PDF generated as: EvoFit_Test_Export.pdf
    echo.
    echo Opening PDF...
    start EvoFit_Test_Export.pdf
) else (
    echo.
    echo ❌ Error occurred. Make sure the server is running on port 4000.
)

pause