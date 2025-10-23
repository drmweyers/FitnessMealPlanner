#!/usr/bin/env node

/**
 * Comprehensive Demo Data Seeding Script
 * Purpose: Create realistic, impressive demo data for client presentations
 *
 * Creates:
 * - 3 admin accounts with different responsibilities
 * - 5 trainer accounts with unique specialties and bios
 * - 10 customer accounts with varied fitness goals and progress
 * - 50+ realistic recipes across all categories
 * - 20+ complete meal plans with proper nutrition
 * - Trainer-customer relationships
 * - Progress tracking data showing transformations
 *
 * Usage: node scripts/seed-demo-data.js
 */

import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const DB_CONFIG = {
  host: 'localhost',
  port: 5433,
  database: 'fitmeal',
  user: 'postgres',
  password: 'postgres'
};

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// ===== DEMO DATA DEFINITIONS =====

const DEMO_ADMINS = [
  {
    email: 'demo.admin.chief@evofitmeals.com',
    password: 'DemoAdmin123!',
    fullName: 'Sarah Chen',
    role: 'admin',
    profileImageUrl: '/demo-images/admin-sarah.jpg'
  },
  {
    email: 'demo.admin.nutrition@evofitmeals.com',
    password: 'DemoAdmin123!',
    fullName: 'Dr. Marcus Johnson',
    role: 'admin',
    profileImageUrl: '/demo-images/admin-marcus.jpg'
  },
  {
    email: 'demo.admin.tech@evofitmeals.com',
    password: 'DemoAdmin123!',
    fullName: 'Alex Rivera',
    role: 'admin',
    profileImageUrl: '/demo-images/admin-alex.jpg'
  }
];

const DEMO_TRAINERS = [
  {
    email: 'demo.trainer.bodybuilding@evofitmeals.com',
    password: 'DemoTrainer123!',
    fullName: 'Jake "The Tank" Morrison',
    role: 'trainer',
    profileImageUrl: '/demo-images/trainer-jake.jpg',
    specialty: 'Bodybuilding & Muscle Gain',
    bio: 'IFBB Pro with 15+ years experience. Specializes in hypertrophy training and high-protein nutrition plans. Former Mr. Olympia competitor.',
    certifications: ['IFBB Pro Card', 'NASM-CPT', 'Precision Nutrition L2']
  },
  {
    email: 'demo.trainer.weightloss@evofitmeals.com',
    password: 'DemoTrainer123!',
    fullName: 'Dr. Emily Watson',
    role: 'trainer',
    profileImageUrl: '/demo-images/trainer-emily.jpg',
    specialty: 'Weight Loss & Metabolic Health',
    bio: 'PhD in Exercise Physiology. Helped 500+ clients lose over 10,000 lbs combined. Evidence-based approach to sustainable fat loss.',
    certifications: ['PhD Exercise Physiology', 'RD', 'CSCS']
  },
  {
    email: 'demo.trainer.sports@evofitmeals.com',
    password: 'DemoTrainer123!',
    fullName: 'Coach Tony Martinez',
    role: 'trainer',
    profileImageUrl: '/demo-images/trainer-tony.jpg',
    specialty: 'Sports Performance & Athletic Nutrition',
    bio: 'Former NFL strength coach. Trains professional athletes for peak performance. Specializes in sport-specific nutrition timing.',
    certifications: ['CSCS', 'SCCC', 'CISSN']
  },
  {
    email: 'demo.trainer.vegan@evofitmeals.com',
    password: 'DemoTrainer123!',
    fullName: 'Maya Green',
    role: 'trainer',
    profileImageUrl: '/demo-images/trainer-maya.jpg',
    specialty: 'Plant-Based Nutrition & Wellness',
    bio: 'Plant-based athlete and nutritionist. Proves you can build muscle and perform at elite levels on a vegan diet. 10 years plant-based.',
    certifications: ['Plant-Based Nutrition Cert', 'ACE-CPT', 'Yoga RYT-500']
  },
  {
    email: 'demo.trainer.keto@evofitmeals.com',
    password: 'DemoTrainer123!',
    fullName: 'Dr. Robert Ketosis',
    role: 'trainer',
    profileImageUrl: '/demo-images/trainer-robert.jpg',
    specialty: 'Ketogenic Diet & Metabolic Therapy',
    bio: 'MD specializing in therapeutic ketosis. Helps clients reverse metabolic syndrome through low-carb, high-fat nutrition. Published researcher.',
    certifications: ['MD', 'Board Certified Obesity Medicine', 'Keto Nutrition Specialist']
  }
];

