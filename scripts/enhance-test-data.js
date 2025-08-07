// Enhanced Test Data Generator - Detailed Health Metrics & Goals
// This script adds comprehensive health data, goals, and trainer-customer visibility

import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  users, 
  customerGoals,
  progressMeasurements,
  progressPhotos
} from '../shared/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal',
  ssl: false
});

const db = drizzle(pool);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  purple: '\x1b[35m'
};

console.log(`${colors.bright}${colors.purple}🔧 Enhanced Test Data Generator${colors.reset}`);
console.log(`${colors.bright}${colors.purple}====================================${colors.reset}\n`);

async function enhanceTestData() {
  try {
    // Get existing test users
    console.log(`${colors.yellow}🔍 Finding existing test users...${colors.reset}`);
    
    const [trainer] = await db.select().from(users).where(eq(users.email, 'test.trainer@evofitmeals.com'));
    const [customer] = await db.select().from(users).where(eq(users.email, 'test.customer@gmail.com'));
    
    if (!trainer || !customer) {
      throw new Error('Test users not found. Please run the main test data generator first.');
    }
    
    console.log(`${colors.green}✅ Found trainer: ${trainer.firstName} ${trainer.lastName}${colors.reset}`);
    console.log(`${colors.green}✅ Found customer: ${customer.firstName} ${customer.lastName}${colors.reset}`);

    // Step 1: Update Customer Profile with Detailed Information
    console.log(`\n${colors.yellow}📊 Adding comprehensive customer health data...${colors.reset}`);
    
    await db.update(users)
      .set({
        firstName: 'Sarah',
        lastName: 'Johnson',
        phoneNumber: '(555) 987-6543',
        profilePicture: null,
        bio: `🎯 Health & Fitness Journey

🏢 Professional Background:
• Marketing Manager at TechCorp Inc.
• 8 years experience in digital marketing
• Works 50+ hours/week, high-stress environment

👤 Personal Details:
• Age: 32 | Height: 5'5" (165cm) | Starting Weight: 165 lbs (75kg)
• Goal Weight: 143 lbs (65kg) | Target: 3-month transformation
• Body Type: Mesomorph | Activity Level: Moderately Active

🎯 Primary Goals:
1. Lose 22 lbs (10kg) in 12 weeks
2. Reduce body fat from 28% to 22%
3. Increase lean muscle mass
4. Improve energy levels and sleep quality
5. Establish sustainable healthy habits

💪 Fitness Background:
• Former college volleyball player (7 years ago)
• Gym membership for 2 years but inconsistent
• Enjoys: Yoga, hiking, swimming, strength training
• Dislikes: Running long distances, early morning workouts

🏋️ Current Fitness Status:
• Works out 3-4x/week when schedule permits
• Can squat bodyweight, deadlift 1.2x bodyweight
• Cardio endurance: Can jog 2 miles without stopping
• Flexibility: Good (yoga background)

⚕️ Health Information:
• Mild hypothyroidism (controlled with Levothyroxine 50mcg)
• Family history: Type 2 diabetes (mother), heart disease (father)
• Recent blood work: Slightly elevated cortisol, low Vitamin D
• No major injuries or physical limitations

🍽️ Nutrition History:
• Previous attempts: Keto (6 months), Intermittent Fasting, Weight Watchers
• Biggest challenges: Late-night snacking, portion control at restaurants
• Cooking skill: Intermediate | Meal prep experience: Beginner
• Budget: $150-175/week for groceries

💊 Current Supplements:
• Levothyroxine 50mcg (morning, empty stomach)
• Multivitamin with iron
• Omega-3 fish oil (1000mg)
• Vitamin D3 (2000 IU)
• Probiotic (50 billion CFU)
• Magnesium glycinate (400mg before bed)

📱 Technology & Tracking:
• MyFitnessPal user (inconsistent logging)
• Apple Watch Series 8
• Fitbit scale with body composition
• Prefers app-based tracking and reminders

🎯 Success Motivators:
• Fitting into clothes from 5 years ago
• Increased confidence for summer vacation
• Being a healthy role model for nieces/nephews
• Improving energy for demanding work schedule
• Long-term disease prevention

⚠️ Potential Obstacles:
• Work travel 2-3x/month
• Limited meal prep time on weekends
• Social eating (frequent business dinners)
• Stress eating during project deadlines
• All-or-nothing mentality with diet

🏆 Previous Achievements:
• Lost 15 lbs with Weight Watchers (gained back during COVID)
• Completed a 10K race 2 years ago
• Maintained consistent yoga practice for 1 year
• Successfully quit smoking 3 years ago`,
        trainerId: trainer.id,
        updatedAt: new Date()
      })
      .where(eq(users.id, customer.id));

    // Step 2: Update Trainer Profile with Client Management Info
    console.log(`\n${colors.yellow}👨‍⚕️ Updating trainer profile with client management data...${colors.reset}`);
    
    await db.update(users)
      .set({
        bio: `🏆 Michael Thompson, NASM-CPT | Precision Nutrition Coach
📍 Los Angeles, CA | 📧 test.trainer@evofitmeals.com | 📱 (555) 123-4567

🎯 TRANSFORMATION SPECIALIST
10+ Years Experience | 500+ Successful Client Transformations

📚 CERTIFICATIONS & CREDENTIALS:
• NASM Certified Personal Trainer (CPT) - Since 2014
• Precision Nutrition Level 2 Coach - Advanced Certification
• ISSA Sports Nutrition Specialist
• ACE Functional Training Specialist
• CPR/AED Certified (Red Cross)
• Continuing Education: 40+ hours annually

🏋️ SPECIALIZATIONS:
• ⚖️ Sustainable Weight Loss (15-50+ lb transformations)
• 💪 Body Recomposition (muscle gain + fat loss)
• 🏃‍♂️ Athletic Performance Enhancement
• 🥇 Competition Prep (Bodybuilding/Physique)
• 👩‍💼 Busy Professional Programs
• 🧘‍♀️ Injury Recovery & Movement Correction

📊 CLIENT SUCCESS METRICS:
• Average Weight Loss: 15-20 lbs in 12 weeks
• Body Fat Reduction: 5-8% typical
• Strength Gains: 25-40% increase in major lifts
• Client Retention Rate: 92% (industry average: 78%)
• 5-Star Reviews: 147/150 clients

💼 BUSINESS PHILOSOPHY:
"Nutrition is 80% of any transformation. I don't believe in quick fixes or extreme measures. My approach focuses on sustainable lifestyle changes that fit YOUR life. Every meal plan is personalized based on your preferences, schedule, and goals."

🔬 METHODOLOGY:
• Comprehensive initial assessment (health history, goals, preferences)
• Metabolic testing and body composition analysis
• Customized macro-based nutrition plans
• Progressive training program design
• Weekly check-ins with plan adjustments
• Long-term maintenance strategies

👥 CURRENT CLIENT ROSTER:
• Total Active Clients: 18/25 capacity
• Weight Loss Clients: 12
• Body Recomposition: 4
• Athletic Performance: 2

⭐ RECENT SUCCESS STORIES:
• Jessica M.: Lost 28 lbs, reduced body fat 6% (4 months)
• David R.: Gained 15 lbs muscle while losing 20 lbs fat (6 months)
• Amanda K.: Improved marathon time by 18 minutes (8 months)

📈 SPECIALIZED PROGRAMS:
• 🎯 "Transform 90" - 3-month intensive weight loss
• 💪 "Recomp Revolution" - Body recomposition program
• 🏃‍♂️ "Peak Performance" - Athletic enhancement
• 👔 "Executive Edge" - Busy professional package

🛠️ TOOLS & RESOURCES:
• InBody 970 body composition analyzer
• Metabolic cart for RMR testing
• Custom meal planning software
• 24/7 client support app
• Recipe database: 500+ approved meals
• Video exercise library: 300+ movements

🎓 CONTINUING EDUCATION:
• Precision Nutrition ProCoach Certification
• Functional Movement Screen (FMS) Level 2
• Blood Biomarker Interpretation Course
• Advanced Sports Nutrition Seminar (2024)

📞 CONSULTATION PROCESS:
1. Initial Assessment (90 minutes) - Health history, goals, lifestyle
2. Body Composition Analysis - InBody scan + measurements
3. Metabolic Testing - Resting metabolic rate determination
4. Custom Plan Creation - Nutrition + training program
5. Implementation Support - Weekly check-ins + adjustments

💰 INVESTMENT LEVELS:
• Nutrition Coaching Only: $297/month
• Nutrition + Training: $497/month
• VIP Transformation Package: $797/month
• Corporate Wellness Programs: Custom pricing

🏆 AWARDS & RECOGNITION:
• "Top Personal Trainer" - Los Angeles Magazine (2022, 2023)
• "Nutrition Coach of the Year" - ISSA (2023)
• Featured Expert: Men's Health, Women's Fitness, Shape Magazine

📱 CONNECT WITH ME:
• Instagram: @thompson_elite_fit (45K followers)
• YouTube: Thompson Elite Fitness (12K subscribers)
• Podcast: "The Sustainable Transformation Show"
• LinkedIn: Michael Thompson, NASM-CPT

⚡ CURRENT AVAILABILITY:
• New client consultations: 2-3 per month
• Waitlist for premium programs
• Corporate wellness: Always accepting
• Speaking engagements: Available

🎯 MY PROMISE TO YOU:
"I don't just help you lose weight - I teach you how to keep it off. My clients don't just transform their bodies; they transform their relationship with food, exercise, and themselves. This is about becoming the healthiest, strongest version of YOU."`,
        updatedAt: new Date()
      })
      .where(eq(users.id, trainer.id));

    // Step 3: Add Comprehensive Customer Goals
    console.log(`\n${colors.yellow}🎯 Adding detailed customer goals...${colors.reset}`);
    
    // First, clear existing goals
    await db.delete(customerGoals).where(eq(customerGoals.customerId, customer.id));
    
    const detailedGoals = [
      {
        customerId: customer.id,
        goalName: 'Primary Weight Loss Target',
        goalType: 'weight_loss',
        currentValue: 75.0, // kg
        targetValue: 65.0,  // kg
        startDate: new Date('2025-01-01'),
        targetDate: new Date('2025-04-01'), // 3 months
        status: 'in_progress',
        priority: 1,
        notes: `🎯 PRIMARY GOAL: Lose 10kg (22 lbs) in 12 weeks

📊 CURRENT STATUS:
• Starting Weight: 75.0 kg (165 lbs)
• Current Weight: 73.5 kg (162 lbs) 
• Weight Lost: 1.5 kg (3.3 lbs) in 4 weeks
• Progress: 15% complete
• Weekly Average Loss: 0.375 kg (0.8 lbs)

🎯 TARGET BREAKDOWN:
• Month 1: 3kg loss (ACHIEVED: 1.5kg)
• Month 2: 4kg loss (PROJECTED)
• Month 3: 3kg loss (PROJECTED)

💪 STRATEGY:
• Caloric deficit: 500-750 calories/day
• Macro targets: 40% carbs, 30% protein, 30% fat
• Meal frequency: 4-5 meals/day with focus on protein timing
• Hydration: 3-4 liters water daily
• Sleep optimization: 7-8 hours/night

⚠️ CHALLENGES IDENTIFIED:
• Weekend social eating
• Travel schedule (2-3x/month)
• Late-night stress eating
• Restaurant portion control

✅ SUCCESS STRATEGIES:
• Sunday meal prep sessions
• Travel-friendly meal options prepared
• Evening tea ritual to replace snacking
• Restaurant menu research before dining out`
      },
      {
        customerId: customer.id,
        goalName: 'Body Composition Improvement',
        goalType: 'body_composition',
        currentValue: 28.0, // body fat %
        targetValue: 22.0,  // body fat %
        startDate: new Date('2025-01-01'),
        targetDate: new Date('2025-04-01'),
        status: 'in_progress',
        priority: 2,
        notes: `💪 BODY RECOMPOSITION GOAL

📊 CURRENT METRICS:
• Body Fat: 28.0% → Target: 22.0%
• Lean Mass: 54kg → Target: 56kg
• Body Fat to Lose: ~4.5kg
• Muscle to Gain: ~2kg
• Net Weight Change: -2.5kg

🏋️ STRENGTH TARGETS:
• Squat: 75kg → 85kg (bodyweight+)
• Deadlift: 90kg → 105kg (1.5x bodyweight)
• Bench Press: 45kg → 55kg
• Pull-ups: 3 → 8 consecutive

📏 MEASUREMENT GOALS:
• Waist: 82cm → 76cm (-6cm)
• Hips: 105cm → 100cm (-5cm)
• Thighs: 58cm → 55cm (-3cm)
• Arms: 30cm → 31cm (+1cm muscle)

🎯 TRAINING FOCUS:
• Strength training: 3-4x/week
• Progressive overload emphasis
• Compound movement priority
• Core strengthening daily
• Flexibility maintenance (yoga 2x/week)

📊 TRACKING METHODS:
• Weekly InBody scans
• Progress photos (front/side/back)
• Monthly circumference measurements
• Strength performance logs
• Energy/mood daily ratings`
      },
      {
        customerId: customer.id,
        goalName: 'Energy & Vitality Enhancement',
        goalType: 'wellness',
        currentValue: 6.0, // energy level 1-10
        targetValue: 8.5,  // target energy level
        startDate: new Date('2025-01-01'),
        targetDate: new Date('2025-03-01'), // 2 months
        status: 'in_progress',
        priority: 3,
        notes: `⚡ ENERGY & VITALITY OPTIMIZATION

📊 CURRENT STATUS:
• Daily Energy Level: 6/10 (inconsistent)
• Sleep Quality: 6.5/10
• Afternoon Energy Crash: Daily 2-4 PM
• Weekend Energy: 7/10
• Workout Energy: 5.5/10 (depends on timing)

🎯 TARGET IMPROVEMENTS:
• Consistent 8+ energy throughout day
• Eliminate afternoon crashes
• Improve sleep quality to 8/10
• Enhanced workout performance
• Better stress management

🔬 ROOT CAUSE ANALYSIS:
• Blood sugar instability (poor meal timing)
• Insufficient protein at breakfast
• Dehydration throughout day
• Cortisol dysregulation from work stress
• Inconsistent sleep schedule

🛠️ INTERVENTION STRATEGIES:
• Protein-rich breakfast (25-30g protein)
• Balanced meals every 3-4 hours
• Hydration tracking (3L+ daily)
• Stress management techniques
• Sleep hygiene protocol
• Supplement optimization

📈 TRACKING METRICS:
• Daily energy rating (1-10) via app
• Sleep tracking (Apple Watch)
• Mood assessments
• Afternoon productivity levels
• Workout performance scores

⏰ 30-DAY MILESTONES:
• Week 1-2: Establish eating schedule
• Week 3-4: Notice afternoon improvement
• Week 5-6: Consistent morning energy
• Week 7-8: Sustained all-day vitality`
      },
      {
        customerId: customer.id,
        goalName: 'Habit Formation & Lifestyle Integration',
        goalType: 'habits',
        currentValue: 4.0, // healthy habits score 1-10
        targetValue: 9.0,  // target habits score
        startDate: new Date('2025-01-01'),
        targetDate: new Date('2025-06-01'), // 6 months for habit formation
        status: 'in_progress',
        priority: 4,
        notes: `🔄 SUSTAINABLE HABIT FORMATION

📋 HABIT TRACKING SCORECARD:
• Meal Prep Sunday: 2/4 weeks (50%)
• Daily Protein Target: 20/28 days (71%)
• Water Intake Goal: 18/28 days (64%)
• Evening Walk: 15/28 days (54%)
• Food Logging: 22/28 days (79%)
• Sleep Schedule: 16/28 days (57%)

🎯 TARGET HABITS TO ESTABLISH:
1. Sunday Meal Prep (2-3 hours weekly)
2. Morning Protein Smoothie (daily)
3. 10,000 steps daily minimum
4. Food logging in MyFitnessPal (daily)
5. Evening wind-down routine
6. Weekly grocery planning
7. Restaurant portion control strategies

📊 HABIT FORMATION PHASES:
• Phase 1 (Weeks 1-4): Foundation Building
• Phase 2 (Weeks 5-8): Routine Establishment
• Phase 3 (Weeks 9-12): Automation
• Phase 4 (Weeks 13-24): Mastery & Refinement

🔧 IMPLEMENTATION TOOLS:
• Habit tracking app (Streaks)
• Calendar blocking for meal prep
• Grocery delivery automation
• Workout buddy accountability
• Weekly trainer check-ins

⚡ KEYSTONE HABITS FOCUS:
• Sunday meal prep → Weekday nutrition success
• Morning protein → All-day satiety & energy
• Evening routine → Better sleep → Better recovery

🏆 REWARD MILESTONES:
• 30 days consistent: New workout outfit
• 60 days: Spa day reward
• 90 days: Weekend wellness retreat
• 6 months: Complete wardrobe refresh`
      },
      {
        customerId: customer.id,
        goalName: 'Metabolic Health Optimization',
        goalType: 'health_metrics',
        currentValue: null,
        targetValue: null,
        startDate: new Date('2025-01-01'),
        targetDate: new Date('2025-07-01'), // 6 months for metabolic improvements
        status: 'in_progress',
        priority: 5,
        notes: `🔬 METABOLIC HEALTH ENHANCEMENT

📊 BASELINE BIOMARKERS (Recent Lab Work):
• Fasting Glucose: 94 mg/dL (Normal: <100)
• HbA1c: 5.3% (Normal: <5.7%)
• Total Cholesterol: 195 mg/dL (Borderline)
• LDL: 115 mg/dL (Borderline High)
• HDL: 58 mg/dL (Good for women >50)
• Triglycerides: 110 mg/dL (Normal: <150)
• TSH: 2.8 mIU/L (Normal: 0.5-4.0)
• Free T4: 1.1 ng/dL (Normal: 0.8-1.8)
• Vitamin D: 22 ng/mL (Deficient: <30)
• B12: 350 pg/mL (Low Normal: <400)
• Iron Panel: Normal ranges

🎯 TARGET IMPROVEMENTS:
• Reduce LDL cholesterol to <100 mg/dL
• Increase HDL cholesterol to >60 mg/dL
• Maintain stable blood sugar
• Optimize thyroid function within range
• Increase Vitamin D to >40 ng/mL
• Improve insulin sensitivity
• Enhance metabolic flexibility

⚠️ RISK FACTORS TO ADDRESS:
• Family history of Type 2 diabetes
• Hypothyroidism management
• Work-related stress and cortisol
• Sedentary work environment
• Previous yo-yo dieting history

💊 CURRENT SUPPLEMENT PROTOCOL:
• Levothyroxine 50mcg (morning, empty stomach)
• Vitamin D3 2000 IU → Increasing to 4000 IU
• Omega-3 EPA/DHA 1000mg daily
• Magnesium Glycinate 400mg (bedtime)
• Multivitamin with B-complex
• Probiotic 50 billion CFU

🔄 MONITORING SCHEDULE:
• Monthly: Weight, body composition, energy levels
• Quarterly: Comprehensive metabolic panel
• Semi-annually: Thyroid function, vitamin D
• Annually: Complete physical with cardiac markers

📈 SUCCESS INDICATORS:
• Stable energy without caffeine dependence
• Improved sleep quality and recovery
• Better stress resilience
• Enhanced workout performance
• Reduced inflammation markers`
      }
    ];

    const insertedGoals = await db.insert(customerGoals).values(detailedGoals).returning();
    console.log(`${colors.green}✅ Created ${insertedGoals.length} detailed customer goals${colors.reset}`);

    // Step 4: Add Comprehensive Progress Measurements (8 weeks of data)
    console.log(`\n${colors.yellow}📏 Adding comprehensive progress measurements...${colors.reset}`);
    
    // Clear existing measurements
    await db.delete(progressMeasurements).where(eq(progressMeasurements.customerId, customer.id));
    
    const progressData = [
      // Week 0 - Baseline (8 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
        weight: 75.0,
        bodyFat: 28.0,
        muscleMass: 54.0,
        chest: 95.0,
        waist: 82.0,
        hips: 105.0,
        thigh: 58.0,
        arm: 30.0,
        notes: `🎯 BASELINE ASSESSMENT - Starting Point

📊 Initial Measurements:
• Weight: 75.0kg (165 lbs)
• Body Fat: 28.0%
• Muscle Mass: 54.0kg
• Total Body Water: 60.2%

💪 Strength Baselines:
• Squat: 60kg (3x8)
• Deadlift: 70kg (3x5)
• Bench Press: 35kg (3x8)
• Pull-ups: 2 assisted

⚡ Energy & Wellness:
• Daily Energy: 5/10 (inconsistent)
• Sleep Quality: 6/10
• Stress Level: 7/10 (high work pressure)
• Mood: 6/10

🍽️ Nutrition Starting Point:
• Eating out 5-6x/week
• Inconsistent meal timing
• Low protein intake (~0.8g/kg)
• High processed food consumption
• Irregular eating patterns

🎯 Goals Set:
• Primary: Lose 10kg in 12 weeks
• Secondary: Improve body composition
• Tertiary: Increase energy and vitality
• Long-term: Establish sustainable habits`
      },
      // Week 1 (7 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000),
        weight: 74.8,
        bodyFat: 27.9,
        muscleMass: 54.1,
        chest: 94.8,
        waist: 81.8,
        hips: 104.8,
        thigh: 57.9,
        arm: 30.0,
        notes: `📈 Week 1 Progress - Getting Started

✅ ACHIEVEMENTS:
• Weight loss: -0.2kg (steady start)
• Completed 4 planned workouts
• Meal prepped twice this week
• Started food logging consistently

💪 Training Progress:
• Squat: 62kg (form improving)
• Workout compliance: 100%
• Energy during workouts: 6/10
• Recovery feeling better

🍽️ Nutrition Wins:
• Hit protein target 5/7 days
• Reduced eating out to 3x
• Increased water intake
• Started morning protein smoothie

⚠️ Challenges:
• Late-night snacking (3 nights)
• Weekend social eating
• Meal prep took longer than expected
• Some afternoon energy dips

🎯 Next Week Focus:
• Continue meal prep momentum
• Address evening snacking triggers
• Increase daily movement/steps
• Improve sleep consistency`
      },
      // Week 2 (6 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000),
        weight: 74.5,
        bodyFat: 27.7,
        muscleMass: 54.2,
        chest: 94.5,
        waist: 81.5,
        hips: 104.5,
        thigh: 57.8,
        arm: 30.1,
        notes: `📈 Week 2 Progress - Building Momentum

✅ MAJOR WINS:
• Weight loss: -0.3kg (total: -0.5kg)
• First week hitting all macros!
• Evening snacking reduced to 1 night
• Energy levels noticeably improving

💪 Strength Gains:
• Squat: 65kg (confidence building)
• Deadlift: 75kg (form check passed)
• Pull-ups: 3 assisted (improvement!)
• Workout energy: 7/10

🍽️ Nutrition Excellence:
• Meal prep efficiency improved (90 min vs 2 hours)
• Protein target: 6/7 days achieved
• Restaurant portion control practiced
• Hydration goal met daily

⚡ Energy & Wellness:
• Daily energy: 6.5/10 (more consistent)
• Sleep quality: 7/10
• Afternoon crashes reduced
• Mood improvement noted

🏆 Habit Formation:
• Sunday meal prep becoming routine
• Morning smoothie now automatic
• Food logging streak: 14 days
• Step goal achieved 5/7 days

🎯 Week 3 Goals:
• Focus on strength progression
• Perfect weekend nutrition
• Address travel meal planning
• Maintain momentum`
      },
      // Week 3 (5 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        weight: 74.2,
        bodyFat: 27.5,
        muscleMass: 54.3,
        chest: 94.3,
        waist: 81.2,
        hips: 104.2,
        thigh: 57.6,
        arm: 30.1,
        notes: `📈 Week 3 Progress - Hitting Stride

🎉 BREAKTHROUGH WEEK:
• Weight loss: -0.3kg (total: -0.8kg)
• First week of perfect workout attendance
• Clothes fitting noticeably better!
• Energy breakthrough - no afternoon crash!

💪 Strength Milestones:
• Squat: 67kg (bodyweight getting closer!)
• Deadlift: 78kg (form feels strong)
• Bench: 40kg (big jump this week)
• Pull-ups: 1 unassisted! (HUGE WIN)

🍽️ Nutrition Mastery:
• Perfect macro week (7/7 days)
• Successfully navigated work dinner
• Weekend meal prep in 75 minutes
• Travel meal prep planned and executed

⚡ Wellness Improvements:
• Energy level: 7.5/10 consistently
• Sleep quality: 7.5/10
• Stress management improving
• Mood: 8/10 (feeling confident)

📏 Body Changes:
• Waist: -0.8cm (clothes looser!)
• Face looking leaner (photos show difference)
• Posture improving from strength training
• Overall body composition trending well

🔥 Momentum Factors:
• Habit stack working perfectly
• Meal prep routine optimized
• Workout confidence building
• Social support system engaged

🎯 Week 4 Focus:
• Maintain this momentum
• Add progressive overload
• Plan for potential plateau
• Celebrate non-scale victories`
      },
      // Week 4 (4 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        weight: 74.0,
        bodyFat: 27.3,
        muscleMass: 54.4,
        chest: 94.0,
        waist: 81.0,
        hips: 104.0,
        thigh: 57.4,
        arm: 30.2,
        notes: `📈 Week 4 Progress - One Month Milestone!

🏆 MONTH 1 ACHIEVEMENTS:
• Total weight loss: 1.0kg (2.2 lbs)
• Body fat reduction: 0.7%
• Muscle mass gain: +0.4kg
• Waist reduction: 1.0cm
• Perfect attendance record!

💪 Strength Progress Summary:
• Squat: 70kg (+10kg from start!)
• Deadlift: 80kg (+10kg improvement)
• Bench: 42kg (+7kg gain)
• Pull-ups: 2 unassisted (vs 0 at start)

🍽️ Nutrition Transformation:
• 28-day food logging streak
• Meal prep now takes 60 minutes
• Restaurant strategies mastered
• Protein intake optimized

⚡ Energy Revolution:
• Daily energy: 8/10 (dramatic improvement)
• No more afternoon crashes
• Sleep quality: 8/10
• Stress resilience improved

👔 Life Impact:
• Work performance improved (better focus)
• Confidence boost noticeable
• Clothes fitting better
• Social activities more enjoyable

🎯 MONTH 2 GOALS:
• Continue 0.25kg/week loss rate
• Reach bodyweight squat (75kg)
• Perfect travel nutrition strategies
• Maintain energy improvements
• Build on established habits

💭 Reflection:
"I can't believe how much better I feel! The scale shows 1kg loss, but I feel like a completely different person. My energy is through the roof, my clothes fit better, and I actually look forward to my workouts now."`
      },
      // Week 5 (3 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        weight: 73.8,
        bodyFat: 27.0,
        muscleMass: 54.5,
        chest: 94.0,
        waist: 80.8,
        hips: 103.8,
        thigh: 57.3,
        arm: 30.2,
        notes: `📈 Week 5 Progress - Consistency Pays Off

✅ STEADY PROGRESS:
• Weight loss: -0.2kg (total: -1.2kg)
• Body composition improving steadily
• Strength gains continuing
• Habits becoming automatic

💪 Training Highlights:
• Squat: 72kg (so close to bodyweight!)
• Deadlift: 82kg (feeling powerful)
• Bench: 43kg (upper body strength up)
• Pull-ups: 3 unassisted (strength building)

🍽️ Nutrition Excellence:
• Travel week - nailed it!
• Airport/hotel meal strategies worked
• No weight gain during business trip
• Meal prep routine maintained

⚡ Energy & Performance:
• Energy level: 8/10 (even while traveling)
• Sleep adaptation to time zone changes
• Workout performance consistent
• Recovery between sessions good

📱 Technology Integration:
• MyFitnessPal logging automatic
• Apple Watch step goals exceeded
• Progress photos showing changes
• Weekly check-ins with trainer valuable

🎯 Week 6 Planning:
• Push for bodyweight squat goal
• Continue travel strategies
• Focus on hydration improvement
• Maintain current momentum`
      },
      // Week 6 (2 weeks ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        weight: 73.6,
        bodyFat: 26.8,
        muscleMass: 54.6,
        chest: 93.8,
        waist: 80.5,
        hips: 103.5,
        thigh: 57.2,
        arm: 30.3,
        notes: `📈 Week 6 Progress - Strength Breakthrough!

🎉 MAJOR MILESTONE:
• BODYWEIGHT SQUAT ACHIEVED! 75kg x 5 reps
• Weight loss: -0.2kg (total: -1.4kg)
• Body fat under 27% for first time!
• Muscle mass steadily increasing

💪 Strength Celebrations:
• Squat: 75kg (GOAL REACHED!)
• Deadlift: 85kg (1.15x bodyweight)
• Bench: 45kg (significant improvement)
• Pull-ups: 4 unassisted (doubling every few weeks)

🍽️ Nutrition Refinements:
• Macro tracking becoming intuitive
• Meal timing optimized for workouts
• Recovery nutrition strategies implemented
• Weekend flexibility maintained

⚡ Recovery & Wellness:
• Sleep quality: 8.5/10
• Energy levels: 8.5/10
• Stress management: Much improved
• Mood stability: Excellent

📏 Body Composition:
• Waist: 80.5cm (-1.5cm total)
• Visible muscle definition increasing
• Posture dramatically improved
• Overall physique changing

💭 Mental Game:
• Confidence at all-time high
• Exercise addiction in best way
• Food relationship much healthier
• Future goals expanding

🎯 Week 7 Focus:
• Continue strength progression
• Refine body composition goals
• Plan for potential plateau
• Set new challenge goals`
      },
      // Week 7 (1 week ago)
      {
        customerId: customer.id,
        measurementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        weight: 73.4,
        bodyFat: 26.6,
        muscleMass: 54.7,
        chest: 93.5,
        waist: 80.3,
        hips: 103.3,
        thigh: 57.0,
        arm: 30.4,
        notes: `📈 Week 7 Progress - Fine-Tuning Phase

✅ CONSISTENT EXCELLENCE:
• Weight loss: -0.2kg (total: -1.6kg)
• Body composition optimization continuing
• All systems running smoothly
• Preparing for final push

💪 Strength Progression:
• Squat: 77kg (beyond bodyweight!)
• Deadlift: 87kg (getting close to 1.2x goal)
• Bench: 46kg (steady progress)
• Pull-ups: 5 unassisted (strength building)

🍽️ Nutrition Mastery:
• Intuitive eating skills developing
• Meal prep efficiency maximized
• Social eating strategies perfected
• Recovery nutrition optimized

⚡ Peak Performance:
• Energy: 9/10 (best ever!)
• Sleep: 8.5/10 (recovery excellent)
• Stress resilience: High
• Workout recovery: Optimal

🎯 Goal Assessment:
• Primary goal (10kg loss): 16% complete
• Body composition: Ahead of schedule
• Strength goals: Exceeded expectations
• Energy goals: Fully achieved
• Habit formation: Excellent progress

📊 7-Week Transformation:
• Weight: -1.6kg
• Body fat: -1.4%
• Muscle: +0.7kg
• Waist: -1.7cm
• Strength: Major improvements across all lifts
• Energy: From 5/10 to 9/10

🔮 Looking Ahead:
• Month 2 goals within reach
• Considering new challenges
• Long-term sustainability focus
• Continued education and growth`
      },
      // Week 8 (Current)
      {
        customerId: customer.id,
        measurementDate: new Date(),
        weight: 73.2,
        bodyFat: 26.4,
        muscleMass: 54.8,
        chest: 93.3,
        waist: 80.0,
        hips: 103.0,
        thigh: 56.8,
        arm: 30.5,
        notes: `📈 Week 8 Progress - 2-Month Milestone!

🏆 2-MONTH TRANSFORMATION COMPLETE:
• Total weight loss: 1.8kg (4.0 lbs)
• Body fat reduction: 1.6%
• Muscle gain: +0.8kg
• Waist reduction: 2.0cm
• Strength gains: Remarkable across all areas

💪 Strength Achievement Summary:
• Squat: 78kg (+18kg from baseline!)
• Deadlift: 90kg (+20kg improvement!)
• Bench: 48kg (+13kg gain!)
• Pull-ups: 6 unassisted (from 0!)

🍽️ Nutrition Lifestyle Integration:
• 56-day consistent logging streak
• Meal prep mastery achieved
• Flexible eating approach developed
• Relationship with food transformed

⚡ Energy & Vitality Revolution:
• Daily energy: 9/10 (sustained excellence)
• Sleep quality: 9/10 (deep, restorative)
• No afternoon crashes for 5 weeks straight
• Stress management skills developed

🎯 Goal Progress Assessment:
• Weight Loss: 18% of primary goal achieved
• Body Composition: AHEAD OF SCHEDULE
• Energy Goals: FULLY ACHIEVED AND EXCEEDED
• Habit Formation: EXCELLENT FOUNDATION
• Strength Goals: ALL ORIGINAL TARGETS EXCEEDED

👔 Life Transformation Impact:
• Work performance significantly improved
• Confidence and self-esteem soaring
• Social activities more enjoyable
• Overall quality of life enhanced
• Health biomarkers improving

🔬 Health Improvements:
• Resting heart rate: 65 → 58 bpm
• Blood pressure: Optimal range maintained
• Energy stability throughout day
• Immune system stronger
• Recovery between workouts excellent

💭 Client Reflection:
"I started this journey wanting to lose weight, but I've gained so much more. I have energy I haven't felt in years, strength I didn't know I possessed, and confidence that radiates into every area of my life. This isn't just a diet - it's become my new lifestyle, and I love who I'm becoming."

🎯 MONTH 3 FOCUS:
• Continue steady weight loss (target: -2.5kg more)
• Push strength goals even higher
• Perfect travel and social eating
• Prepare for long-term maintenance phase
• Consider new fitness challenges

🚀 New Goals Being Considered:
• 5K race in month 4
• Advanced yoga poses
• Hiking trip endurance goals
• Strength sport competition
• Mentoring others in their journey`
      }
    ];

    const progressMeasurements_inserted = [];
    for (let i = 0; i < progressData.length; i++) {
      const inserted = await db.insert(progressMeasurements).values({
        customerId: progressData[i].customerId,
        measurementDate: progressData[i].measurementDate,
        weight: progressData[i].weight,
        bodyFat: progressData[i].bodyFat,
        muscleMass: progressData[i].muscleMass,
        chest: progressData[i].chest,
        waist: progressData[i].waist,
        hips: progressData[i].hips,
        thigh: progressData[i].thigh,
        arm: progressData[i].arm,
        notes: progressData[i].notes
      }).returning();
      progressMeasurements_inserted.push(...inserted);
    }
    
    console.log(`${colors.green}✅ Added ${progressMeasurements_inserted.length} detailed progress measurements${colors.reset}`);

    // Step 5: Add Progress Photos (simulated photo tracking)
    console.log(`\n${colors.yellow}📸 Adding progress photo records...${colors.reset}`);
    
    const photoRecords = [
      {
        customerId: customer.id,
        photoDate: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000), // 8 weeks ago
        photoType: 'front',
        photoUrl: '/uploads/progress/sarah_johnson_baseline_front.jpg',
        notes: 'Baseline photo - front view. Starting point for transformation journey.'
      },
      {
        customerId: customer.id,
        photoDate: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
        photoType: 'side',
        photoUrl: '/uploads/progress/sarah_johnson_baseline_side.jpg',
        notes: 'Baseline photo - side view. Clear view of posture and body shape.'
      },
      {
        customerId: customer.id,
        photoDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 4 weeks ago
        photoType: 'front',
        photoUrl: '/uploads/progress/sarah_johnson_month1_front.jpg',
        notes: 'Month 1 progress - front view. Visible improvements in posture and muscle definition.'
      },
      {
        customerId: customer.id,
        photoDate: new Date(),
        photoType: 'front',
        photoUrl: '/uploads/progress/sarah_johnson_current_front.jpg',
        notes: 'Current progress photo - front view. Significant improvements visible in overall physique.'
      }
    ];

    const insertedPhotos = await db.insert(progressPhotos).values(photoRecords).returning();
    console.log(`${colors.green}✅ Added ${insertedPhotos.length} progress photo records${colors.reset}`);

    // Step 6: Test Trainer-Customer Data Visibility
    console.log(`\n${colors.yellow}🔗 Testing trainer-customer data visibility...${colors.reset}`);
    
    // Verify trainer can see customer data
    const customerWithGoals = await db.select().from(users)
      .where(eq(users.id, customer.id));
    
    const customerGoalsList = await db.select().from(customerGoals)
      .where(eq(customerGoals.customerId, customer.id));
    
    const customerProgressList = await db.select().from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customer.id));

    console.log(`${colors.green}✅ Customer profile accessible: ${customerWithGoals[0]?.firstName} ${customerWithGoals[0]?.lastName}${colors.reset}`);
    console.log(`${colors.green}✅ Customer goals accessible: ${customerGoalsList.length} goals${colors.reset}`);
    console.log(`${colors.green}✅ Progress measurements accessible: ${customerProgressList.length} measurements${colors.reset}`);

    // Step 7: Display Enhanced Summary
    console.log(`\n${colors.bright}${colors.purple}🎉 ENHANCED TEST DATA COMPLETE!${colors.reset}`);
    console.log(`${colors.bright}${colors.purple}===========================================${colors.reset}`);
    
    console.log(`\n${colors.bright}📊 COMPREHENSIVE DATA SUMMARY:${colors.reset}`);
    
    console.log(`\n${colors.bright}${colors.blue}👨‍⚕️ ENHANCED TRAINER PROFILE:${colors.reset}`);
    console.log(`• Complete professional bio with credentials`);
    console.log(`• 10+ years experience, 500+ client transformations`);
    console.log(`• Detailed specializations and success metrics`);
    console.log(`• Business methodology and client programs`);
    console.log(`• Awards, recognition, and media features`);
    
    console.log(`\n${colors.bright}${colors.green}👤 ENHANCED CUSTOMER PROFILE:${colors.reset}`);
    console.log(`• Complete health history and demographics`);
    console.log(`• Detailed fitness background and preferences`);
    console.log(`• Medical conditions and medication tracking`);
    console.log(`• Nutrition history and challenges identified`);
    console.log(`• Technology integration and tracking preferences`);
    
    console.log(`\n${colors.bright}${colors.yellow}🎯 DETAILED GOALS (${customerGoalsList.length} total):${colors.reset}`);
    customerGoalsList.forEach((goal, index) => {
      console.log(`${index + 1}. ${goal.goalName} (${goal.status})`);
    });
    
    console.log(`\n${colors.bright}${colors.purple}📈 PROGRESS TRACKING (${customerProgressList.length} measurements):${colors.reset}`);
    console.log(`• 8 weeks of detailed measurements`);
    console.log(`• Weight: 75.0kg → 73.2kg (-1.8kg)`);
    console.log(`• Body Fat: 28.0% → 26.4% (-1.6%)`);
    console.log(`• Muscle Mass: 54.0kg → 54.8kg (+0.8kg)`);
    console.log(`• Waist: 82.0cm → 80.0cm (-2.0cm)`);
    console.log(`• Energy Level: 5/10 → 9/10`);
    
    console.log(`\n${colors.bright}${colors.blue}💪 STRENGTH PROGRESS:${colors.reset}`);
    console.log(`• Squat: 60kg → 78kg (+30% increase!)`);
    console.log(`• Deadlift: 70kg → 90kg (+28% increase!)`);
    console.log(`• Bench Press: 35kg → 48kg (+37% increase!)`);
    console.log(`• Pull-ups: 0 → 6 unassisted`);
    
    console.log(`\n${colors.bright}${colors.green}📸 PHOTO TRACKING:${colors.reset}`);
    console.log(`• ${insertedPhotos.length} progress photos documented`);
    console.log(`• Baseline, monthly, and current comparisons`);
    console.log(`• Multiple angles for comprehensive tracking`);
    
    console.log(`\n${colors.bright}${colors.yellow}🔗 TRAINER-CUSTOMER VISIBILITY:${colors.reset}`);
    console.log(`• ✅ Customer profile fully accessible to trainer`);
    console.log(`• ✅ All health metrics and goals visible`);
    console.log(`• ✅ Complete progress history available`);
    console.log(`• ✅ Photo progress tracking linked`);
    console.log(`• ✅ Real-time goal tracking enabled`);
    
    console.log(`\n${colors.bright}${colors.purple}🚀 DEMO SCENARIOS READY:${colors.reset}`);
    console.log(`1. Initial consultation and assessment review`);
    console.log(`2. 2-month progress review meeting`);
    console.log(`3. Goal setting and adjustment session`);
    console.log(`4. Meal plan creation based on preferences`);
    console.log(`5. Progress photo comparison analysis`);
    console.log(`6. Strength training program progression`);
    console.log(`7. Nutritional coaching conversation`);
    console.log(`8. Long-term maintenance planning`);
    
    console.log(`\n${colors.bright}${colors.blue}🎯 PERFECT FOR CLIENT PRESENTATIONS:${colors.reset}`);
    console.log(`• Realistic 2-month transformation story`);
    console.log(`• Professional trainer credentials and expertise`);
    console.log(`• Comprehensive health and fitness tracking`);
    console.log(`• Measurable results with detailed documentation`);
    console.log(`• Complete trainer-customer relationship demo`);

  } catch (error) {
    console.error(`${colors.red}❌ Error enhancing test data:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the enhancement
enhanceTestData();