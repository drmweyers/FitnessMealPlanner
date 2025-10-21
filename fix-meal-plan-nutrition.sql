-- Fix Meal Plan Nutrition Data
-- Update all manual meal plans with realistic nutrition values

DO $$
DECLARE
  plan_record RECORD;
  meal_record RECORD;
  updated_meals JSONB;
  meal_obj JSONB;
  nutrition JSONB;
BEGIN
  -- Loop through all trainer meal plans with manual creation method
  FOR plan_record IN
    SELECT id, meal_plan_data
    FROM trainer_meal_plans
    WHERE meal_plan_data->>'creationMethod' = 'manual'
      OR meal_plan_data->>'isManual' = 'true'
  LOOP
    updated_meals := '[]'::jsonb;

    -- Loop through meals in this plan
    FOR i IN 0..(jsonb_array_length(plan_record.meal_plan_data->'meals') - 1) LOOP
      meal_obj := plan_record.meal_plan_data->'meals'->i;

      -- Assign realistic nutrition based on meal category
      CASE meal_obj->>'category'
        WHEN 'breakfast' THEN
          nutrition := jsonb_build_object(
            'calories', 450,
            'protein', 25,
            'carbs', 50,
            'fat', 15,
            'fiber', 8
          );
        WHEN 'lunch' THEN
          nutrition := jsonb_build_object(
            'calories', 600,
            'protein', 45,
            'carbs', 55,
            'fat', 20,
            'fiber', 10
          );
        WHEN 'dinner' THEN
          nutrition := jsonb_build_object(
            'calories', 550,
            'protein', 40,
            'carbs', 45,
            'fat', 22,
            'fiber', 9
          );
        WHEN 'snack' THEN
          nutrition := jsonb_build_object(
            'calories', 200,
            'protein', 12,
            'carbs', 20,
            'fat', 8,
            'fiber', 4
          );
        ELSE
          nutrition := jsonb_build_object(
            'calories', 400,
            'protein', 30,
            'carbs', 40,
            'fat', 15,
            'fiber', 6
          );
      END CASE;

      -- Update nutrition in meal object
      meal_obj := jsonb_set(meal_obj, '{nutrition}', nutrition);
      updated_meals := updated_meals || jsonb_build_array(meal_obj);
    END LOOP;

    -- Calculate total daily calories and macros
    DECLARE
      total_calories INT := 0;
      total_protein INT := 0;
      total_carbs INT := 0;
      total_fat INT := 0;
    BEGIN
      FOR i IN 0..(jsonb_array_length(updated_meals) - 1) LOOP
        total_calories := total_calories + (updated_meals->i->'nutrition'->>'calories')::INT;
        total_protein := total_protein + (updated_meals->i->'nutrition'->>'protein')::INT;
        total_carbs := total_carbs + (updated_meals->i->'nutrition'->>'carbs')::INT;
        total_fat := total_fat + (updated_meals->i->'nutrition'->>'fat')::INT;
      END LOOP;

      -- Update the meal plan with new meals and daily calorie target
      UPDATE trainer_meal_plans
      SET
        meal_plan_data = jsonb_set(
          jsonb_set(
            plan_record.meal_plan_data,
            '{meals}',
            updated_meals
          ),
          '{dailyCalorieTarget}',
          to_jsonb(total_calories)
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = plan_record.id;

      RAISE NOTICE 'Updated meal plan %: % meals, % total calories',
        plan_record.id,
        jsonb_array_length(updated_meals),
        total_calories;
    END;
  END LOOP;

  RAISE NOTICE 'Meal plan nutrition update complete!';
END $$;

-- Verify the update
SELECT
  id,
  meal_plan_data->>'planName' as plan_name,
  meal_plan_data->>'dailyCalorieTarget' as daily_calories,
  jsonb_array_length(meal_plan_data->'meals') as meal_count,
  meal_plan_data->'meals'->0->'nutrition' as first_meal_nutrition
FROM trainer_meal_plans
WHERE meal_plan_data->>'creationMethod' = 'manual'
   OR meal_plan_data->>'isManual' = 'true'
LIMIT 5;