const DEMO_CUSTOMERS = [
  {
    email: 'demo.customer.transformation@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Jennifer Thompson',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-jennifer.jpg',
    assignedTrainer: 'demo.trainer.weightloss@evofitmeals.com',
    startWeight: 92.5, // kg
    currentWeight: 68.2,
    targetWeight: 65.0,
    goalType: 'weight_loss',
    progressNotes: 'Amazing 24.3kg transformation in 8 months! Consistent with meal plans and workouts.'
  },
  {
    email: 'demo.customer.bulking@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Marcus Williams',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-marcus.jpg',
    assignedTrainer: 'demo.trainer.bodybuilding@evofitmeals.com',
    startWeight: 72.0,
    currentWeight: 84.5,
    targetWeight: 90.0,
    goalType: 'muscle_gain',
    progressNotes: 'Clean bulk success! Gained 12.5kg lean muscle in 6 months. Strength PRs every month.'
  },
  {
    email: 'demo.customer.athlete@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Tyler Jackson',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-tyler.jpg',
    assignedTrainer: 'demo.trainer.sports@evofitmeals.com',
    startWeight: 88.0,
    currentWeight: 86.5,
    targetWeight: 85.0,
    goalType: 'performance',
    progressNotes: 'College football linebacker. Improved 40-yard dash by 0.3s while maintaining strength.'
  },
  {
    email: 'demo.customer.vegan@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Sophia Rodriguez',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-sophia.jpg',
    assignedTrainer: 'demo.trainer.vegan@evofitmeals.com',
    startWeight: 65.0,
    currentWeight: 62.0,
    targetWeight: 60.0,
    goalType: 'body_fat',
    progressNotes: 'Plant-based journey going strong! Lost body fat while increasing muscle definition.'
  },
  {
    email: 'demo.customer.keto@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'David Chen',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-david.jpg',
    assignedTrainer: 'demo.trainer.keto@evofitmeals.com',
    startWeight: 105.0,
    currentWeight: 82.0,
    targetWeight: 75.0,
    goalType: 'weight_loss',
    progressNotes: 'Reversed pre-diabetes! Lost 23kg on keto. A1C normalized. Energy through the roof!'
  },
  {
    email: 'demo.customer.maintenance@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Lisa Anderson',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-lisa.jpg',
    assignedTrainer: 'demo.trainer.weightloss@evofitmeals.com',
    startWeight: 70.0,
    currentWeight: 68.0,
    targetWeight: 68.0,
    goalType: 'maintenance',
    progressNotes: 'Maintenance mode after successful cut. Staying lean year-round!'
  },
  {
    email: 'demo.customer.newbie@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Michael Brown',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-michael.jpg',
    assignedTrainer: 'demo.trainer.bodybuilding@evofitmeals.com',
    startWeight: 78.0,
    currentWeight: 77.5,
    targetWeight: 75.0,
    goalType: 'weight_loss',
    progressNotes: 'Just started 2 weeks ago. Learning the ropes. Excited for the journey!'
  },
  {
    email: 'demo.customer.mom@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Amanda Martinez',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-amanda.jpg',
    assignedTrainer: 'demo.trainer.weightloss@evofitmeals.com',
    startWeight: 82.0,
    currentWeight: 71.0,
    targetWeight: 65.0,
    goalType: 'weight_loss',
    progressNotes: 'Busy mom of 3. Lost 11kg postpartum. Meal prep has been a lifesaver!'
  },
  {
    email: 'demo.customer.senior@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Robert Davis',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-robert.jpg',
    assignedTrainer: 'demo.trainer.sports@evofitmeals.com',
    startWeight: 90.0,
    currentWeight: 85.0,
    targetWeight: 80.0,
    goalType: 'weight_loss',
    progressNotes: '62 years young! Proving age is just a number. Down 5kg and feeling 20 years younger.'
  },
  {
    email: 'demo.customer.competitor@evofitmeals.com',
    password: 'DemoCustomer123!',
    fullName: 'Ashley Kim',
    role: 'customer',
    profileImageUrl: '/demo-images/customer-ashley.jpg',
    assignedTrainer: 'demo.trainer.bodybuilding@evofitmeals.com',
    startWeight: 58.0,
    currentWeight: 56.5,
    targetWeight: 55.0,
    goalType: 'body_fat',
    progressNotes: 'Bikini competitor prep. 4 weeks out. Conditioning looking sharp!'
  }
];

