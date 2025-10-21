-- Create Progress Tracking Tables
-- Based on schema.ts definitions

-- Progress Measurements Table
CREATE TABLE IF NOT EXISTS progress_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measurement_date TIMESTAMP NOT NULL,

  -- Weight tracking
  weight_kg DECIMAL(5, 2),  -- Up to 999.99 kg
  weight_lbs DECIMAL(6, 2), -- Up to 9999.99 lbs

  -- Body measurements in centimeters
  chest_cm DECIMAL(5, 2),
  waist_cm DECIMAL(5, 2),
  hips_cm DECIMAL(5, 2),
  thigh_cm DECIMAL(5, 2),
  bicep_cm DECIMAL(5, 2),

  -- Additional metrics
  body_fat_percentage DECIMAL(4, 2),
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for progress_measurements
CREATE INDEX IF NOT EXISTS progress_measurements_customer_id_idx ON progress_measurements(customer_id);
CREATE INDEX IF NOT EXISTS progress_measurements_date_idx ON progress_measurements(measurement_date);

-- Progress Photos Table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  photo_date TIMESTAMP NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50) NOT NULL, -- front, side, back, other
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for progress_photos
CREATE INDEX IF NOT EXISTS progress_photos_customer_id_idx ON progress_photos(customer_id);
CREATE INDEX IF NOT EXISTS progress_photos_date_idx ON progress_photos(photo_date);

-- Customer Goals Table
CREATE TABLE IF NOT EXISTS customer_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  goal_type VARCHAR(50) NOT NULL, -- weight_loss, muscle_gain, body_fat, performance
  goal_name VARCHAR(255) NOT NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  current_value DECIMAL(10, 2),
  target_date TIMESTAMP,
  progress_percentage INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' NOT NULL, -- active, achieved, abandoned
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for customer_goals
CREATE INDEX IF NOT EXISTS customer_goals_customer_id_idx ON customer_goals(customer_id);

-- Seed test measurements for customer.test@evofitmeals.com
INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, chest_cm, waist_cm, hips_cm, body_fat_percentage, notes)
SELECT
  u.id,
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  75.5,
  166.4,
  95.0,
  82.0,
  98.0,
  18.5,
  'Initial baseline measurement'
FROM users u
WHERE u.email = 'customer.test@evofitmeals.com'
ON CONFLICT DO NOTHING;

INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, chest_cm, waist_cm, hips_cm, body_fat_percentage, notes)
SELECT
  u.id,
  CURRENT_TIMESTAMP - INTERVAL '15 days',
  74.2,
  163.6,
  94.5,
  80.5,
  97.0,
  17.8,
  'Two-week progress check'
FROM users u
WHERE u.email = 'customer.test@evofitmeals.com'
ON CONFLICT DO NOTHING;

INSERT INTO progress_measurements (customer_id, measurement_date, weight_kg, weight_lbs, chest_cm, waist_cm, hips_cm, body_fat_percentage, notes)
SELECT
  u.id,
  CURRENT_TIMESTAMP,
  72.8,
  160.5,
  94.0,
  79.0,
  96.0,
  16.9,
  'Current measurement - great progress!'
FROM users u
WHERE u.email = 'customer.test@evofitmeals.com'
ON CONFLICT DO NOTHING;

-- Seed test goal
INSERT INTO customer_goals (customer_id, goal_type, goal_name, target_value, current_value, target_date, progress_percentage, status, notes)
SELECT
  u.id,
  'weight_loss',
  'Reach target weight',
  70.0,
  72.8,
  CURRENT_TIMESTAMP + INTERVAL '60 days',
  51, -- ((75.5 - 72.8) / (75.5 - 70.0)) * 100
  'active',
  'Making excellent progress towards goal weight of 70kg'
FROM users u
WHERE u.email = 'customer.test@evofitmeals.com'
ON CONFLICT DO NOTHING;

-- Verify tables created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('progress_measurements', 'progress_photos', 'customer_goals')
ORDER BY table_name;

-- Verify test data inserted
SELECT
  'progress_measurements' as table_name,
  COUNT(*) as record_count
FROM progress_measurements
WHERE customer_id = (SELECT id FROM users WHERE email = 'customer.test@evofitmeals.com')

UNION ALL

SELECT
  'customer_goals' as table_name,
  COUNT(*) as record_count
FROM customer_goals
WHERE customer_id = (SELECT id FROM users WHERE email = 'customer.test@evofitmeals.com');
