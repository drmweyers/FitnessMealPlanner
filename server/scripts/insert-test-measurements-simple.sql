-- ==========================================
-- Insert Test Measurement Data for Customer Test Account
-- ==========================================
-- Customer ID: d241295e-3d34-451c-9585-01e47b112374
-- This script creates comprehensive measurement data showing weight loss
-- progress over 90 days with realistic fluctuations and body composition changes.

-- First, clean up any existing measurements for this customer
DELETE FROM progress_measurements WHERE customer_id = 'd241295e-3d34-451c-9585-01e47b112374';

-- Insert measurements (individual INSERT statements for reliability)

-- Day 1 - Starting measurements
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '90 days', 90.70, 200.0, 40.5, 125.0, 110.0, 95.0, 110.0, 32.0, 32.2, 65.0, 65.2, 38.5, 38.7, 25.5, 65.5, 'Starting my fitness journey! Excited to see progress over the next few months.');

-- Day 4 - Early adjustment
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '87 days', 90.30, 199.1, 40.4, 124.8, 109.8, 94.5, 109.8, 32.0, 32.1, 64.8, 65.0, 38.4, 38.6, 25.3, 65.8, 'Started meal plan this week. Already feeling more energetic!');

-- Day 7 - One week in
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '84 days', 89.80, 197.9, 40.2, 124.5, 109.5, 94.0, 109.5, 31.8, 32.0, 64.5, 64.8, 38.2, 38.4, 25.0, 66.0, 'One week completed! Waist already feels looser. Loving the new recipes.');

-- Day 10 - Small plateau
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '81 days', 89.90, 198.1, 40.2, 124.4, 109.4, 93.8, 109.4, 31.8, 31.9, 64.4, 64.7, 38.2, 38.4, 24.9, 66.1, 'Weight went up slightly but feeling stronger. Must be muscle gain!');

-- Day 13 - Back on track
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '78 days', 89.40, 197.0, 40.0, 124.2, 109.0, 93.5, 109.0, 31.7, 31.8, 64.2, 64.5, 38.0, 38.2, 24.7, 66.3, 'Back on the downward trend. Added more cardio this week.');

-- Day 16 - Steady progress
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '75 days', 88.90, 195.9, 39.8, 124.0, 108.8, 93.0, 108.8, 31.6, 31.7, 64.0, 64.3, 37.9, 38.1, 24.5, 66.5, 'Loving how my clothes are fitting! Energy levels through the roof.');

-- Day 19 - Great progress
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '72 days', 88.60, 195.2, 39.7, 123.8, 108.5, 92.5, 108.5, 31.5, 31.6, 63.8, 64.1, 37.8, 38.0, 24.2, 66.8, 'Almost 5 pounds down! People are starting to notice the change.');

-- Day 22 - Motivation boost
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '69 days', 88.20, 194.4, 39.5, 123.5, 108.2, 92.0, 108.2, 31.4, 31.5, 63.5, 63.8, 37.7, 37.9, 24.0, 67.0, 'Trainer says my posture is improving. Core feels much stronger.');

-- Day 25 - One month milestone
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '66 days', 87.80, 193.5, 39.3, 123.2, 108.0, 91.5, 107.8, 31.3, 31.4, 63.3, 63.6, 37.5, 37.7, 23.8, 67.2, 'One month in! Down 6.5 lbs and feeling amazing. This is sustainable!');

-- Day 28 - Small fluctuation
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '63 days', 88.00, 194.0, 39.4, 123.3, 108.1, 91.7, 107.9, 31.3, 31.4, 63.4, 63.7, 37.6, 37.8, 23.9, 67.1, 'Slight increase after weekend celebration. Back to routine tomorrow!');

-- Day 31 - Getting back
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '60 days', 87.60, 193.1, 39.2, 123.0, 107.8, 91.2, 107.6, 31.2, 31.3, 63.1, 63.4, 37.4, 37.6, 23.6, 67.4, 'Back on track after the weekend. Consistency is key!');

-- Day 34 - Strong week
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '57 days', 87.20, 192.2, 39.0, 122.8, 107.5, 90.8, 107.3, 31.1, 31.2, 62.8, 63.1, 37.2, 37.4, 23.4, 67.6, 'Best week yet! Increased weights in all my exercises.');

-- Day 37 - Halfway point approaching
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '54 days', 86.80, 191.3, 38.8, 122.5, 107.2, 90.4, 107.0, 31.0, 31.1, 62.6, 62.9, 37.1, 37.3, 23.2, 67.8, 'Almost 9 pounds down! Biceps are definitely getting more defined.');

-- Day 40 - Feeling strong
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '51 days', 86.50, 190.6, 38.6, 122.2, 107.0, 90.0, 106.8, 30.9, 31.0, 62.4, 62.7, 37.0, 37.2, 23.0, 68.0, 'Strength gains are incredible. Love seeing these changes!');

-- Day 43 - Plateau phase
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '48 days', 86.60, 190.8, 38.6, 122.1, 106.9, 89.8, 106.7, 30.9, 31.0, 62.3, 62.6, 37.0, 37.2, 22.9, 68.1, 'Weight stable but body composition improving. Muscle weighs more than fat!');

-- Day 46 - Breaking through
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '45 days', 86.20, 190.0, 38.4, 121.8, 106.6, 89.5, 106.4, 30.8, 30.9, 62.1, 62.4, 36.9, 37.1, 22.7, 68.3, 'Plateau broken! New personal records in the gym this week.');

-- Day 49 - Momentum building
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '42 days', 85.80, 189.1, 38.2, 121.5, 106.3, 89.0, 106.0, 30.7, 30.8, 61.8, 62.1, 36.7, 36.9, 22.5, 68.5, 'Momentum is building! 11 pounds down and feeling fantastic.');