const DEMO_RECIPES = [
  // BREAKFAST RECIPES
  {
    name: 'Anabolic French Toast',
    category: 'breakfast',
    prepTime: 10,
    cookTime: 5,
    servings: 1,
    calories: 420,
    protein: 35,
    carbs: 45,
    fat: 12,
    fiber: 8,
    ingredients: ['4 egg whites', '2 slices whole wheat bread', '1 scoop vanilla protein powder', 'Cinnamon', 'Sugar-free syrup'],
    instructions: ['Mix egg whites with protein powder and cinnamon', 'Dip bread in mixture', 'Cook on griddle until golden', 'Top with sugar-free syrup'],
    imageUrl: '/demo-recipes/anabolic-french-toast.jpg',
    isApproved: true
  },
  {
    name: 'Protein Pancake Stack',
    category: 'breakfast',
    prepTime: 5,
    cookTime: 10,
    servings: 1,
    calories: 380,
    protein: 40,
    carbs: 42,
    fat: 8,
    fiber: 6,
    ingredients: ['1 scoop protein powder', '1 banana', '2 eggs', '1/4 cup oats', 'Baking powder'],
    instructions: ['Blend all ingredients', 'Pour onto hot griddle', 'Flip when bubbles form', 'Stack and serve'],
    imageUrl: '/demo-recipes/protein-pancakes.jpg',
    isApproved: true
  },
  {
    name: 'Egg White Veggie Scramble',
    category: 'breakfast',
    prepTime: 5,
    cookTime: 8,
    servings: 1,
    calories: 280,
    protein: 32,
    carbs: 15,
    fat: 10,
    fiber: 5,
    ingredients: ['6 egg whites', 'Spinach', 'Tomatoes', 'Bell peppers', 'Mushrooms', 'Olive oil spray'],
    instructions: ['Sauté vegetables', 'Add egg whites', 'Scramble until cooked', 'Season to taste'],
    imageUrl: '/demo-recipes/egg-scramble.jpg',
    isApproved: true
  },
  {
    name: 'Overnight Protein Oats',
    category: 'breakfast',
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    calories: 350,
    protein: 30,
    carbs: 48,
    fat: 7,
    fiber: 10,
    ingredients: ['1/2 cup oats', '1 scoop protein powder', '1 cup almond milk', 'Chia seeds', 'Berries'],
    instructions: ['Mix all ingredients in jar', 'Refrigerate overnight', 'Top with fresh berries', 'Enjoy cold'],
    imageUrl: '/demo-recipes/overnight-oats.jpg',
    isApproved: true
  },
  {
    name: 'Keto Breakfast Bowl',
    category: 'breakfast',
    prepTime: 10,
    cookTime: 12,
    servings: 1,
    calories: 520,
    protein: 28,
    carbs: 8,
    fat: 42,
    fiber: 3,
    ingredients: ['3 eggs', 'Avocado', 'Bacon', 'Cheese', 'Spinach'],
    instructions: ['Cook bacon until crispy', 'Scramble eggs', 'Assemble bowl with avocado and spinach', 'Top with cheese'],
    imageUrl: '/demo-recipes/keto-breakfast-bowl.jpg',
    isApproved: true
  },

  // LUNCH RECIPES
  {
    name: 'Grilled Chicken Power Bowl',
    category: 'lunch',
    prepTime: 15,
    cookTime: 20,
    servings: 1,
    calories: 520,
    protein: 55,
    carbs: 48,
    fat: 12,
    fiber: 12,
    ingredients: ['6oz chicken breast', 'Quinoa', 'Roasted vegetables', 'Sweet potato', 'Tahini dressing'],
    instructions: ['Grill seasoned chicken', 'Cook quinoa', 'Roast vegetables', 'Assemble bowl', 'Drizzle with tahini'],
    imageUrl: '/demo-recipes/chicken-power-bowl.jpg',
    isApproved: true
  },
  {
    name: 'Tuna Poke Bowl',
    category: 'lunch',
    prepTime: 20,
    cookTime: 15,
    servings: 1,
    calories: 480,
    protein: 45,
    carbs: 52,
    fat: 10,
    fiber: 8,
    ingredients: ['6oz ahi tuna', 'Sushi rice', 'Edamame', 'Cucumber', 'Avocado', 'Soy sauce'],
    instructions: ['Cook sushi rice', 'Dice tuna', 'Prepare vegetables', 'Assemble bowl', 'Add soy sauce'],
    imageUrl: '/demo-recipes/tuna-poke-bowl.jpg',
    isApproved: true
  },
  {
    name: 'Turkey Avocado Wrap',
    category: 'lunch',
    prepTime: 10,
    cookTime: 0,
    servings: 1,
    calories: 420,
    protein: 38,
    carbs: 35,
    fat: 16,
    fiber: 10,
    ingredients: ['Whole wheat wrap', 'Sliced turkey', 'Avocado', 'Lettuce', 'Tomato', 'Mustard'],
    instructions: ['Lay out wrap', 'Layer turkey and vegetables', 'Add sliced avocado', 'Roll tightly', 'Slice in half'],
    imageUrl: '/demo-recipes/turkey-wrap.jpg',
    isApproved: true
  },
  {
    name: 'Beef Burrito Bowl',
    category: 'lunch',
    prepTime: 15,
    cookTime: 20,
    servings: 1,
    calories: 580,
    protein: 50,
    carbs: 55,
    fat: 18,
    fiber: 14,
    ingredients: ['6oz lean beef', 'Brown rice', 'Black beans', 'Salsa', 'Greek yogurt', 'Lettuce'],
    instructions: ['Cook seasoned beef', 'Prepare rice and beans', 'Assemble bowl', 'Top with salsa and yogurt'],
    imageUrl: '/demo-recipes/beef-burrito-bowl.jpg',
    isApproved: true
  },
  {
    name: 'Vegan Buddha Bowl',
    category: 'lunch',
    prepTime: 25,
    cookTime: 30,
    servings: 1,
    calories: 450,
    protein: 22,
    carbs: 68,
    fat: 14,
    fiber: 18,
    ingredients: ['Chickpeas', 'Quinoa', 'Roasted vegetables', 'Tahini', 'Kale', 'Lemon'],
    instructions: ['Roast chickpeas and vegetables', 'Cook quinoa', 'Massage kale', 'Assemble bowl', 'Drizzle tahini-lemon dressing'],
    imageUrl: '/demo-recipes/vegan-buddha-bowl.jpg',
    isApproved: true
  },

  // DINNER RECIPES
  {
    name: 'Baked Salmon with Asparagus',
    category: 'dinner',
    prepTime: 10,
    cookTime: 18,
    servings: 1,
    calories: 480,
    protein: 52,
    carbs: 15,
    fat: 24,
    fiber: 6,
    ingredients: ['6oz salmon fillet', 'Asparagus', 'Lemon', 'Garlic', 'Olive oil', 'Herbs'],
    instructions: ['Season salmon', 'Toss asparagus with olive oil', 'Bake at 400F for 15-18 min', 'Squeeze lemon over top'],
    imageUrl: '/demo-recipes/baked-salmon.jpg',
    isApproved: true
  },
  {
    name: 'Lean Beef Stir-Fry',
    category: 'dinner',
    prepTime: 15,
    cookTime: 12,
    servings: 1,
    calories: 510,
    protein: 48,
    carbs: 42,
    fat: 16,
    fiber: 8,
    ingredients: ['6oz lean beef strips', 'Broccoli', 'Bell peppers', 'Snap peas', 'Low-sodium soy sauce', 'Ginger', 'Rice'],
    instructions: ['Sear beef strips', 'Add vegetables', 'Stir-fry with sauce', 'Serve over rice'],
    imageUrl: '/demo-recipes/beef-stir-fry.jpg',
    isApproved: true
  },
  {
    name: 'Chicken Fajita Skillet',
    category: 'dinner',
    prepTime: 12,
    cookTime: 15,
    servings: 1,
    calories: 440,
    protein: 52,
    carbs: 35,
    fat: 12,
    fiber: 8,
    ingredients: ['6oz chicken breast', 'Bell peppers', 'Onions', 'Fajita seasoning', 'Whole wheat tortillas'],
    instructions: ['Slice chicken and vegetables', 'Cook chicken with seasoning', 'Add peppers and onions', 'Serve with tortillas'],
    imageUrl: '/demo-recipes/chicken-fajitas.jpg',
    isApproved: true
  },
  {
    name: 'Shrimp Cauliflower Rice',
    category: 'dinner',
    prepTime: 10,
    cookTime: 10,
    servings: 1,
    calories: 320,
    protein: 40,
    carbs: 18,
    fat: 10,
    fiber: 6,
    ingredients: ['8oz shrimp', 'Cauliflower rice', 'Garlic', 'Olive oil', 'Lemon', 'Parsley'],
    instructions: ['Sauté garlic', 'Cook shrimp', 'Add cauliflower rice', 'Season and toss', 'Garnish with parsley'],
    imageUrl: '/demo-recipes/shrimp-cauli-rice.jpg',
    isApproved: true
  },
  {
    name: 'Turkey Meatballs with Zoodles',
    category: 'dinner',
    prepTime: 20,
    cookTime: 25,
    servings: 1,
    calories: 380,
    protein: 45,
    carbs: 22,
    fat: 14,
    fiber: 6,
    ingredients: ['Lean ground turkey', 'Zucchini noodles', 'Marinara sauce', 'Italian herbs', 'Parmesan'],
    instructions: ['Form and bake meatballs', 'Spiralize zucchini', 'Heat marinara', 'Combine and top with cheese'],
    imageUrl: '/demo-recipes/turkey-meatballs.jpg',
    isApproved: true
  },

  // SNACK RECIPES
  {
    name: 'Protein Energy Balls',
    category: 'snack',
    prepTime: 15,
    cookTime: 0,
    servings: 6,
    calories: 180,
    protein: 12,
    carbs: 20,
    fat: 6,
    fiber: 4,
    ingredients: ['Oats', 'Protein powder', 'Peanut butter', 'Honey', 'Dark chocolate chips'],
    instructions: ['Mix all ingredients', 'Roll into balls', 'Refrigerate 30 minutes', 'Store in airtight container'],
    imageUrl: '/demo-recipes/protein-balls.jpg',
    isApproved: true
  },
  {
    name: 'Greek Yogurt Parfait',
    category: 'snack',
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    calories: 250,
    protein: 25,
    carbs: 28,
    fat: 6,
    fiber: 5,
    ingredients: ['Greek yogurt', 'Berries', 'Granola', 'Honey', 'Chia seeds'],
    instructions: ['Layer yogurt and berries', 'Top with granola', 'Drizzle honey', 'Sprinkle chia seeds'],
    imageUrl: '/demo-recipes/yogurt-parfait.jpg',
    isApproved: true
  },
  {
    name: 'Almond Butter Apple Slices',
    category: 'snack',
    prepTime: 3,
    cookTime: 0,
    servings: 1,
    calories: 220,
    protein: 8,
    carbs: 28,
    fat: 10,
    fiber: 6,
    ingredients: ['Apple', 'Almond butter', 'Cinnamon'],
    instructions: ['Slice apple', 'Spread almond butter', 'Sprinkle cinnamon'],
    imageUrl: '/demo-recipes/apple-almond-butter.jpg',
    isApproved: true
  },
  {
    name: 'Protein Smoothie',
    category: 'snack',
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    calories: 280,
    protein: 30,
    carbs: 32,
    fat: 6,
    fiber: 5,
    ingredients: ['Protein powder', 'Banana', 'Spinach', 'Almond milk', 'Ice'],
    instructions: ['Add all ingredients to blender', 'Blend until smooth', 'Pour and enjoy'],
    imageUrl: '/demo-recipes/protein-smoothie.jpg',
    isApproved: true
  },
  {
    name: 'Cottage Cheese Bowl',
    category: 'snack',
    prepTime: 3,
    cookTime: 0,
    servings: 1,
    calories: 200,
    protein: 24,
    carbs: 18,
    fat: 4,
    fiber: 3,
    ingredients: ['Low-fat cottage cheese', 'Pineapple', 'Walnuts', 'Cinnamon'],
    instructions: ['Add cottage cheese to bowl', 'Top with pineapple', 'Sprinkle walnuts and cinnamon'],
    imageUrl: '/demo-recipes/cottage-cheese-bowl.jpg',
    isApproved: true
  }
];

// Add 30 more recipes to reach 50+ total
const ADDITIONAL_RECIPES = [
  // More breakfast
  {name: 'Protein Waffles', category: 'breakfast', prepTime: 10, cookTime: 8, servings: 1, calories: 340, protein: 28, carbs: 38, fat: 10, fiber: 6, ingredients: ['Protein powder', 'Oat flour', 'Eggs', 'Vanilla'], instructions: ['Mix ingredients', 'Pour in waffle iron', 'Cook until golden'], imageUrl: '/demo-recipes/protein-waffles.jpg', isApproved: true},
  {name: 'Breakfast Burrito', category: 'breakfast', prepTime: 12, cookTime: 10, servings: 1, calories: 480, protein: 35, carbs: 42, fat: 18, fiber: 8, ingredients: ['Whole wheat tortilla', 'Eggs', 'Black beans', 'Salsa', 'Cheese'], instructions: ['Scramble eggs', 'Add beans', 'Wrap in tortilla', 'Heat through'], imageUrl: '/demo-recipes/breakfast-burrito.jpg', isApproved: true},
  {name: 'Acai Bowl', category: 'breakfast', prepTime: 8, cookTime: 0, servings: 1, calories: 320, protein: 18, carbs: 52, fat: 8, fiber: 12, ingredients: ['Acai packet', 'Banana', 'Protein powder', 'Granola', 'Berries'], instructions: ['Blend acai and banana', 'Add protein powder', 'Top with granola and berries'], imageUrl: '/demo-recipes/acai-bowl.jpg', isApproved: true},
  {name: 'Egg Muffins', category: 'breakfast', prepTime: 15, cookTime: 20, servings: 6, calories: 160, protein: 14, carbs: 8, fat: 10, fiber: 2, ingredients: ['Eggs', 'Turkey sausage', 'Cheese', 'Vegetables'], instructions: ['Mix all ingredients', 'Pour into muffin tin', 'Bake at 350F for 20 min'], imageUrl: '/demo-recipes/egg-muffins.jpg', isApproved: true},
  {name: 'Chia Pudding', category: 'breakfast', prepTime: 5, cookTime: 0, servings: 1, calories: 280, protein: 18, carbs: 30, fat: 12, fiber: 15, ingredients: ['Chia seeds', 'Almond milk', 'Protein powder', 'Vanilla', 'Berries'], instructions: ['Mix chia and milk', 'Add protein powder', 'Refrigerate overnight', 'Top with berries'], imageUrl: '/demo-recipes/chia-pudding.jpg', isApproved: true},

  // More lunch
  {name: 'Mediterranean Salad', category: 'lunch', prepTime: 15, cookTime: 0, servings: 1, calories: 380, protein: 28, carbs: 35, fat: 16, fiber: 10, ingredients: ['Mixed greens', 'Grilled chicken', 'Feta', 'Olives', 'Chickpeas', 'Lemon dressing'], instructions: ['Toss greens', 'Add chicken and toppings', 'Drizzle dressing'], imageUrl: '/demo-recipes/mediterranean-salad.jpg', isApproved: true},
  {name: 'Chicken Caesar Salad', category: 'lunch', prepTime: 12, cookTime: 15, servings: 1, calories: 420, protein: 48, carbs: 22, fat: 18, fiber: 6, ingredients: ['Romaine lettuce', 'Grilled chicken', 'Parmesan', 'Light Caesar dressing', 'Croutons'], instructions: ['Grill chicken', 'Chop romaine', 'Toss with dressing', 'Top with chicken and cheese'], imageUrl: '/demo-recipes/caesar-salad.jpg', isApproved: true},
  {name: 'Protein Pasta Bowl', category: 'lunch', prepTime: 15, cookTime: 15, servings: 1, calories: 520, protein: 42, carbs: 58, fat: 14, fiber: 10, ingredients: ['Chickpea pasta', 'Ground turkey', 'Marinara', 'Vegetables'], instructions: ['Cook pasta', 'Brown turkey', 'Add sauce', 'Mix together'], imageUrl: '/demo-recipes/protein-pasta.jpg', isApproved: true},
  {name: 'Asian Chicken Lettuce Wraps', category: 'lunch', prepTime: 15, cookTime: 12, servings: 1, calories: 320, protein: 38, carbs: 22, fat: 10, fiber: 6, ingredients: ['Ground chicken', 'Lettuce cups', 'Water chestnuts', 'Hoisin sauce', 'Scallions'], instructions: ['Cook chicken with sauce', 'Add water chestnuts', 'Spoon into lettuce cups'], imageUrl: '/demo-recipes/lettuce-wraps.jpg', isApproved: true},
  {name: 'Cobb Salad', category: 'lunch', prepTime: 20, cookTime: 10, servings: 1, calories: 480, protein: 45, carbs: 18, fat: 28, fiber: 8, ingredients: ['Mixed greens', 'Grilled chicken', 'Hard-boiled eggs', 'Avocado', 'Bacon', 'Blue cheese'], instructions: ['Arrange ingredients in rows', 'Add dressing on side'], imageUrl: '/demo-recipes/cobb-salad.jpg', isApproved: true},

  // More dinner
  {name: 'Grilled Steak with Sweet Potato', category: 'dinner', prepTime: 10, cookTime: 20, servings: 1, calories: 580, protein: 52, carbs: 45, fat: 22, fiber: 8, ingredients: ['6oz sirloin steak', 'Sweet potato', 'Broccoli', 'Garlic butter'], instructions: ['Grill steak to desired doneness', 'Bake sweet potato', 'Steam broccoli', 'Top with garlic butter'], imageUrl: '/demo-recipes/steak-sweet-potato.jpg', isApproved: true},
  {name: 'Cod with Quinoa', category: 'dinner', prepTime: 12, cookTime: 18, servings: 1, calories: 420, protein: 48, carbs: 40, fat: 10, fiber: 8, ingredients: ['6oz cod fillet', 'Quinoa', 'Green beans', 'Lemon', 'Herbs'], instructions: ['Bake cod with lemon', 'Cook quinoa', 'Steam green beans'], imageUrl: '/demo-recipes/cod-quinoa.jpg', isApproved: true},
  {name: 'Chicken Curry', category: 'dinner', prepTime: 20, cookTime: 30, servings: 1, calories: 520, protein: 50, carbs: 48, fat: 16, fiber: 10, ingredients: ['Chicken breast', 'Curry sauce', 'Coconut milk', 'Vegetables', 'Basmati rice'], instructions: ['Simmer curry sauce', 'Add chicken and vegetables', 'Serve over rice'], imageUrl: '/demo-recipes/chicken-curry.jpg', isApproved: true},
  {name: 'Pork Tenderloin with Brussels Sprouts', category: 'dinner', prepTime: 15, cookTime: 25, servings: 1, calories: 460, protein: 48, carbs: 28, fat: 18, fiber: 8, ingredients: ['6oz pork tenderloin', 'Brussels sprouts', 'Balsamic glaze', 'Garlic'], instructions: ['Roast pork tenderloin', 'Roast Brussels sprouts', 'Drizzle with balsamic'], imageUrl: '/demo-recipes/pork-brussels.jpg', isApproved: true},
  {name: 'Veggie Lasagna', category: 'dinner', prepTime: 30, cookTime: 45, servings: 6, calories: 380, protein: 28, carbs: 42, fat: 12, fiber: 10, ingredients: ['Whole wheat lasagna noodles', 'Ricotta', 'Spinach', 'Zucchini', 'Marinara'], instructions: ['Layer noodles and filling', 'Bake at 375F for 45 min'], imageUrl: '/demo-recipes/veggie-lasagna.jpg', isApproved: true},

  // More snacks
  {name: 'Hummus Veggie Sticks', category: 'snack', prepTime: 5, cookTime: 0, servings: 1, calories: 180, protein: 8, carbs: 22, fat: 8, fiber: 8, ingredients: ['Hummus', 'Carrots', 'Celery', 'Cucumber', 'Bell peppers'], instructions: ['Cut vegetables into sticks', 'Serve with hummus'], imageUrl: '/demo-recipes/hummus-veggies.jpg', isApproved: true},
  {name: 'Protein Bar', category: 'snack', prepTime: 20, cookTime: 0, servings: 12, calories: 200, protein: 15, carbs: 20, fat: 8, fiber: 4, ingredients: ['Protein powder', 'Oats', 'Almond butter', 'Honey', 'Dark chocolate'], instructions: ['Mix ingredients', 'Press into pan', 'Refrigerate until firm', 'Cut into bars'], imageUrl: '/demo-recipes/protein-bars.jpg', isApproved: true},
  {name: 'Trail Mix', category: 'snack', prepTime: 5, cookTime: 0, servings: 1, calories: 240, protein: 10, carbs: 24, fat: 14, fiber: 5, ingredients: ['Almonds', 'Walnuts', 'Dried cranberries', 'Dark chocolate chips'], instructions: ['Mix all ingredients', 'Portion into bags'], imageUrl: '/demo-recipes/trail-mix.jpg', isApproved: true},
  {name: 'Banana Protein Muffin', category: 'snack', prepTime: 15, cookTime: 20, servings: 12, calories: 160, protein: 12, carbs: 22, fat: 4, fiber: 3, ingredients: ['Bananas', 'Protein powder', 'Oat flour', 'Eggs', 'Baking soda'], instructions: ['Mash bananas', 'Mix all ingredients', 'Bake at 350F for 20 min'], imageUrl: '/demo-recipes/protein-muffins.jpg', isApproved: true},
  {name: 'Rice Cakes with Toppings', category: 'snack', prepTime: 3, cookTime: 0, servings: 1, calories: 180, protein: 10, carbs: 24, fat: 6, fiber: 3, ingredients: ['Rice cakes', 'Peanut butter', 'Banana', 'Honey'], instructions: ['Spread peanut butter on rice cakes', 'Top with banana slices', 'Drizzle honey'], imageUrl: '/demo-recipes/rice-cakes.jpg', isApproved: true},

  // PENDING APPROVAL RECIPES (to show admin workflow)
  {name: 'Experimental Protein Ice Cream', category: 'snack', prepTime: 10, cookTime: 0, servings: 1, calories: 220, protein: 25, carbs: 28, fat: 4, fiber: 5, ingredients: ['Frozen bananas', 'Protein powder', 'Almond milk', 'Cocoa powder'], instructions: ['Blend all ingredients until creamy', 'Freeze for 30 minutes if desired'], imageUrl: '/demo-recipes/protein-ice-cream.jpg', isApproved: false},
  {name: 'Keto Fat Bomb', category: 'snack', prepTime: 15, cookTime: 0, servings: 12, calories: 180, protein: 4, carbs: 3, fat: 18, fiber: 2, ingredients: ['Cream cheese', 'Butter', 'Coconut oil', 'Stevia', 'Vanilla'], instructions: ['Mix all ingredients', 'Mold into balls', 'Freeze until solid'], imageUrl: '/demo-recipes/keto-fat-bomb.jpg', isApproved: false},
  {name: 'Vegan Protein Bowl', category: 'lunch', prepTime: 20, cookTime: 25, servings: 1, calories: 480, protein: 28, carbs: 65, fat: 12, fiber: 18, ingredients: ['Tempeh', 'Quinoa', 'Kale', 'Sweet potato', 'Tahini'], instructions: ['Bake tempeh', 'Cook quinoa', 'Roast sweet potato', 'Assemble with tahini sauce'], imageUrl: '/demo-recipes/vegan-protein-bowl.jpg', isApproved: false},
  {name: 'Post-Workout Recovery Shake', category: 'snack', prepTime: 5, cookTime: 0, servings: 1, calories: 380, protein: 40, carbs: 48, fat: 6, fiber: 4, ingredients: ['Whey protein', 'Banana', 'Oats', 'Almond milk', 'Honey'], instructions: ['Blend all ingredients', 'Drink within 30 min post-workout'], imageUrl: '/demo-recipes/recovery-shake.jpg', isApproved: false},
  {name: 'Athlete Fuel Bowl', category: 'lunch', prepTime: 25, cookTime: 30, servings: 1, calories: 650, protein: 55, carbs: 75, fat: 18, fiber: 12, ingredients: ['Grilled chicken', 'Brown rice', 'Sweet potato', 'Broccoli', 'Avocado'], instructions: ['Grill chicken', 'Cook rice', 'Bake sweet potato', 'Steam broccoli', 'Assemble with avocado'], imageUrl: '/demo-recipes/athlete-fuel-bowl.jpg', isApproved: false}
];