-- Day 52 - Midpoint celebration
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '39 days', 85.40, 188.2, 38.0, 121.2, 106.0, 88.5, 105.7, 30.6, 30.7, 61.6, 61.9, 36.6, 36.8, 22.3, 68.7, 'Halfway to my goal! This journey has been life-changing.');

-- Day 55 - Steady decline
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '36 days', 85.10, 187.5, 37.8, 121.0, 105.8, 88.2, 105.5, 30.5, 30.6, 61.4, 61.7, 36.5, 36.7, 22.1, 68.9, 'Love my new energy levels. Sleep quality has improved so much!');

-- Day 58 - Great results
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '33 days', 84.70, 186.6, 37.6, 120.7, 105.5, 87.8, 105.2, 30.4, 30.5, 61.1, 61.4, 36.3, 36.5, 21.9, 69.1, 'Down to 186! My trainer says my form has improved dramatically.');

-- Day 61 - Strong finish approaching
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '30 days', 84.40, 186.0, 37.5, 120.5, 105.2, 87.5, 104.9, 30.3, 30.4, 60.9, 61.2, 36.2, 36.4, 21.7, 69.3, 'One month left! Excited to see how much more I can achieve.');

-- Day 64 - Final push
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '27 days', 84.00, 185.1, 37.3, 120.2, 104.9, 87.0, 104.6, 30.2, 30.3, 60.7, 61.0, 36.0, 36.2, 21.5, 69.5, 'In the final stretch! Muscle definition is really showing now.');

-- Day 67 - Excellent progress
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '24 days', 83.60, 184.2, 37.1, 119.9, 104.6, 86.5, 104.3, 30.1, 30.2, 60.4, 60.7, 35.9, 36.1, 21.3, 69.7, 'Almost 16 pounds down! This has exceeded all my expectations.');

-- Day 70 - Home stretch
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '21 days', 83.30, 183.5, 36.9, 119.6, 104.3, 86.2, 104.0, 30.0, 30.1, 60.2, 60.5, 35.8, 36.0, 21.1, 69.9, 'Three weeks to go! Feeling stronger than ever before.');

-- Day 73 - Consistent results
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '18 days', 82.90, 182.6, 36.7, 119.3, 104.0, 85.8, 103.7, 29.9, 30.0, 60.0, 60.3, 35.6, 35.8, 20.9, 70.1, 'Consistency pays off! Love the person I''m becoming.');

-- Day 76 - Nearly there
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '15 days', 82.60, 182.0, 36.5, 119.0, 103.7, 85.5, 103.4, 29.8, 29.9, 59.7, 60.0, 35.5, 35.7, 20.7, 70.3, 'So close to my goal! The journey has been incredible.');

-- Day 79 - Final sprint
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '12 days', 82.20, 181.1, 36.3, 118.7, 103.4, 85.0, 103.1, 29.7, 29.8, 59.5, 59.8, 35.3, 35.5, 20.5, 70.5, 'Final sprint to the finish line! Feeling so proud of my progress.');

-- Day 82 - Amazing transformation
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '9 days', 81.90, 180.5, 36.1, 118.4, 103.1, 84.7, 102.8, 29.6, 29.7, 59.3, 59.6, 35.2, 35.4, 20.3, 70.7, 'Under 181! The transformation photos are going to be amazing.');

-- Day 85 - Goal within reach
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '6 days', 81.60, 179.8, 35.9, 118.1, 102.8, 84.3, 102.5, 29.5, 29.6, 59.0, 59.3, 35.0, 35.2, 20.1, 70.9, 'Goal weight almost reached! This program has changed my life.');

-- Day 88 - Victory lap
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW() - INTERVAL '3 days', 81.30, 179.2, 35.7, 117.8, 102.5, 84.0, 102.2, 29.4, 29.5, 58.8, 59.1, 34.9, 35.1, 19.9, 71.1, 'Almost there! Planning my maintenance strategy with my trainer.');

-- Day 91 - GOAL ACHIEVED!
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_left_cm, calf_right_cm, body_fat_percentage, muscle_mass_kg, notes) VALUES ('d241295e-3d34-451c-9585-01e47b112374', NOW(), 81.60, 180.0, 35.8, 117.9, 102.6, 84.2, 102.3, 29.4, 29.5, 58.9, 59.2, 34.9, 35.1, 20.0, 71.0, 'GOAL ACHIEVED! 20 pounds lost in 90 days! Ready for the maintenance phase. This journey has taught me so much about myself and what I''m capable of. Grateful for every step of this transformation!');

-- Verify the data was inserted correctly
SELECT
    measurement_date::date as date,
    weight_lbs,
    waist_cm,
    body_fat_percentage,
    muscle_mass_kg,
    LEFT(notes, 50) || '...' as notes_preview
FROM progress_measurements
WHERE customer_id = 'd241295e-3d34-451c-9585-01e47b112374'
ORDER BY measurement_date;

-- Summary statistics
SELECT
    COUNT(*) as total_measurements,
    MIN(weight_lbs) as min_weight,
    MAX(weight_lbs) as max_weight,
    ROUND(MAX(weight_lbs) - MIN(weight_lbs), 1) as total_weight_loss,
    MIN(body_fat_percentage) as min_body_fat,
    MAX(body_fat_percentage) as max_body_fat,
    ROUND(MAX(body_fat_percentage) - MIN(body_fat_percentage), 1) as body_fat_reduction,
    MIN(waist_cm) as min_waist,
    MAX(waist_cm) as max_waist,
    ROUND(MAX(waist_cm) - MIN(waist_cm), 1) as waist_reduction_cm
FROM progress_measurements
WHERE customer_id = 'd241295e-3d34-451c-9585-01e47b112374';