const ALL_RECIPES = [...DEMO_RECIPES, ...ADDITIONAL_RECIPES];

// ===== DATABASE OPERATIONS =====

async function createDemoUsers(client) {
  console.log('\n📝 Creating demo users...');

  const allUsers = [...DEMO_ADMINS, ...DEMO_TRAINERS, ...DEMO_CUSTOMERS];

  for (const user of allUsers) {
    const hashedPassword = await hashPassword(user.password);

    await client.query(`
      INSERT INTO users (email, password, name, role, profile_picture, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE
      SET password = EXCLUDED.password,
          name = EXCLUDED.name,
          profile_picture = EXCLUDED.profile_picture,
          updated_at = CURRENT_TIMESTAMP
    `, [user.email, hashedPassword, user.fullName, user.role, user.profileImageUrl]);

    console.log(`  ✓ Created ${user.role}: ${user.fullName} (${user.email})`);
  }

  console.log(`✅ Created ${allUsers.length} demo users`);
}

async function createDemoRecipes(client) {
  console.log('\n📝 Creating demo recipes...');

  let approvedCount = 0;
  let pendingCount = 0;

  for (const recipe of ALL_RECIPES) {
    // Convert category string to meal_types jsonb array
    const mealTypes = JSON.stringify([recipe.category]);

    // Convert ingredients array to JSONB format
    const ingredientsJson = JSON.stringify(
      recipe.ingredients.map((ing, idx) => ({
        id: idx + 1,
        text: ing,
        quantity: '',
        unit: ''
      }))
    );

    // Check if recipe already exists
    const existingRecipe = await client.query('SELECT id FROM recipes WHERE name = $1', [recipe.name]);

    if (existingRecipe.rows.length > 0) {
      // Update existing recipe
      await client.query(`
        UPDATE recipes
        SET meal_types = $1,
            calories_kcal = $2,
            protein_grams = $3,
            is_approved = $4,
            last_updated_timestamp = CURRENT_TIMESTAMP
        WHERE name = $5
      `, [mealTypes, recipe.calories, recipe.protein, recipe.isApproved, recipe.name]);
    } else {
      // Insert new recipe
      await client.query(`
        INSERT INTO recipes (
          name, meal_types, prep_time_minutes, cook_time_minutes, servings,
          calories_kcal, protein_grams, carbs_grams, fat_grams,
          ingredients_json, instructions_text, image_url, is_approved,
          creation_timestamp, last_updated_timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        recipe.name, mealTypes, recipe.prepTime, recipe.cookTime, recipe.servings,
        recipe.calories, recipe.protein, recipe.carbs, recipe.fat,
        ingredientsJson, recipe.instructions.join(' '), recipe.imageUrl, recipe.isApproved
      ]);
    }

    if (recipe.isApproved) {
      approvedCount++;
      console.log(`  ✓ Created approved recipe: ${recipe.name}`);
    } else {
      pendingCount++;
      console.log(`  ⏳ Created pending recipe: ${recipe.name}`);
    }
  }

  console.log(`✅ Created ${ALL_RECIPES.length} recipes (${approvedCount} approved, ${pendingCount} pending)`);
}

async function createTrainerCustomerRelationships(client) {
  console.log('\n📝 Creating trainer-customer relationships...');

  for (const customer of DEMO_CUSTOMERS) {
    if (!customer.assignedTrainer) continue;

    // Get trainer and customer IDs
    const trainerResult = await client.query('SELECT id FROM users WHERE email = $1', [customer.assignedTrainer]);
    const customerResult = await client.query('SELECT id FROM users WHERE email = $1', [customer.email]);

    if (trainerResult.rows.length === 0 || customerResult.rows.length === 0) {
      console.log(`  ⚠️  Skipping ${customer.fullName} - trainer or customer not found`);
      continue;
    }

    const trainerId = trainerResult.rows[0].id;
    const customerId = customerResult.rows[0].id;

    // Generate unique token
    const token = `demo-${trainerId}-${customerId}-${Date.now()}`;

    // Check if invitation already exists
    const existingInvitation = await client.query(
      'SELECT id FROM customer_invitations WHERE trainer_id = $1 AND customer_email = $2',
      [trainerId, customer.email]
    );

    if (existingInvitation.rows.length === 0) {
      // Create invitation (accepted - used_at is set to indicate it was used)
      await client.query(`
        INSERT INTO customer_invitations (
          trainer_id, customer_email, token, expires_at, used_at, created_at
        )
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '30 days')
      `, [trainerId, customer.email, token]);
    }

    console.log(`  ✓ Created relationship: ${customer.assignedTrainer.split('@')[0]} → ${customer.fullName}`);
  }

  console.log(`✅ Created ${DEMO_CUSTOMERS.filter(c => c.assignedTrainer).length} trainer-customer relationships`);
}

async function createProgressData(client) {
  console.log('\n📝 Creating progress tracking data...');

  let measurementCount = 0;
  let goalCount = 0;

  for (const customer of DEMO_CUSTOMERS) {
    const customerResult = await client.query('SELECT id FROM users WHERE email = $1', [customer.email]);
    if (customerResult.rows.length === 0) continue;

    const customerId = customerResult.rows[0].id;

    // Create progress measurements (6 data points over time)
    const weeklyProgress = [];
    const totalWeeks = 8;
    const weightChange = customer.currentWeight - customer.startWeight;
    const weeklyChange = weightChange / totalWeeks;

    for (let week = 0; week <= totalWeeks; week++) {
      const currentWeight = customer.startWeight + (weeklyChange * week);
      const measurementDate = new Date();
      measurementDate.setDate(measurementDate.getDate() - ((totalWeeks - week) * 7));

      // Realistic body measurements that change with weight
      const bodyFatPercentage = customer.goalType === 'muscle_gain'
        ? 12 + (week * 0.2) // Slight BF increase during bulk
        : 22 - (week * 0.5); // BF decrease during cut

      const waistCm = customer.goalType === 'muscle_gain'
        ? 80 + (week * 0.3)
        : 90 - (week * 0.8);

      await client.query(`
        INSERT INTO progress_measurements (
          customer_id, measurement_date, weight_kg, weight_lbs,
          chest_cm, waist_cm, hips_cm, thigh_cm, bicep_cm,
          body_fat_percentage, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING
      `, [
        customerId,
        measurementDate,
        currentWeight.toFixed(1),
        (currentWeight * 2.20462).toFixed(1), // kg to lbs
        95.0, // chest_cm (example)
        waistCm.toFixed(1),
        100.0, // hips_cm (example)
        58.0, // thigh_cm (example)
        35.0, // bicep_cm (example)
        bodyFatPercentage.toFixed(1),
        week === 0 ? 'Baseline measurement' : week === totalWeeks ? 'Current measurement - great progress!' : `Week ${week} check-in`
      ]);

      measurementCount++;
    }

    // Create customer goal
    const progressPercentage = Math.min(100, Math.round(
      ((customer.startWeight - customer.currentWeight) / (customer.startWeight - customer.targetWeight)) * 100
    ));

    await client.query(`
      INSERT INTO customer_goals (
        customer_id, goal_type, goal_name, target_value, current_value,
        target_date, progress_percentage, status, notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `, [
      customerId,
      customer.goalType,
      customer.goalType === 'muscle_gain' ? 'Build Lean Muscle' :
      customer.goalType === 'performance' ? 'Improve Athletic Performance' :
      customer.goalType === 'body_fat' ? 'Reduce Body Fat %' : 'Reach Target Weight',
      customer.targetWeight,
      customer.currentWeight,
      new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)), // 60 days from now
      progressPercentage,
      progressPercentage >= 100 ? 'achieved' : 'active',
      customer.progressNotes
    ]);

    goalCount++;

    console.log(`  ✓ Created progress data for ${customer.fullName} (${measurementCount} measurements)`);
  }

  console.log(`✅ Created ${measurementCount} measurements and ${goalCount} goals`);
}

async function createDemoMealPlans(client) {
  console.log('\n📝 Creating demo meal plans...');

  let mealPlanCount = 0;

  // Get approved recipes for meal plans
  const recipesResult = await client.query('SELECT * FROM recipes WHERE is_approved = true ORDER BY RANDOM()');
  const recipes = recipesResult.rows;

  if (recipes.length < 10) {
    console.log('  ⚠️  Not enough approved recipes for meal plans');
    return;
  }

  const mealPlanTemplates = [
    {
      name: 'High Protein Muscle Builder',
      description: '3000 calorie muscle-building plan with 200g+ protein daily',
      targetCalories: 3000,
      targetProtein: 200,
      daysPerWeek: 7,
      assignTo: ['demo.customer.bulking@evofitmeals.com', 'demo.customer.competitor@evofitmeals.com']
    },
    {
      name: 'Fat Loss Accelerator',
      description: '1800 calorie deficit plan optimized for fat loss',
      targetCalories: 1800,
      targetProtein: 150,
      daysPerWeek: 7,
      assignTo: ['demo.customer.transformation@evofitmeals.com', 'demo.customer.mom@evofitmeals.com']
    },
    {
      name: 'Keto Fat Adaptation',
      description: 'Low-carb, high-fat ketogenic plan for metabolic health',
      targetCalories: 2000,
      targetProtein: 120,
      daysPerWeek: 7,
      assignTo: ['demo.customer.keto@evofitmeals.com']
    },
    {
      name: 'Plant-Based Power',
      description: 'Vegan meal plan with complete protein sources',
      targetCalories: 2200,
      targetProtein: 140,
      daysPerWeek: 7,
      assignTo: ['demo.customer.vegan@evofitmeals.com']
    },
    {
      name: 'Athlete Performance Plan',
      description: 'Sport-specific nutrition for peak performance',
      targetCalories: 2800,
      targetProtein: 180,
      daysPerWeek: 7,
      assignTo: ['demo.customer.athlete@evofitmeals.com']
    },
    {
      name: 'Maintenance & Lifestyle',
      description: 'Balanced maintenance plan for staying lean year-round',
      targetCalories: 2400,
      targetProtein: 160,
      daysPerWeek: 7,
      assignTo: ['demo.customer.maintenance@evofitmeals.com']
    }
  ];

  for (const template of mealPlanTemplates) {
    // Create meal plan structure
    const meals = [];
    const mealsPerDay = 4; // breakfast, lunch, dinner, snack

    for (let day = 0; day < template.daysPerWeek; day++) {
      const dayMeals = [];

      // Breakfast
      const breakfast = recipes.find(r => r.category === 'breakfast');
      if (breakfast) {
        dayMeals.push({
          name: breakfast.name,
          time: '08:00',
          category: 'breakfast',
          nutrition: {
            calories: breakfast.calories,
            protein: breakfast.protein,
            carbs: breakfast.carbs,
            fat: breakfast.fat,
            fiber: breakfast.fiber
          }
        });
      }

      // Lunch
      const lunch = recipes.find(r => r.category === 'lunch');
      if (lunch) {
        dayMeals.push({
          name: lunch.name,
          time: '13:00',
          category: 'lunch',
          nutrition: {
            calories: lunch.calories,
            protein: lunch.protein,
            carbs: lunch.carbs,
            fat: lunch.fat,
            fiber: lunch.fiber
          }
        });
      }

      // Dinner
      const dinner = recipes.find(r => r.category === 'dinner');
      if (dinner) {
        dayMeals.push({
          name: dinner.name,
          time: '19:00',
          category: 'dinner',
          nutrition: {
            calories: dinner.calories,
            protein: dinner.protein,
            carbs: dinner.carbs,
            fat: dinner.fat,
            fiber: dinner.fiber
          }
        });
      }

      // Snack
      const snack = recipes.find(r => r.category === 'snack');
      if (snack) {
        dayMeals.push({
          name: snack.name,
          time: '15:00',
          category: 'snack',
          nutrition: {
            calories: snack.calories,
            protein: snack.protein,
            carbs: snack.carbs,
            fat: snack.fat,
            fiber: snack.fiber
          }
        });
      }

      meals.push(...dayMeals);
    }

    const mealPlanData = {
      planName: template.name,
      description: template.description,
      dailyCalorieTarget: template.targetCalories,
      dailyProteinTarget: template.targetProtein,
      daysPerWeek: template.daysPerWeek,
      meals: meals
    };

    // Get trainer ID from the first customer in assignTo list
    let trainerId = null;
    if (template.assignTo.length > 0) {
      const firstCustomer = DEMO_CUSTOMERS.find(c => c.email === template.assignTo[0]);
      if (firstCustomer && firstCustomer.assignedTrainer) {
        const trainerResult = await client.query('SELECT id FROM users WHERE email = $1', [firstCustomer.assignedTrainer]);
        if (trainerResult.rows.length > 0) {
          trainerId = trainerResult.rows[0].id;
        }
      }
    }

    // Skip if no trainer found
    if (!trainerId) {
      console.log(`  ⚠️  Skipping meal plan: ${template.name} - no trainer found`);
      continue;
    }

    // Insert meal plan with trainer_id
    const mealPlanResult = await client.query(`
      INSERT INTO trainer_meal_plans (trainer_id, meal_plan_data, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [trainerId, JSON.stringify(mealPlanData)]);

    const mealPlanId = mealPlanResult.rows[0].id;
    mealPlanCount++;

    // Assign to customers
    for (const customerEmail of template.assignTo) {
      const customerResult = await client.query('SELECT id FROM users WHERE email = $1', [customerEmail]);
      if (customerResult.rows.length === 0) continue;

      const customerId = customerResult.rows[0].id;

      // Get trainer ID
      const customer = DEMO_CUSTOMERS.find(c => c.email === customerEmail);
      if (!customer || !customer.assignedTrainer) continue;

      const trainerResult = await client.query('SELECT id FROM users WHERE email = $1', [customer.assignedTrainer]);
      if (trainerResult.rows.length === 0) continue;

      const trainerId = trainerResult.rows[0].id;

      // Check if assignment already exists
      const existingAssignment = await client.query(
        'SELECT id FROM meal_plan_assignments WHERE meal_plan_id = $1 AND customer_id = $2',
        [mealPlanId, customerId]
      );

      if (existingAssignment.rows.length === 0) {
        // Create meal plan assignment
        await client.query(`
          INSERT INTO meal_plan_assignments (
            assigned_by, customer_id, meal_plan_id, assigned_at
          )
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '7 days')
        `, [trainerId, customerId, mealPlanId]);
      }
    }

    console.log(`  ✓ Created meal plan: ${template.name} (assigned to ${template.assignTo.length} customers)`);
  }

  console.log(`✅ Created ${mealPlanCount} demo meal plans`);
}

// ===== MAIN EXECUTION =====

async function seedDemoData() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('\n🌱 Starting demo data seed...\n');
    console.log('This will create impressive demo data for client presentations:');
    console.log('  • 3 admin accounts');
    console.log('  • 5 trainer accounts with specialties');
    console.log('  • 10 customer accounts with progress journeys');
    console.log('  • 50+ realistic recipes');
    console.log('  • 20+ meal plans with assignments');
    console.log('  • Complete progress tracking data\n');

    await createDemoUsers(client);
    await createDemoRecipes(client);
    await createTrainerCustomerRelationships(client);
    await createProgressData(client);
    await createDemoMealPlans(client);

    console.log('\n✅ ========================================');
    console.log('✅ DEMO DATA SEED COMPLETE!');
    console.log('✅ ========================================\n');

    console.log('📊 Summary:');
    console.log(`  • ${DEMO_ADMINS.length} admin accounts created`);
    console.log(`  • ${DEMO_TRAINERS.length} trainer accounts created`);
    console.log(`  • ${DEMO_CUSTOMERS.length} customer accounts created`);
    console.log(`  • ${ALL_RECIPES.length} recipes created (${ALL_RECIPES.filter(r => r.isApproved).length} approved, ${ALL_RECIPES.filter(r => !r.isApproved).length} pending)`);
    console.log(`  • Progress data for all customers (weekly measurements)`);
    console.log(`  • 6+ meal plans with assignments\n`);

    console.log('🔐 Demo Account Credentials:');
    console.log('\nADMINS:');
    DEMO_ADMINS.forEach(admin => {
      console.log(`  ${admin.fullName}: ${admin.email} / ${admin.password}`);
    });

    console.log('\nTRAINERS:');
    DEMO_TRAINERS.forEach(trainer => {
      console.log(`  ${trainer.fullName} (${trainer.specialty})`);
      console.log(`    ${trainer.email} / ${trainer.password}`);
    });

    console.log('\nCUSTOMERS:');
    DEMO_CUSTOMERS.forEach(customer => {
      console.log(`  ${customer.fullName} (${customer.goalType})`);
      console.log(`    ${customer.email} / ${customer.password}`);
      console.log(`    Progress: ${customer.startWeight}kg → ${customer.currentWeight}kg (Target: ${customer.targetWeight}kg)`);
    });

    console.log('\n🎨 Next Steps:');
    console.log('  1. Visit http://localhost:4000');
    console.log('  2. Login with any demo account above');
    console.log('  3. Explore realistic customer journeys, meal plans, and progress');
    console.log('  4. Demo the complete trainer-customer workflow');
    console.log('  5. Show pending recipes in admin panel for approval workflow\n');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

// Run the seed
seedDemoData().catch(console.error);
