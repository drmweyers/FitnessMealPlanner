/**
 * Generate 50 Tripwire Meal Plan Templates
 *
 * Creates 50 done-for-you meal plan JSON templates for the tripwire product:
 * - 8 dietary protocols x 6 templates each = 48
 * - 2 bonus templates (athlete performance, longevity)
 * - Each template: 7 days, 3 meals + 1 snack per day
 * - Realistic calorie targets (1500-2500 range)
 *
 * Output: client/public/downloads/tripwire-templates.json
 *
 * Usage: npx tsx scripts/generate-tripwire-templates.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Data: Dietary Protocols & Recipe Libraries
// ============================================================

interface MealTemplate {
  recipeName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string;
}

interface ProtocolConfig {
  protocol: string;
  label: string;
  calorieTargets: number[];
  breakfasts: MealTemplate[];
  lunches: MealTemplate[];
  dinners: MealTemplate[];
  snacks: MealTemplate[];
}

const protocols: ProtocolConfig[] = [
  {
    protocol: 'high-protein',
    label: 'High-Protein',
    calorieTargets: [1800, 2000, 2200, 2400, 2500, 1900],
    breakfasts: [
      { recipeName: 'Protein Scramble with Turkey Sausage', calories: 420, protein: 38, carbs: 12, fat: 24, ingredients: ['4 eggs', '2 turkey sausage links', '1 cup spinach', '1/4 cup feta cheese'], instructions: 'Cook sausage, scramble eggs with spinach, top with feta.' },
      { recipeName: 'Greek Yogurt Power Bowl', calories: 380, protein: 35, carbs: 40, fat: 10, ingredients: ['1.5 cups Greek yogurt', '1/2 cup granola', '1 scoop protein powder', '1/2 cup blueberries'], instructions: 'Layer yogurt, mix in protein powder, top with granola and berries.' },
      { recipeName: 'Cottage Cheese Pancakes', calories: 400, protein: 36, carbs: 30, fat: 16, ingredients: ['1 cup cottage cheese', '2 eggs', '1/2 cup oats', '1 banana'], instructions: 'Blend all ingredients, cook as pancakes on medium heat.' },
      { recipeName: 'Smoked Salmon Egg Wrap', calories: 390, protein: 34, carbs: 22, fat: 20, ingredients: ['3 eggs', '3 oz smoked salmon', '1 whole wheat tortilla', 'cream cheese', 'capers'], instructions: 'Scramble eggs, layer in tortilla with salmon and cream cheese.' },
      { recipeName: 'Chicken Sausage Breakfast Bowl', calories: 440, protein: 40, carbs: 28, fat: 20, ingredients: ['2 chicken sausage links', '3 eggs', 'sweet potato hash', 'avocado'], instructions: 'Dice and cook sweet potato, add sausage and eggs, top with avocado.' },
      { recipeName: 'Protein Oatmeal with Egg Whites', calories: 360, protein: 32, carbs: 42, fat: 8, ingredients: ['1 cup oats', '1 cup egg whites', '1 scoop whey protein', '1 tbsp almond butter'], instructions: 'Cook oats, stir in egg whites while hot, add protein powder and almond butter.' },
      { recipeName: 'Steak and Eggs Breakfast', calories: 480, protein: 44, carbs: 8, fat: 30, ingredients: ['4 oz sirloin steak', '3 eggs', '1 cup mushrooms', 'butter'], instructions: 'Pan-sear steak to desired doneness. Fry eggs in butter with mushrooms.' },
    ],
    lunches: [
      { recipeName: 'Grilled Chicken Caesar Salad', calories: 520, protein: 45, carbs: 18, fat: 30, ingredients: ['6 oz grilled chicken breast', 'romaine lettuce', 'parmesan', 'Caesar dressing', 'croutons'], instructions: 'Grill chicken, chop romaine, toss with dressing, top with parmesan and croutons.' },
      { recipeName: 'Turkey Meatball Zucchini Bowl', calories: 480, protein: 42, carbs: 24, fat: 22, ingredients: ['5 oz ground turkey', 'zucchini noodles', 'marinara sauce', 'mozzarella'], instructions: 'Form turkey meatballs, bake at 400F for 20 min. Serve over spiralized zucchini with sauce.' },
      { recipeName: 'Tuna Steak with Quinoa', calories: 500, protein: 48, carbs: 32, fat: 18, ingredients: ['6 oz tuna steak', '1 cup quinoa', 'edamame', 'soy ginger dressing'], instructions: 'Sear tuna 2 min per side. Serve over quinoa with edamame and dressing.' },
      { recipeName: 'Chicken and Black Bean Burrito Bowl', calories: 540, protein: 44, carbs: 42, fat: 18, ingredients: ['6 oz chicken breast', 'black beans', 'brown rice', 'salsa', 'Greek yogurt'], instructions: 'Cook chicken with spices, serve over rice and beans with salsa.' },
      { recipeName: 'Shrimp and Avocado Lettuce Wraps', calories: 420, protein: 38, carbs: 14, fat: 26, ingredients: ['6 oz shrimp', '1 avocado', 'butter lettuce', 'mango salsa', 'lime'], instructions: 'Saute shrimp with garlic, serve in lettuce cups with avocado and salsa.' },
      { recipeName: 'Lean Beef Stir-Fry', calories: 510, protein: 46, carbs: 28, fat: 24, ingredients: ['6 oz flank steak', 'broccoli', 'bell peppers', 'soy sauce', 'brown rice'], instructions: 'Slice steak thin, stir-fry with vegetables and soy sauce. Serve over rice.' },
      { recipeName: 'Salmon Poke Bowl', calories: 490, protein: 40, carbs: 36, fat: 20, ingredients: ['6 oz salmon', 'sushi rice', 'cucumber', 'avocado', 'soy sauce', 'sesame seeds'], instructions: 'Cube salmon, season with soy sauce. Serve over rice with toppings.' },
    ],
    dinners: [
      { recipeName: 'Herb-Crusted Salmon with Asparagus', calories: 520, protein: 42, carbs: 16, fat: 32, ingredients: ['6 oz salmon fillet', 'asparagus', 'lemon', 'herbs', 'olive oil'], instructions: 'Coat salmon with herbs, bake at 400F for 15 min with asparagus.' },
      { recipeName: 'Grilled Chicken Thighs with Sweet Potato', calories: 550, protein: 44, carbs: 38, fat: 22, ingredients: ['6 oz chicken thighs', 'sweet potato', 'green beans', 'olive oil', 'garlic'], instructions: 'Grill chicken, roast sweet potato and green beans at 425F.' },
      { recipeName: 'Lean Ground Beef Stuffed Peppers', calories: 480, protein: 40, carbs: 30, fat: 22, ingredients: ['5 oz lean ground beef', '2 bell peppers', 'brown rice', 'tomato sauce', 'cheese'], instructions: 'Mix beef with rice and sauce, stuff peppers, bake at 375F for 30 min.' },
      { recipeName: 'Baked Cod with Roasted Vegetables', calories: 400, protein: 38, carbs: 24, fat: 16, ingredients: ['6 oz cod fillet', 'zucchini', 'cherry tomatoes', 'olive oil', 'lemon'], instructions: 'Place cod and vegetables on sheet pan, bake at 400F for 18 min.' },
      { recipeName: 'Turkey Chili', calories: 460, protein: 42, carbs: 34, fat: 16, ingredients: ['6 oz ground turkey', 'kidney beans', 'diced tomatoes', 'onion', 'chili powder'], instructions: 'Brown turkey, add beans and tomatoes, simmer with spices for 30 min.' },
      { recipeName: 'Chicken Marsala with Broccoli', calories: 500, protein: 44, carbs: 20, fat: 26, ingredients: ['6 oz chicken breast', 'mushrooms', 'marsala wine', 'butter', 'broccoli'], instructions: 'Saute chicken, make marsala sauce with mushrooms and wine. Steam broccoli.' },
      { recipeName: 'Grilled Flank Steak with Chimichurri', calories: 530, protein: 46, carbs: 12, fat: 34, ingredients: ['6 oz flank steak', 'parsley', 'garlic', 'olive oil', 'red wine vinegar'], instructions: 'Grill steak to medium-rare. Blend chimichurri ingredients and drizzle over steak.' },
    ],
    snacks: [
      { recipeName: 'Protein Shake with Banana', calories: 250, protein: 30, carbs: 28, fat: 4, ingredients: ['1 scoop whey protein', '1 banana', '1 cup almond milk', 'ice'], instructions: 'Blend all ingredients until smooth.' },
      { recipeName: 'Hard-Boiled Eggs and Almonds', calories: 220, protein: 18, carbs: 6, fat: 16, ingredients: ['2 hard-boiled eggs', '1 oz almonds'], instructions: 'Boil eggs for 10 min, cool and peel. Pair with almonds.' },
      { recipeName: 'Turkey Jerky and String Cheese', calories: 200, protein: 24, carbs: 8, fat: 8, ingredients: ['2 oz turkey jerky', '1 string cheese'], instructions: 'Ready to eat - no preparation needed.' },
      { recipeName: 'Cottage Cheese with Pineapple', calories: 210, protein: 22, carbs: 20, fat: 4, ingredients: ['1 cup low-fat cottage cheese', '1/2 cup pineapple chunks'], instructions: 'Top cottage cheese with pineapple.' },
      { recipeName: 'Protein Energy Balls', calories: 230, protein: 16, carbs: 24, fat: 10, ingredients: ['1/4 cup protein powder', 'oats', 'peanut butter', 'honey', 'chocolate chips'], instructions: 'Mix all ingredients, roll into balls, refrigerate for 30 min.' },
      { recipeName: 'Tuna Celery Boats', calories: 180, protein: 22, carbs: 4, fat: 8, ingredients: ['1 can tuna', '4 celery stalks', '1 tbsp mayo', 'mustard'], instructions: 'Mix tuna with mayo and mustard, fill celery stalks.' },
      { recipeName: 'Greek Yogurt with Honey and Walnuts', calories: 240, protein: 20, carbs: 22, fat: 10, ingredients: ['1 cup Greek yogurt', '1 tbsp honey', '1 oz walnuts'], instructions: 'Top yogurt with honey and crushed walnuts.' },
    ],
  },
  {
    protocol: 'keto',
    label: 'Keto',
    calorieTargets: [1600, 1800, 2000, 2200, 1700, 1900],
    breakfasts: [
      { recipeName: 'Bacon and Avocado Eggs', calories: 480, protein: 24, carbs: 6, fat: 42, ingredients: ['3 eggs', '3 bacon strips', '1/2 avocado', 'butter'], instructions: 'Fry bacon, cook eggs in bacon fat, serve with sliced avocado.' },
      { recipeName: 'Keto Bulletproof Coffee with Eggs', calories: 450, protein: 20, carbs: 4, fat: 40, ingredients: ['2 eggs', 'coffee', '1 tbsp MCT oil', '1 tbsp butter', 'cream cheese'], instructions: 'Blend coffee with MCT oil and butter. Scramble eggs with cream cheese.' },
      { recipeName: 'Sausage Egg Muffins', calories: 420, protein: 28, carbs: 4, fat: 34, ingredients: ['4 eggs', '2 sausage patties', 'cheddar cheese', 'bell pepper'], instructions: 'Mix all ingredients, pour into muffin tin, bake at 350F for 20 min.' },
      { recipeName: 'Smoked Salmon Cream Cheese Roll-Ups', calories: 380, protein: 22, carbs: 4, fat: 32, ingredients: ['4 oz smoked salmon', '3 oz cream cheese', 'capers', 'dill'], instructions: 'Spread cream cheese on salmon slices, add capers and dill, roll up.' },
      { recipeName: 'Keto Coconut Chia Pudding', calories: 360, protein: 12, carbs: 8, fat: 34, ingredients: ['3 tbsp chia seeds', '1 cup coconut cream', 'stevia', 'vanilla', 'coconut flakes'], instructions: 'Mix chia with coconut cream and stevia, refrigerate overnight. Top with coconut flakes.' },
      { recipeName: 'Ham and Cheese Omelette', calories: 440, protein: 30, carbs: 4, fat: 34, ingredients: ['3 eggs', '2 oz ham', 'Swiss cheese', 'mushrooms', 'butter'], instructions: 'Beat eggs, cook in butter, fill with ham, cheese, and sauteed mushrooms.' },
      { recipeName: 'Keto Almond Flour Waffles', calories: 400, protein: 18, carbs: 8, fat: 36, ingredients: ['2 eggs', '1/2 cup almond flour', '2 tbsp butter', 'cream cheese', 'vanilla'], instructions: 'Mix all ingredients, cook in waffle iron. Top with butter and sugar-free syrup.' },
    ],
    lunches: [
      { recipeName: 'Bunless Bacon Cheeseburger Salad', calories: 520, protein: 36, carbs: 8, fat: 40, ingredients: ['5 oz ground beef', 'bacon', 'cheddar', 'lettuce', 'pickles', 'mustard'], instructions: 'Cook burger patty, crumble over salad with bacon, cheese, and pickles.' },
      { recipeName: 'Keto Chicken Alfredo Zoodles', calories: 500, protein: 38, carbs: 10, fat: 36, ingredients: ['5 oz chicken breast', 'zucchini noodles', 'heavy cream', 'parmesan', 'garlic'], instructions: 'Cook chicken, make alfredo sauce with cream and parmesan, toss with zoodles.' },
      { recipeName: 'Tuna-Stuffed Avocado', calories: 440, protein: 30, carbs: 8, fat: 34, ingredients: ['1 can tuna', '1 avocado', 'mayo', 'celery', 'lemon juice'], instructions: 'Mix tuna with mayo and celery, halve avocado, fill with tuna mixture.' },
      { recipeName: 'Keto Cobb Salad', calories: 540, protein: 34, carbs: 10, fat: 42, ingredients: ['4 oz grilled chicken', 'bacon', 'avocado', 'blue cheese', 'hard-boiled egg', 'ranch'], instructions: 'Arrange all toppings over mixed greens, drizzle with ranch.' },
      { recipeName: 'Shrimp Cauliflower Fried Rice', calories: 420, protein: 32, carbs: 12, fat: 28, ingredients: ['5 oz shrimp', 'cauliflower rice', 'egg', 'soy sauce', 'sesame oil', 'scallions'], instructions: 'Rice cauliflower, stir-fry with shrimp, egg, and seasonings.' },
      { recipeName: 'Italian Antipasto Plate', calories: 480, protein: 28, carbs: 8, fat: 38, ingredients: ['salami', 'mozzarella', 'olives', 'artichoke hearts', 'roasted peppers', 'olive oil'], instructions: 'Arrange all items on a plate. Drizzle with olive oil.' },
      { recipeName: 'Keto BLT Lettuce Wraps', calories: 400, protein: 22, carbs: 6, fat: 34, ingredients: ['4 bacon strips', 'lettuce leaves', 'tomato', 'mayo', 'avocado'], instructions: 'Cook bacon, layer in lettuce wraps with tomato, mayo, and avocado.' },
    ],
    dinners: [
      { recipeName: 'Ribeye Steak with Garlic Butter', calories: 600, protein: 42, carbs: 4, fat: 46, ingredients: ['8 oz ribeye steak', 'garlic butter', 'asparagus', 'olive oil'], instructions: 'Sear ribeye 4 min per side, rest with garlic butter. Roast asparagus.' },
      { recipeName: 'Baked Salmon with Dill Cream Sauce', calories: 520, protein: 38, carbs: 6, fat: 40, ingredients: ['6 oz salmon', 'sour cream', 'dill', 'lemon', 'capers', 'broccoli'], instructions: 'Bake salmon at 400F, top with dill cream sauce. Serve with steamed broccoli.' },
      { recipeName: 'Keto Chicken Parmesan (No Breadcrumbs)', calories: 480, protein: 40, carbs: 8, fat: 32, ingredients: ['6 oz chicken breast', 'pork rinds', 'marinara sauce', 'mozzarella', 'parmesan'], instructions: 'Coat chicken in crushed pork rinds, bake, top with sauce and cheese.' },
      { recipeName: 'Pork Belly with Roasted Brussels Sprouts', calories: 560, protein: 30, carbs: 10, fat: 46, ingredients: ['5 oz pork belly', 'Brussels sprouts', 'bacon fat', 'garlic', 'salt'], instructions: 'Roast pork belly at 425F. Toss Brussels sprouts in bacon fat and roast.' },
      { recipeName: 'Lamb Chops with Mint Compound Butter', calories: 540, protein: 36, carbs: 4, fat: 44, ingredients: ['2 lamb chops', 'butter', 'fresh mint', 'garlic', 'spinach'], instructions: 'Pan-sear lamb chops, top with mint butter. Saute spinach as a side.' },
      { recipeName: 'Keto Taco Skillet', calories: 500, protein: 34, carbs: 10, fat: 38, ingredients: ['5 oz ground beef', 'taco seasoning', 'sour cream', 'cheese', 'jalapenos', 'lettuce'], instructions: 'Brown beef with seasoning, top with cheese and sour cream. Serve over shredded lettuce.' },
      { recipeName: 'Creamy Tuscan Chicken', calories: 520, protein: 38, carbs: 8, fat: 40, ingredients: ['6 oz chicken thighs', 'sun-dried tomatoes', 'spinach', 'heavy cream', 'parmesan'], instructions: 'Sear chicken, make cream sauce with sun-dried tomatoes and spinach.' },
    ],
    snacks: [
      { recipeName: 'Cheese and Pepperoni Chips', calories: 200, protein: 14, carbs: 2, fat: 16, ingredients: ['1 oz cheddar cheese', '1 oz pepperoni'], instructions: 'Microwave pepperoni and cheese slices until crispy.' },
      { recipeName: 'Keto Fat Bombs', calories: 180, protein: 4, carbs: 4, fat: 18, ingredients: ['1 oz cream cheese', '1 tbsp coconut oil', '1 tbsp cocoa powder', 'stevia'], instructions: 'Mix all ingredients, freeze in silicone molds for 1 hour.' },
      { recipeName: 'Pork Rinds with Guacamole', calories: 220, protein: 10, carbs: 6, fat: 18, ingredients: ['1 oz pork rinds', '1/4 avocado', 'lime', 'salt', 'cilantro'], instructions: 'Mash avocado with lime and salt for quick guacamole. Dip pork rinds.' },
      { recipeName: 'Macadamia Nuts', calories: 200, protein: 4, carbs: 4, fat: 22, ingredients: ['1 oz macadamia nuts'], instructions: 'Enjoy as-is or lightly toast in a dry pan.' },
      { recipeName: 'Cucumber Cream Cheese Bites', calories: 160, protein: 6, carbs: 6, fat: 14, ingredients: ['1 cucumber', '2 oz cream cheese', 'everything bagel seasoning'], instructions: 'Slice cucumber, top with cream cheese and seasoning.' },
      { recipeName: 'Celery with Almond Butter', calories: 190, protein: 6, carbs: 8, fat: 16, ingredients: ['3 celery stalks', '2 tbsp almond butter'], instructions: 'Fill celery stalks with almond butter.' },
      { recipeName: 'Keto Cheese Crisps', calories: 170, protein: 12, carbs: 2, fat: 14, ingredients: ['2 oz shredded parmesan'], instructions: 'Place small mounds of cheese on parchment, bake at 400F for 5-7 min until crispy.' },
    ],
  },
  {
    protocol: 'mediterranean',
    label: 'Mediterranean',
    calorieTargets: [1800, 2000, 1900, 2100, 2200, 1700],
    breakfasts: [
      { recipeName: 'Mediterranean Shakshuka', calories: 380, protein: 22, carbs: 28, fat: 20, ingredients: ['3 eggs', 'canned tomatoes', 'bell pepper', 'onion', 'feta cheese', 'cumin'], instructions: 'Saute peppers and onion, add tomatoes and spices, create wells for eggs, cover and cook.' },
      { recipeName: 'Greek Yogurt with Honey and Walnuts', calories: 340, protein: 24, carbs: 36, fat: 12, ingredients: ['1.5 cups Greek yogurt', '2 tbsp honey', '1 oz walnuts', 'pomegranate seeds'], instructions: 'Top yogurt with honey, walnuts, and pomegranate seeds.' },
      { recipeName: 'Avocado Toast with Olive Oil and Tomato', calories: 360, protein: 12, carbs: 34, fat: 22, ingredients: ['2 slices sourdough', '1 avocado', 'cherry tomatoes', 'extra virgin olive oil', 'sea salt'], instructions: 'Toast bread, mash avocado on top, add halved tomatoes and drizzle with olive oil.' },
      { recipeName: 'Spinach and Feta Frittata', calories: 380, protein: 26, carbs: 12, fat: 26, ingredients: ['4 eggs', '2 cups spinach', 'feta cheese', 'sun-dried tomatoes', 'olive oil'], instructions: 'Saute spinach, pour in beaten eggs, add feta and tomatoes, bake at 375F for 15 min.' },
      { recipeName: 'Overnight Oats with Dates and Almonds', calories: 400, protein: 14, carbs: 56, fat: 14, ingredients: ['1 cup oats', '1 cup milk', '3 dates', '1 oz almonds', 'cinnamon'], instructions: 'Mix oats with milk and cinnamon, refrigerate overnight. Top with chopped dates and almonds.' },
      { recipeName: 'Whole Wheat Pita with Hummus and Veggies', calories: 350, protein: 14, carbs: 42, fat: 16, ingredients: ['1 whole wheat pita', '1/4 cup hummus', 'cucumber', 'tomato', 'olives'], instructions: 'Warm pita, spread hummus inside, fill with sliced vegetables and olives.' },
      { recipeName: 'Labneh Bowl with Za\'atar', calories: 360, protein: 18, carbs: 30, fat: 20, ingredients: ['1/2 cup labneh', 'olive oil', 'za\'atar', 'pita chips', 'cucumber', 'mint'], instructions: 'Swirl labneh into bowl, drizzle with olive oil, sprinkle za\'atar. Serve with pita and cucumber.' },
    ],
    lunches: [
      { recipeName: 'Grilled Chicken Pita with Tzatziki', calories: 480, protein: 36, carbs: 40, fat: 18, ingredients: ['5 oz chicken breast', 'whole wheat pita', 'tzatziki', 'lettuce', 'tomato', 'red onion'], instructions: 'Grill chicken, slice thin, stuff in pita with tzatziki and vegetables.' },
      { recipeName: 'Mediterranean Quinoa Bowl', calories: 460, protein: 18, carbs: 52, fat: 20, ingredients: ['1 cup quinoa', 'chickpeas', 'cucumber', 'cherry tomatoes', 'kalamata olives', 'feta', 'olive oil dressing'], instructions: 'Cook quinoa, top with all ingredients, drizzle with lemon olive oil dressing.' },
      { recipeName: 'Grilled Lamb Kofta Wrap', calories: 520, protein: 32, carbs: 38, fat: 26, ingredients: ['4 oz ground lamb', 'flatbread', 'parsley', 'onion', 'tahini sauce', 'pickled turnips'], instructions: 'Mix lamb with spices and parsley, grill kofta. Serve in flatbread with tahini.' },
      { recipeName: 'Lentil Soup with Crusty Bread', calories: 440, protein: 22, carbs: 58, fat: 12, ingredients: ['1 cup red lentils', 'onion', 'carrot', 'cumin', 'lemon', 'sourdough bread'], instructions: 'Cook lentils with vegetables and cumin until tender. Blend partially, serve with lemon and bread.' },
      { recipeName: 'Tuna Nicoise Salad', calories: 480, protein: 34, carbs: 28, fat: 26, ingredients: ['5 oz tuna steak', 'green beans', 'hard-boiled egg', 'olives', 'potatoes', 'Dijon vinaigrette'], instructions: 'Sear tuna, arrange over salad with blanched beans, potatoes, egg, and olives.' },
      { recipeName: 'Falafel Bowl', calories: 500, protein: 18, carbs: 56, fat: 24, ingredients: ['4 falafel patties', 'brown rice', 'hummus', 'pickled onions', 'tahini', 'parsley'], instructions: 'Bake falafel at 375F, serve over rice with hummus, pickled onions, and tahini.' },
      { recipeName: 'Greek Village Salad with Grilled Halloumi', calories: 440, protein: 20, carbs: 22, fat: 32, ingredients: ['halloumi cheese', 'tomatoes', 'cucumber', 'red onion', 'olives', 'oregano', 'olive oil'], instructions: 'Grill halloumi slices. Toss vegetables with olive oil and oregano, top with halloumi.' },
    ],
    dinners: [
      { recipeName: 'Baked Sea Bass with Olives and Capers', calories: 440, protein: 38, carbs: 16, fat: 26, ingredients: ['6 oz sea bass', 'cherry tomatoes', 'olives', 'capers', 'white wine', 'olive oil'], instructions: 'Place fish in baking dish with tomatoes, olives, and capers. Splash wine, bake at 400F for 18 min.' },
      { recipeName: 'Chicken Souvlaki with Greek Salad', calories: 500, protein: 40, carbs: 28, fat: 24, ingredients: ['6 oz chicken breast', 'lemon', 'oregano', 'pita', 'tomato', 'cucumber', 'feta'], instructions: 'Marinate chicken in lemon and oregano, grill on skewers. Serve with Greek salad.' },
      { recipeName: 'Lamb Moussaka', calories: 540, protein: 32, carbs: 34, fat: 30, ingredients: ['4 oz ground lamb', 'eggplant', 'potato', 'bechamel sauce', 'cinnamon', 'tomato sauce'], instructions: 'Layer sliced eggplant, potato, meat sauce. Top with bechamel, bake at 375F for 40 min.' },
      { recipeName: 'Herb-Roasted Chicken with Lemon Potatoes', calories: 520, protein: 38, carbs: 36, fat: 24, ingredients: ['6 oz chicken thigh', 'potatoes', 'lemon', 'garlic', 'oregano', 'olive oil'], instructions: 'Roast chicken and potatoes with lemon, garlic, and herbs at 425F for 35 min.' },
      { recipeName: 'Shrimp Saganaki', calories: 420, protein: 34, carbs: 22, fat: 22, ingredients: ['6 oz shrimp', 'tomato sauce', 'feta cheese', 'garlic', 'white wine', 'crusty bread'], instructions: 'Saute shrimp with garlic, add tomato sauce and wine, top with crumbled feta, broil until bubbly.' },
      { recipeName: 'Stuffed Grape Leaves with Grilled Fish', calories: 480, protein: 36, carbs: 30, fat: 24, ingredients: ['6 oz white fish', 'grape leaves', 'rice', 'lemon', 'dill', 'olive oil'], instructions: 'Grill fish with lemon. Serve with pre-made stuffed grape leaves warmed in oven.' },
      { recipeName: 'Mediterranean Baked Cod', calories: 420, protein: 36, carbs: 24, fat: 20, ingredients: ['6 oz cod', 'artichoke hearts', 'sun-dried tomatoes', 'olives', 'white wine', 'herbs'], instructions: 'Layer cod with artichokes, tomatoes, and olives. Bake at 400F for 20 min.' },
    ],
    snacks: [
      { recipeName: 'Hummus with Veggie Sticks', calories: 200, protein: 8, carbs: 22, fat: 10, ingredients: ['1/4 cup hummus', 'carrot sticks', 'cucumber', 'bell pepper strips'], instructions: 'Serve hummus with assorted cut vegetables.' },
      { recipeName: 'Dates Stuffed with Almonds', calories: 180, protein: 4, carbs: 30, fat: 6, ingredients: ['3 Medjool dates', '6 almonds'], instructions: 'Pit dates and stuff each with 2 almonds.' },
      { recipeName: 'Olive Tapenade on Crackers', calories: 190, protein: 4, carbs: 18, fat: 12, ingredients: ['2 tbsp olive tapenade', '6 whole grain crackers'], instructions: 'Spread tapenade on crackers.' },
      { recipeName: 'Fresh Figs with Goat Cheese', calories: 210, protein: 8, carbs: 26, fat: 10, ingredients: ['3 fresh figs', '1 oz goat cheese', 'honey', 'thyme'], instructions: 'Halve figs, top with goat cheese, drizzle with honey.' },
      { recipeName: 'Mixed Nuts and Dried Apricots', calories: 220, protein: 6, carbs: 20, fat: 14, ingredients: ['1 oz mixed nuts', '4 dried apricots'], instructions: 'Combine nuts and apricots for a trail mix.' },
      { recipeName: 'Labneh with Za\'atar and Pita Chips', calories: 200, protein: 8, carbs: 20, fat: 10, ingredients: ['2 tbsp labneh', 'za\'atar', 'olive oil', 'pita chips'], instructions: 'Spread labneh, drizzle with olive oil, sprinkle za\'atar, scoop with pita chips.' },
      { recipeName: 'Greek Yogurt with Pistachios', calories: 190, protein: 16, carbs: 18, fat: 8, ingredients: ['3/4 cup Greek yogurt', '1 oz pistachios', '1 tsp honey'], instructions: 'Top yogurt with shelled pistachios and a drizzle of honey.' },
    ],
  },
  {
    protocol: 'vegan',
    label: 'Plant-Based Vegan',
    calorieTargets: [1600, 1800, 2000, 2200, 1700, 1900],
    breakfasts: [
      { recipeName: 'Tofu Scramble with Vegetables', calories: 360, protein: 22, carbs: 28, fat: 18, ingredients: ['1 block firm tofu', 'turmeric', 'nutritional yeast', 'spinach', 'bell pepper', 'onion'], instructions: 'Crumble tofu, saute with turmeric and vegetables, sprinkle nutritional yeast.' },
      { recipeName: 'Acai Power Bowl', calories: 380, protein: 10, carbs: 62, fat: 12, ingredients: ['1 acai packet', 'banana', 'granola', 'coconut flakes', 'chia seeds', 'berries'], instructions: 'Blend acai with banana, top with granola, coconut, chia seeds, and berries.' },
      { recipeName: 'Overnight Oats with Chia and Berries', calories: 400, protein: 14, carbs: 58, fat: 14, ingredients: ['1 cup oats', '1 cup oat milk', '2 tbsp chia seeds', 'mixed berries', 'maple syrup'], instructions: 'Mix oats, milk, and chia seeds overnight. Top with berries and maple syrup.' },
      { recipeName: 'Avocado Toast with Hemp Seeds', calories: 380, protein: 14, carbs: 34, fat: 24, ingredients: ['2 slices sourdough', '1 avocado', 'hemp seeds', 'red pepper flakes', 'lemon'], instructions: 'Toast bread, mash avocado on top, sprinkle hemp seeds and red pepper flakes, squeeze lemon.' },
      { recipeName: 'Banana Peanut Butter Smoothie', calories: 420, protein: 18, carbs: 52, fat: 18, ingredients: ['2 bananas', '2 tbsp peanut butter', '1 cup soy milk', '1 tbsp flax meal', 'cinnamon'], instructions: 'Blend all ingredients until smooth.' },
      { recipeName: 'Chickpea Flour Omelette', calories: 350, protein: 18, carbs: 32, fat: 16, ingredients: ['1/2 cup chickpea flour', 'water', 'turmeric', 'spinach', 'mushrooms', 'nutritional yeast'], instructions: 'Mix chickpea flour with water and turmeric. Cook like omelette, fill with sauteed veggies.' },
      { recipeName: 'Vegan Granola Parfait', calories: 380, protein: 12, carbs: 56, fat: 14, ingredients: ['coconut yogurt', 'granola', 'mango', 'passion fruit', 'coconut flakes'], instructions: 'Layer coconut yogurt with granola and tropical fruits.' },
    ],
    lunches: [
      { recipeName: 'Vegan Buddha Bowl', calories: 480, protein: 18, carbs: 58, fat: 20, ingredients: ['quinoa', 'roasted sweet potato', 'chickpeas', 'avocado', 'kale', 'tahini dressing'], instructions: 'Roast sweet potato and chickpeas, assemble over quinoa with kale and tahini.' },
      { recipeName: 'Black Bean Tacos', calories: 460, protein: 20, carbs: 56, fat: 18, ingredients: ['black beans', 'corn tortillas', 'avocado', 'salsa', 'cabbage slaw', 'cilantro', 'lime'], instructions: 'Season black beans with cumin, serve in tortillas with toppings.' },
      { recipeName: 'Lentil and Vegetable Curry', calories: 440, protein: 22, carbs: 54, fat: 14, ingredients: ['1 cup lentils', 'coconut milk', 'curry paste', 'spinach', 'tomatoes', 'brown rice'], instructions: 'Simmer lentils in coconut milk with curry paste. Add spinach and tomatoes. Serve over rice.' },
      { recipeName: 'Falafel Wrap with Tahini', calories: 500, protein: 18, carbs: 56, fat: 24, ingredients: ['4 falafel', 'whole wheat wrap', 'tahini', 'lettuce', 'tomato', 'pickled turnips'], instructions: 'Warm falafel, place in wrap with vegetables and drizzle of tahini.' },
      { recipeName: 'Asian Peanut Noodle Bowl', calories: 480, protein: 18, carbs: 52, fat: 24, ingredients: ['rice noodles', 'edamame', 'carrot', 'cucumber', 'peanut sauce', 'cilantro', 'sesame seeds'], instructions: 'Cook noodles, toss with peanut sauce and vegetables. Garnish with cilantro and sesame.' },
      { recipeName: 'Roasted Cauliflower and Chickpea Bowl', calories: 440, protein: 16, carbs: 50, fat: 20, ingredients: ['cauliflower', 'chickpeas', 'brown rice', 'harissa', 'lemon', 'parsley'], instructions: 'Roast cauliflower and chickpeas with harissa at 425F. Serve over rice with lemon and parsley.' },
      { recipeName: 'Tempeh BLT Sandwich', calories: 460, protein: 24, carbs: 42, fat: 24, ingredients: ['4 oz tempeh', 'sourdough bread', 'vegan mayo', 'lettuce', 'tomato', 'smoky marinade'], instructions: 'Slice and marinate tempeh in smoky sauce, pan-fry until crispy. Assemble sandwich.' },
    ],
    dinners: [
      { recipeName: 'Stuffed Bell Peppers with Rice and Beans', calories: 420, protein: 16, carbs: 58, fat: 14, ingredients: ['2 bell peppers', 'brown rice', 'black beans', 'corn', 'tomato sauce', 'cumin'], instructions: 'Mix rice, beans, corn, and sauce. Stuff peppers, bake at 375F for 25 min.' },
      { recipeName: 'Vegan Pad Thai', calories: 480, protein: 18, carbs: 62, fat: 18, ingredients: ['rice noodles', 'tofu', 'bean sprouts', 'peanuts', 'tamarind sauce', 'lime', 'scallions'], instructions: 'Stir-fry tofu, cook noodles, toss with tamarind sauce. Top with sprouts and peanuts.' },
      { recipeName: 'Mushroom and Walnut Bolognese', calories: 460, protein: 16, carbs: 52, fat: 22, ingredients: ['mushrooms', 'walnuts', 'whole wheat pasta', 'marinara sauce', 'onion', 'garlic', 'basil'], instructions: 'Pulse mushrooms and walnuts, saute with onion and garlic. Add marinara, simmer. Serve over pasta.' },
      { recipeName: 'Coconut Curry Vegetables', calories: 440, protein: 14, carbs: 48, fat: 22, ingredients: ['coconut milk', 'sweet potato', 'chickpeas', 'green beans', 'red curry paste', 'jasmine rice'], instructions: 'Simmer vegetables in coconut milk with curry paste. Serve over jasmine rice.' },
      { recipeName: 'Vegan Chili with Cornbread', calories: 500, protein: 22, carbs: 66, fat: 16, ingredients: ['kidney beans', 'black beans', 'diced tomatoes', 'onion', 'chili powder', 'vegan cornbread'], instructions: 'Simmer beans with tomatoes and spices for 30 min. Serve with cornbread.' },
      { recipeName: 'Teriyaki Tofu Stir-Fry', calories: 420, protein: 22, carbs: 48, fat: 16, ingredients: ['firm tofu', 'broccoli', 'snap peas', 'teriyaki sauce', 'brown rice', 'sesame seeds'], instructions: 'Press and cube tofu, stir-fry with vegetables and teriyaki sauce. Serve over rice.' },
      { recipeName: 'Roasted Eggplant with Pomegranate and Tahini', calories: 400, protein: 12, carbs: 42, fat: 22, ingredients: ['1 large eggplant', 'tahini', 'pomegranate seeds', 'pine nuts', 'parsley', 'couscous'], instructions: 'Halve eggplant, roast at 400F for 30 min. Drizzle with tahini, top with pomegranate and pine nuts.' },
    ],
    snacks: [
      { recipeName: 'Hummus with Pita Chips', calories: 200, protein: 8, carbs: 26, fat: 8, ingredients: ['1/4 cup hummus', 'pita chips'], instructions: 'Dip pita chips in hummus.' },
      { recipeName: 'Trail Mix with Dark Chocolate', calories: 220, protein: 6, carbs: 22, fat: 14, ingredients: ['1 oz mixed nuts', 'dark chocolate chips', 'dried cranberries'], instructions: 'Combine all ingredients in a small bag or container.' },
      { recipeName: 'Edamame with Sea Salt', calories: 180, protein: 16, carbs: 12, fat: 8, ingredients: ['1 cup edamame in shells', 'sea salt'], instructions: 'Boil edamame for 5 min, drain, sprinkle with sea salt.' },
      { recipeName: 'Apple Slices with Almond Butter', calories: 210, protein: 6, carbs: 28, fat: 10, ingredients: ['1 apple', '2 tbsp almond butter'], instructions: 'Slice apple, dip in almond butter.' },
      { recipeName: 'Roasted Chickpeas', calories: 190, protein: 10, carbs: 26, fat: 6, ingredients: ['1 cup chickpeas', 'olive oil', 'cumin', 'paprika', 'garlic powder'], instructions: 'Toss chickpeas with oil and spices, roast at 400F for 25 min until crispy.' },
      { recipeName: 'Mango Coconut Chia Pudding', calories: 200, protein: 6, carbs: 28, fat: 8, ingredients: ['2 tbsp chia seeds', 'coconut milk', 'mango cubes', 'maple syrup'], instructions: 'Mix chia with coconut milk overnight, top with mango.' },
      { recipeName: 'Energy Date Balls', calories: 190, protein: 6, carbs: 28, fat: 8, ingredients: ['5 dates', 'oats', 'coconut flakes', 'cocoa powder', 'tahini'], instructions: 'Blend all ingredients, roll into balls, refrigerate.' },
    ],
  },
  {
    protocol: 'paleo',
    label: 'Paleo',
    calorieTargets: [1800, 2000, 2200, 1900, 2100, 1700],
    breakfasts: [
      { recipeName: 'Sweet Potato Hash with Eggs', calories: 420, protein: 24, carbs: 34, fat: 22, ingredients: ['2 eggs', 'sweet potato', 'onion', 'bell pepper', 'avocado oil', 'herbs'], instructions: 'Dice and cook sweet potato with onion and pepper. Fry eggs on top.' },
      { recipeName: 'Paleo Banana Pancakes', calories: 380, protein: 18, carbs: 36, fat: 18, ingredients: ['2 eggs', '1 banana', '2 tbsp almond flour', 'coconut oil', 'blueberries'], instructions: 'Mash banana, mix with eggs and almond flour. Cook in coconut oil. Top with berries.' },
      { recipeName: 'Bacon and Veggie Frittata', calories: 440, protein: 28, carbs: 12, fat: 32, ingredients: ['3 eggs', '3 bacon strips', 'zucchini', 'mushrooms', 'onion', 'ghee'], instructions: 'Cook bacon, saute veggies in ghee, pour eggs over, bake at 375F for 15 min.' },
      { recipeName: 'Smoked Salmon with Avocado', calories: 380, protein: 26, carbs: 10, fat: 28, ingredients: ['4 oz smoked salmon', '1 avocado', 'lemon', 'capers', 'fresh dill'], instructions: 'Plate salmon with sliced avocado, garnish with capers, dill, and lemon.' },
      { recipeName: 'Coconut Flour Waffles', calories: 400, protein: 16, carbs: 20, fat: 30, ingredients: ['3 eggs', '1/4 cup coconut flour', 'coconut milk', 'vanilla', 'coconut oil'], instructions: 'Mix all ingredients, cook in waffle iron. Top with fresh berries.' },
      { recipeName: 'Turkey Sausage Patties with Fruit', calories: 360, protein: 28, carbs: 24, fat: 18, ingredients: ['4 oz ground turkey', 'sage', 'garlic', 'apple slices', 'mixed berries'], instructions: 'Season turkey with sage and garlic, form patties, cook in pan. Serve with fruit.' },
      { recipeName: 'Egg Muffin Cups', calories: 340, protein: 24, carbs: 8, fat: 24, ingredients: ['4 eggs', 'spinach', 'sun-dried tomatoes', 'prosciutto', 'herbs'], instructions: 'Line muffin cups with prosciutto, fill with egg mixture and veggies, bake at 350F for 20 min.' },
    ],
    lunches: [
      { recipeName: 'Grilled Chicken and Avocado Salad', calories: 480, protein: 38, carbs: 16, fat: 30, ingredients: ['6 oz chicken breast', 'avocado', 'mixed greens', 'pecans', 'olive oil dressing'], instructions: 'Grill chicken, slice over greens with avocado and pecans.' },
      { recipeName: 'Paleo Lettuce Wrap Burgers', calories: 460, protein: 34, carbs: 10, fat: 32, ingredients: ['5 oz ground beef', 'butter lettuce', 'tomato', 'pickles', 'mustard', 'avocado'], instructions: 'Form and grill burger, wrap in lettuce leaves with toppings.' },
      { recipeName: 'Shrimp and Mango Salad', calories: 420, protein: 32, carbs: 28, fat: 20, ingredients: ['6 oz shrimp', 'mango', 'mixed greens', 'red onion', 'cilantro', 'lime vinaigrette'], instructions: 'Grill shrimp, toss with mango, greens, and lime vinaigrette.' },
      { recipeName: 'Zucchini Noodle Pesto Bowl', calories: 440, protein: 30, carbs: 16, fat: 30, ingredients: ['zucchini noodles', '5 oz grilled chicken', 'basil pesto', 'cherry tomatoes', 'pine nuts'], instructions: 'Spiralize zucchini, toss with pesto, top with chicken and tomatoes.' },
      { recipeName: 'Tuna-Stuffed Avocados', calories: 400, protein: 30, carbs: 10, fat: 28, ingredients: ['1 can tuna', '1 avocado', 'olive oil mayo', 'celery', 'lemon'], instructions: 'Mix tuna with mayo and celery. Halve avocado, fill with tuna mixture.' },
      { recipeName: 'Paleo Chicken Soup', calories: 380, protein: 32, carbs: 24, fat: 16, ingredients: ['chicken breast', 'sweet potato', 'celery', 'carrots', 'bone broth', 'herbs'], instructions: 'Simmer chicken and vegetables in bone broth for 30 min. Shred chicken before serving.' },
      { recipeName: 'Steak Salad with Balsamic', calories: 500, protein: 36, carbs: 18, fat: 32, ingredients: ['5 oz flank steak', 'arugula', 'cherry tomatoes', 'red onion', 'balsamic vinaigrette'], instructions: 'Grill steak, slice thin. Toss salad with vinaigrette, top with steak slices.' },
    ],
    dinners: [
      { recipeName: 'Herb-Roasted Chicken with Root Vegetables', calories: 520, protein: 40, carbs: 32, fat: 24, ingredients: ['6 oz chicken thigh', 'sweet potato', 'parsnips', 'carrots', 'rosemary', 'olive oil'], instructions: 'Roast chicken and root vegetables at 425F for 35 min with herbs.' },
      { recipeName: 'Grilled Salmon with Cauliflower Mash', calories: 480, protein: 38, carbs: 16, fat: 30, ingredients: ['6 oz salmon', 'cauliflower', 'ghee', 'garlic', 'chives', 'lemon'], instructions: 'Grill salmon. Steam and mash cauliflower with ghee and garlic. Garnish with chives.' },
      { recipeName: 'Paleo Meatloaf with Roasted Broccoli', calories: 500, protein: 38, carbs: 20, fat: 30, ingredients: ['6 oz ground beef', 'almond flour', 'egg', 'onion', 'tomato paste', 'broccoli'], instructions: 'Mix beef with almond flour and egg, form loaf, bake at 375F for 35 min. Roast broccoli alongside.' },
      { recipeName: 'Pan-Seared Duck Breast with Berries', calories: 540, protein: 34, carbs: 18, fat: 38, ingredients: ['6 oz duck breast', 'mixed berries', 'balsamic', 'arugula', 'olive oil'], instructions: 'Score duck skin, sear skin-down 6 min, flip 4 min. Make berry balsamic reduction.' },
      { recipeName: 'Grilled Pork Chops with Apple Slaw', calories: 480, protein: 36, carbs: 24, fat: 26, ingredients: ['6 oz pork chop', 'apple', 'cabbage', 'apple cider vinegar', 'olive oil'], instructions: 'Grill pork chops 5 min per side. Shred cabbage and apple, dress with vinegar.' },
      { recipeName: 'Bison Steak with Garlic Mushrooms', calories: 500, protein: 42, carbs: 12, fat: 32, ingredients: ['6 oz bison steak', 'mushrooms', 'garlic', 'ghee', 'thyme', 'asparagus'], instructions: 'Sear bison 3 min per side. Saute mushrooms in ghee with garlic and thyme. Roast asparagus.' },
      { recipeName: 'Coconut Shrimp with Mango Salsa', calories: 460, protein: 30, carbs: 28, fat: 26, ingredients: ['6 oz shrimp', 'coconut flakes', 'almond flour', 'mango', 'red onion', 'cilantro', 'lime'], instructions: 'Coat shrimp in almond flour and coconut, bake at 400F for 12 min. Make mango salsa.' },
    ],
    snacks: [
      { recipeName: 'Apple with Almond Butter', calories: 220, protein: 6, carbs: 28, fat: 12, ingredients: ['1 apple', '1.5 tbsp almond butter'], instructions: 'Slice apple, dip in almond butter.' },
      { recipeName: 'Paleo Trail Mix', calories: 210, protein: 6, carbs: 16, fat: 16, ingredients: ['macadamia nuts', 'pecans', 'coconut chips', 'dried mango'], instructions: 'Combine all ingredients in a container.' },
      { recipeName: 'Beef Jerky', calories: 180, protein: 24, carbs: 6, fat: 6, ingredients: ['2 oz grass-fed beef jerky'], instructions: 'Ready to eat.' },
      { recipeName: 'Guacamole with Plantain Chips', calories: 230, protein: 4, carbs: 26, fat: 14, ingredients: ['1/2 avocado', 'lime', 'cilantro', 'plantain chips'], instructions: 'Mash avocado with lime and cilantro. Serve with plantain chips.' },
      { recipeName: 'Hard-Boiled Eggs with Everything Seasoning', calories: 160, protein: 14, carbs: 2, fat: 10, ingredients: ['2 hard-boiled eggs', 'everything bagel seasoning'], instructions: 'Boil eggs, peel, sprinkle with seasoning.' },
      { recipeName: 'Coconut Date Energy Bites', calories: 200, protein: 4, carbs: 28, fat: 10, ingredients: ['4 dates', 'coconut flakes', 'almond butter', 'cocoa powder'], instructions: 'Blend dates and nut butter, roll in coconut.' },
      { recipeName: 'Smoked Salmon Cucumber Rounds', calories: 170, protein: 16, carbs: 6, fat: 10, ingredients: ['2 oz smoked salmon', '1 cucumber', 'dill'], instructions: 'Slice cucumber into rounds, top each with salmon and dill.' },
    ],
  },
  {
    protocol: 'low-carb',
    label: 'Low-Carb',
    calorieTargets: [1500, 1700, 1900, 2000, 1600, 1800],
    breakfasts: [
      { recipeName: 'Veggie Egg Cups', calories: 320, protein: 24, carbs: 8, fat: 22, ingredients: ['4 eggs', 'spinach', 'bell pepper', 'cheese', 'butter'], instructions: 'Pour beaten eggs into muffin tin with veggies and cheese, bake at 350F for 18 min.' },
      { recipeName: 'Low-Carb Smoothie Bowl', calories: 340, protein: 26, carbs: 18, fat: 18, ingredients: ['protein powder', 'spinach', 'avocado', 'almond milk', 'chia seeds', 'berries'], instructions: 'Blend protein, spinach, avocado, and milk. Top with chia and berries.' },
      { recipeName: 'Breakfast Sausage Skillet', calories: 380, protein: 28, carbs: 10, fat: 26, ingredients: ['3 sausage links', '2 eggs', 'mushrooms', 'onion', 'peppers'], instructions: 'Cook sausage, saute vegetables, add eggs and scramble together.' },
      { recipeName: 'Cream Cheese Cloud Eggs', calories: 300, protein: 22, carbs: 6, fat: 22, ingredients: ['3 eggs', '2 oz cream cheese', 'chives', 'salt', 'pepper'], instructions: 'Whip egg whites, fold in yolks and cream cheese, bake at 350F for 12 min.' },
      { recipeName: 'Turkey Bacon Avocado Wrap', calories: 360, protein: 26, carbs: 12, fat: 24, ingredients: ['3 turkey bacon strips', '1/2 avocado', 'low-carb wrap', 'tomato', 'lettuce'], instructions: 'Cook bacon, assemble in wrap with avocado, tomato, and lettuce.' },
      { recipeName: 'Almond Flour Muffins', calories: 320, protein: 14, carbs: 10, fat: 26, ingredients: ['almond flour', 'eggs', 'butter', 'blueberries', 'vanilla'], instructions: 'Mix ingredients, pour into muffin tin, bake at 350F for 20 min.' },
      { recipeName: 'Spinach Mushroom Omelette', calories: 340, protein: 26, carbs: 8, fat: 24, ingredients: ['3 eggs', 'spinach', 'mushrooms', 'Swiss cheese', 'butter'], instructions: 'Saute mushrooms and spinach, pour beaten eggs over, add cheese, fold.' },
    ],
    lunches: [
      { recipeName: 'Chicken Lettuce Wraps', calories: 400, protein: 36, carbs: 10, fat: 24, ingredients: ['5 oz chicken breast', 'lettuce leaves', 'mayo', 'celery', 'pecans'], instructions: 'Mix diced chicken with mayo and celery, serve in lettuce cups, top with pecans.' },
      { recipeName: 'Cauliflower Crust Pizza', calories: 420, protein: 28, carbs: 18, fat: 26, ingredients: ['cauliflower crust', 'marinara', 'mozzarella', 'pepperoni', 'mushrooms', 'olives'], instructions: 'Top cauliflower crust with sauce and toppings, bake at 425F for 15 min.' },
      { recipeName: 'Cobb Salad', calories: 460, protein: 34, carbs: 12, fat: 32, ingredients: ['grilled chicken', 'bacon', 'avocado', 'hard-boiled egg', 'blue cheese', 'ranch'], instructions: 'Arrange all toppings in rows over mixed greens, drizzle with ranch.' },
      { recipeName: 'Egg Salad Lettuce Cups', calories: 380, protein: 24, carbs: 6, fat: 30, ingredients: ['4 hard-boiled eggs', 'mayo', 'mustard', 'celery', 'butter lettuce', 'paprika'], instructions: 'Chop eggs, mix with mayo, mustard, and celery. Serve in lettuce cups.' },
      { recipeName: 'Grilled Steak Salad', calories: 440, protein: 36, carbs: 14, fat: 28, ingredients: ['5 oz sirloin steak', 'mixed greens', 'cherry tomatoes', 'goat cheese', 'balsamic vinaigrette'], instructions: 'Grill steak, slice thin. Toss salad with vinaigrette, top with steak and goat cheese.' },
      { recipeName: 'Tuna Avocado Boats', calories: 380, protein: 28, carbs: 8, fat: 28, ingredients: ['1 can tuna', '1 avocado', 'lemon juice', 'red onion', 'cilantro'], instructions: 'Mix tuna with lemon and onion. Halve avocado, fill with tuna mixture.' },
      { recipeName: 'Low-Carb Turkey Club Roll-Ups', calories: 360, protein: 30, carbs: 8, fat: 24, ingredients: ['4 oz deli turkey', 'Swiss cheese', 'bacon', 'lettuce', 'tomato', 'mayo'], instructions: 'Layer turkey with cheese, bacon, veggies, and mayo. Roll up tightly.' },
    ],
    dinners: [
      { recipeName: 'Garlic Butter Shrimp with Zoodles', calories: 400, protein: 34, carbs: 12, fat: 24, ingredients: ['6 oz shrimp', 'zucchini noodles', 'garlic', 'butter', 'lemon', 'parsley'], instructions: 'Saute shrimp in garlic butter, serve over spiralized zucchini with lemon.' },
      { recipeName: 'Chicken Thighs with Creamy Mushroom Sauce', calories: 480, protein: 38, carbs: 10, fat: 32, ingredients: ['6 oz chicken thighs', 'mushrooms', 'heavy cream', 'garlic', 'thyme', 'green beans'], instructions: 'Sear chicken, make cream sauce with mushrooms. Steam green beans.' },
      { recipeName: 'Baked Meatballs with Roasted Vegetables', calories: 460, protein: 36, carbs: 18, fat: 28, ingredients: ['5 oz ground beef', 'almond flour', 'egg', 'zucchini', 'bell peppers', 'marinara'], instructions: 'Form meatballs, bake at 400F for 20 min. Roast vegetables alongside.' },
      { recipeName: 'Pan-Seared Halibut with Asparagus', calories: 380, protein: 36, carbs: 10, fat: 22, ingredients: ['6 oz halibut', 'asparagus', 'butter', 'lemon', 'capers'], instructions: 'Sear halibut 4 min per side. Roast asparagus with butter, lemon, and capers.' },
      { recipeName: 'Stuffed Chicken Breast with Spinach', calories: 440, protein: 42, carbs: 6, fat: 28, ingredients: ['6 oz chicken breast', 'spinach', 'cream cheese', 'garlic', 'mozzarella'], instructions: 'Butterfly chicken, stuff with spinach and cream cheese, bake at 375F for 25 min.' },
      { recipeName: 'Pork Tenderloin with Cabbage Slaw', calories: 420, protein: 36, carbs: 14, fat: 24, ingredients: ['6 oz pork tenderloin', 'red cabbage', 'apple cider vinegar', 'Dijon mustard', 'olive oil'], instructions: 'Roast pork at 400F for 20 min. Shred cabbage, dress with vinegar and mustard.' },
      { recipeName: 'Salmon with Dill Cucumber Salad', calories: 440, protein: 36, carbs: 10, fat: 28, ingredients: ['6 oz salmon', 'cucumber', 'dill', 'sour cream', 'lemon', 'red onion'], instructions: 'Bake salmon at 400F for 15 min. Slice cucumber, toss with dill and sour cream dressing.' },
    ],
    snacks: [
      { recipeName: 'Cheese and Olives', calories: 180, protein: 10, carbs: 4, fat: 16, ingredients: ['1 oz cheddar cheese', '6 olives'], instructions: 'Serve cheese sliced with olives.' },
      { recipeName: 'Celery with Cream Cheese', calories: 150, protein: 4, carbs: 6, fat: 12, ingredients: ['3 celery stalks', '2 oz cream cheese'], instructions: 'Fill celery stalks with cream cheese.' },
      { recipeName: 'Pepperoni and Mozzarella Bites', calories: 190, protein: 14, carbs: 4, fat: 14, ingredients: ['1 oz pepperoni', '1 oz mozzarella'], instructions: 'Roll pepperoni around mozzarella cubes.' },
      { recipeName: 'Hard-Boiled Eggs', calories: 140, protein: 12, carbs: 2, fat: 10, ingredients: ['2 hard-boiled eggs', 'salt', 'pepper'], instructions: 'Boil for 10 min, cool, peel, and season.' },
      { recipeName: 'Cucumber Rounds with Tuna Salad', calories: 170, protein: 18, carbs: 6, fat: 8, ingredients: ['1 cucumber', '1/2 can tuna', 'mayo', 'dill'], instructions: 'Slice cucumber thick, top each with tuna salad.' },
      { recipeName: 'Almond and Coconut Fat Bombs', calories: 200, protein: 4, carbs: 6, fat: 18, ingredients: ['almond butter', 'coconut oil', 'cocoa powder', 'stevia'], instructions: 'Mix ingredients, freeze in molds for 1 hour.' },
      { recipeName: 'Turkey and Cheese Roll-Ups', calories: 160, protein: 16, carbs: 2, fat: 10, ingredients: ['2 oz deli turkey', '1 oz provolone'], instructions: 'Wrap turkey around cheese slices.' },
    ],
  },
  {
    protocol: 'balanced',
    label: 'Balanced Nutrition',
    calorieTargets: [1800, 2000, 2200, 1900, 2100, 1700],
    breakfasts: [
      { recipeName: 'Classic Oatmeal with Fruit and Nuts', calories: 380, protein: 14, carbs: 52, fat: 14, ingredients: ['1 cup oats', 'milk', '1 banana', '1 oz walnuts', 'honey', 'cinnamon'], instructions: 'Cook oats with milk, top with sliced banana, walnuts, honey, and cinnamon.' },
      { recipeName: 'Veggie Egg Scramble with Toast', calories: 400, protein: 24, carbs: 36, fat: 18, ingredients: ['3 eggs', 'spinach', 'tomato', 'mushrooms', '2 slices whole wheat bread', 'butter'], instructions: 'Scramble eggs with vegetables. Toast bread and butter.' },
      { recipeName: 'Yogurt Parfait with Granola', calories: 360, protein: 20, carbs: 46, fat: 12, ingredients: ['1 cup Greek yogurt', '1/2 cup granola', 'mixed berries', 'honey'], instructions: 'Layer yogurt, granola, and berries. Drizzle with honey.' },
      { recipeName: 'Whole Wheat Pancakes with Maple Syrup', calories: 420, protein: 14, carbs: 64, fat: 12, ingredients: ['whole wheat flour', 'egg', 'milk', 'maple syrup', 'blueberries', 'butter'], instructions: 'Mix batter, cook pancakes on griddle. Top with blueberries and maple syrup.' },
      { recipeName: 'Smoothie Bowl with Seeds', calories: 380, protein: 16, carbs: 54, fat: 12, ingredients: ['1 banana', 'mixed berries', 'spinach', 'milk', 'chia seeds', 'granola', 'coconut flakes'], instructions: 'Blend banana, berries, spinach, and milk. Top with seeds, granola, and coconut.' },
      { recipeName: 'Avocado Toast with Poached Egg', calories: 400, protein: 18, carbs: 32, fat: 24, ingredients: ['2 slices sourdough', '1/2 avocado', '2 eggs', 'red pepper flakes', 'lemon'], instructions: 'Toast bread, mash avocado on top. Poach eggs and place on avocado. Season.' },
      { recipeName: 'Breakfast Burrito', calories: 440, protein: 24, carbs: 42, fat: 20, ingredients: ['2 eggs', 'black beans', 'cheese', 'salsa', 'whole wheat tortilla', 'avocado'], instructions: 'Scramble eggs, fill tortilla with beans, cheese, salsa, and avocado.' },
    ],
    lunches: [
      { recipeName: 'Turkey and Avocado Sandwich', calories: 480, protein: 32, carbs: 40, fat: 22, ingredients: ['4 oz turkey breast', 'whole wheat bread', 'avocado', 'lettuce', 'tomato', 'Dijon mustard'], instructions: 'Layer turkey, avocado, and vegetables on bread with mustard.' },
      { recipeName: 'Chicken and Quinoa Power Bowl', calories: 500, protein: 36, carbs: 48, fat: 18, ingredients: ['5 oz chicken', 'quinoa', 'roasted vegetables', 'hummus', 'lemon dressing'], instructions: 'Cook quinoa, top with grilled chicken, roasted veggies, and hummus.' },
      { recipeName: 'Mediterranean Grain Bowl', calories: 460, protein: 22, carbs: 52, fat: 18, ingredients: ['farro', 'chickpeas', 'cucumber', 'cherry tomatoes', 'feta', 'olive oil', 'lemon'], instructions: 'Cook farro, top with chickpeas, vegetables, feta, and lemon olive oil dressing.' },
      { recipeName: 'Grilled Salmon Salad', calories: 480, protein: 36, carbs: 24, fat: 26, ingredients: ['5 oz salmon', 'mixed greens', 'quinoa', 'avocado', 'citrus vinaigrette'], instructions: 'Grill salmon, serve over greens with quinoa and avocado.' },
      { recipeName: 'Black Bean and Sweet Potato Bowl', calories: 440, protein: 18, carbs: 62, fat: 14, ingredients: ['black beans', 'sweet potato', 'brown rice', 'corn', 'salsa', 'cilantro'], instructions: 'Roast sweet potato, assemble bowl with beans, rice, corn, and salsa.' },
      { recipeName: 'Chicken Caesar Wrap', calories: 460, protein: 34, carbs: 36, fat: 20, ingredients: ['5 oz chicken', 'romaine', 'parmesan', 'Caesar dressing', 'whole wheat wrap'], instructions: 'Grill chicken, slice. Fill wrap with romaine, chicken, parmesan, and dressing.' },
      { recipeName: 'Minestrone Soup with Bread', calories: 420, protein: 16, carbs: 56, fat: 14, ingredients: ['white beans', 'pasta', 'zucchini', 'carrots', 'tomatoes', 'basil', 'crusty bread'], instructions: 'Simmer vegetables and beans in broth with pasta for 20 min. Serve with bread.' },
    ],
    dinners: [
      { recipeName: 'Grilled Chicken with Roasted Vegetables', calories: 480, protein: 40, carbs: 28, fat: 22, ingredients: ['6 oz chicken breast', 'sweet potato', 'broccoli', 'bell pepper', 'olive oil', 'herbs'], instructions: 'Grill chicken, roast vegetables at 425F for 25 min with olive oil and herbs.' },
      { recipeName: 'Salmon with Brown Rice and Steamed Broccoli', calories: 520, protein: 38, carbs: 42, fat: 22, ingredients: ['6 oz salmon', 'brown rice', 'broccoli', 'lemon', 'soy sauce', 'ginger'], instructions: 'Bake salmon with soy-ginger glaze. Cook rice, steam broccoli.' },
      { recipeName: 'Lean Beef Tacos', calories: 480, protein: 32, carbs: 40, fat: 20, ingredients: ['5 oz ground beef', 'corn tortillas', 'lettuce', 'tomato', 'cheese', 'salsa', 'sour cream'], instructions: 'Season and cook beef, fill tortillas with toppings.' },
      { recipeName: 'Baked Cod with Quinoa Pilaf', calories: 440, protein: 36, carbs: 38, fat: 16, ingredients: ['6 oz cod', 'quinoa', 'cherry tomatoes', 'spinach', 'lemon', 'garlic'], instructions: 'Bake cod at 400F for 18 min. Cook quinoa with spinach and tomatoes.' },
      { recipeName: 'Turkey Meatballs with Whole Wheat Pasta', calories: 500, protein: 36, carbs: 50, fat: 18, ingredients: ['5 oz ground turkey', 'whole wheat spaghetti', 'marinara sauce', 'parmesan', 'basil'], instructions: 'Form and bake meatballs. Cook pasta, top with sauce and meatballs.' },
      { recipeName: 'Stir-Fry Chicken with Vegetables', calories: 460, protein: 36, carbs: 40, fat: 18, ingredients: ['5 oz chicken', 'broccoli', 'snap peas', 'bell peppers', 'soy sauce', 'brown rice'], instructions: 'Stir-fry chicken and vegetables with soy sauce. Serve over brown rice.' },
      { recipeName: 'Herb-Crusted Pork Chop with Sweet Potato', calories: 490, protein: 36, carbs: 36, fat: 22, ingredients: ['6 oz pork chop', 'sweet potato', 'green beans', 'herbs', 'olive oil'], instructions: 'Coat pork with herbs, bake at 400F for 20 min. Roast sweet potato and green beans.' },
    ],
    snacks: [
      { recipeName: 'Apple with Peanut Butter', calories: 210, protein: 8, carbs: 26, fat: 10, ingredients: ['1 apple', '1.5 tbsp peanut butter'], instructions: 'Slice apple, dip in peanut butter.' },
      { recipeName: 'Trail Mix', calories: 200, protein: 6, carbs: 22, fat: 12, ingredients: ['1 oz mixed nuts', 'raisins', 'dark chocolate chips'], instructions: 'Combine all ingredients.' },
      { recipeName: 'Greek Yogurt with Berries', calories: 180, protein: 18, carbs: 20, fat: 4, ingredients: ['1 cup Greek yogurt', '1/2 cup mixed berries'], instructions: 'Top yogurt with berries.' },
      { recipeName: 'Whole Wheat Crackers with Cheese', calories: 200, protein: 10, carbs: 18, fat: 10, ingredients: ['6 whole wheat crackers', '1 oz cheddar cheese'], instructions: 'Serve crackers with sliced cheese.' },
      { recipeName: 'Banana with Almond Butter', calories: 220, protein: 6, carbs: 30, fat: 10, ingredients: ['1 banana', '1 tbsp almond butter'], instructions: 'Slice banana, drizzle with almond butter.' },
      { recipeName: 'Hummus and Veggie Sticks', calories: 180, protein: 8, carbs: 22, fat: 8, ingredients: ['1/4 cup hummus', 'carrot sticks', 'celery', 'cucumber'], instructions: 'Dip vegetables in hummus.' },
      { recipeName: 'Rice Cake with Avocado', calories: 170, protein: 4, carbs: 18, fat: 10, ingredients: ['2 rice cakes', '1/4 avocado', 'sea salt', 'red pepper flakes'], instructions: 'Mash avocado on rice cakes, season.' },
    ],
  },
  {
    protocol: 'intermittent-fasting',
    label: 'Intermittent Fasting (16:8)',
    calorieTargets: [1800, 2000, 2200, 2400, 1900, 2100],
    breakfasts: [
      { recipeName: 'IF Break-Fast: Loaded Omelette', calories: 520, protein: 36, carbs: 16, fat: 36, ingredients: ['4 eggs', 'cheese', 'ham', 'mushrooms', 'bell pepper', 'avocado'], instructions: 'Beat eggs, cook omelette with fillings. Serve with sliced avocado.' },
      { recipeName: 'IF Break-Fast: Protein Smoothie Bowl', calories: 480, protein: 34, carbs: 48, fat: 16, ingredients: ['2 scoops protein powder', 'banana', 'berries', 'granola', 'peanut butter', 'almond milk'], instructions: 'Blend protein, banana, berries, and milk. Top with granola and peanut butter.' },
      { recipeName: 'IF Break-Fast: Steak and Eggs', calories: 560, protein: 44, carbs: 12, fat: 38, ingredients: ['5 oz sirloin steak', '3 eggs', 'sweet potato hash', 'butter'], instructions: 'Cook steak to desired doneness. Fry eggs in butter. Serve with sweet potato hash.' },
      { recipeName: 'IF Break-Fast: Salmon Avocado Bowl', calories: 520, protein: 36, carbs: 32, fat: 28, ingredients: ['5 oz smoked salmon', 'avocado', 'brown rice', 'cucumber', 'sesame seeds'], instructions: 'Arrange salmon and avocado over rice, garnish with cucumber and sesame seeds.' },
      { recipeName: 'IF Break-Fast: Chicken and Waffles', calories: 560, protein: 38, carbs: 48, fat: 24, ingredients: ['5 oz chicken breast', 'whole grain waffles', 'maple syrup', 'hot sauce'], instructions: 'Grill chicken, serve alongside toasted waffles with maple syrup.' },
      { recipeName: 'IF Break-Fast: Mediterranean Plate', calories: 500, protein: 28, carbs: 40, fat: 26, ingredients: ['3 eggs', 'hummus', 'pita', 'olives', 'tomato', 'feta cheese', 'olive oil'], instructions: 'Fry or boil eggs, serve with hummus, pita, olives, tomatoes, and feta.' },
      { recipeName: 'IF Break-Fast: Overnight Oats Deluxe', calories: 480, protein: 24, carbs: 58, fat: 18, ingredients: ['1 cup oats', 'protein powder', 'milk', 'chia seeds', 'peanut butter', 'banana', 'berries'], instructions: 'Mix oats, protein powder, milk, and chia overnight. Top with peanut butter, banana, and berries.' },
    ],
    lunches: [
      { recipeName: 'IF Power Lunch: Grilled Chicken Grain Bowl', calories: 580, protein: 42, carbs: 52, fat: 22, ingredients: ['6 oz chicken breast', 'quinoa', 'sweet potato', 'kale', 'avocado', 'tahini dressing'], instructions: 'Grill chicken, roast sweet potato. Assemble bowl with quinoa and kale, drizzle tahini.' },
      { recipeName: 'IF Power Lunch: Salmon Teriyaki Bowl', calories: 560, protein: 38, carbs: 48, fat: 24, ingredients: ['6 oz salmon', 'jasmine rice', 'edamame', 'avocado', 'teriyaki sauce', 'sesame seeds'], instructions: 'Bake salmon with teriyaki glaze. Serve over rice with edamame and avocado.' },
      { recipeName: 'IF Power Lunch: Turkey Burger with Sweet Potato Fries', calories: 600, protein: 40, carbs: 50, fat: 26, ingredients: ['6 oz ground turkey', 'brioche bun', 'sweet potato', 'avocado', 'lettuce', 'tomato'], instructions: 'Form and grill turkey burger. Cut sweet potato into fries, bake at 425F for 25 min.' },
      { recipeName: 'IF Power Lunch: Beef and Broccoli', calories: 540, protein: 40, carbs: 42, fat: 22, ingredients: ['6 oz flank steak', 'broccoli', 'soy sauce', 'ginger', 'garlic', 'brown rice'], instructions: 'Slice steak thin, stir-fry with broccoli and sauce. Serve over brown rice.' },
      { recipeName: 'IF Power Lunch: Loaded Chicken Burrito', calories: 620, protein: 42, carbs: 56, fat: 24, ingredients: ['6 oz chicken', 'rice', 'black beans', 'cheese', 'salsa', 'sour cream', 'tortilla'], instructions: 'Cook chicken with spices, assemble burrito with all fillings.' },
      { recipeName: 'IF Power Lunch: Shrimp Pasta', calories: 560, protein: 36, carbs: 54, fat: 22, ingredients: ['6 oz shrimp', 'whole wheat pasta', 'cherry tomatoes', 'garlic', 'olive oil', 'basil'], instructions: 'Saute shrimp with garlic and tomatoes. Toss with cooked pasta and fresh basil.' },
      { recipeName: 'IF Power Lunch: Tuna Poke Bowl', calories: 540, protein: 38, carbs: 48, fat: 22, ingredients: ['6 oz tuna', 'sushi rice', 'mango', 'avocado', 'edamame', 'soy sauce', 'sriracha mayo'], instructions: 'Cube tuna, marinate in soy sauce. Arrange over rice with all toppings.' },
    ],
    dinners: [
      { recipeName: 'IF Dinner: Grilled Ribeye with Baked Potato', calories: 620, protein: 44, carbs: 40, fat: 32, ingredients: ['7 oz ribeye', 'baked potato', 'butter', 'sour cream', 'chives', 'asparagus'], instructions: 'Grill ribeye 5 min per side. Bake potato at 400F for 45 min. Roast asparagus.' },
      { recipeName: 'IF Dinner: Chicken Parmesan with Pasta', calories: 580, protein: 42, carbs: 48, fat: 24, ingredients: ['6 oz chicken breast', 'breadcrumbs', 'marinara', 'mozzarella', 'spaghetti', 'parmesan'], instructions: 'Bread and bake chicken, top with sauce and cheese. Serve with spaghetti.' },
      { recipeName: 'IF Dinner: Baked Salmon with Wild Rice', calories: 540, protein: 40, carbs: 38, fat: 24, ingredients: ['6 oz salmon', 'wild rice', 'roasted Brussels sprouts', 'lemon', 'dill'], instructions: 'Bake salmon at 400F for 15 min. Cook wild rice. Roast Brussels sprouts.' },
      { recipeName: 'IF Dinner: Slow-Cooked Pulled Pork', calories: 560, protein: 38, carbs: 44, fat: 26, ingredients: ['6 oz pork shoulder', 'BBQ sauce', 'coleslaw', 'brioche buns', 'pickles'], instructions: 'Slow cook pork 8 hours, shred. Serve on bun with coleslaw and pickles.' },
      { recipeName: 'IF Dinner: Lamb Chops with Rosemary Potatoes', calories: 580, protein: 38, carbs: 36, fat: 32, ingredients: ['2 lamb chops', 'baby potatoes', 'rosemary', 'garlic', 'green beans', 'olive oil'], instructions: 'Sear lamb chops, roast potatoes with rosemary and garlic. Steam green beans.' },
      { recipeName: 'IF Dinner: Thai Coconut Curry', calories: 540, protein: 32, carbs: 46, fat: 26, ingredients: ['5 oz chicken', 'coconut milk', 'red curry paste', 'bamboo shoots', 'basil', 'jasmine rice'], instructions: 'Simmer chicken in coconut curry sauce with vegetables. Serve over jasmine rice.' },
      { recipeName: 'IF Dinner: Stuffed Salmon with Crab', calories: 560, protein: 44, carbs: 22, fat: 32, ingredients: ['6 oz salmon', 'crab meat', 'cream cheese', 'spinach', 'garlic', 'lemon', 'asparagus'], instructions: 'Mix crab with cream cheese and spinach. Stuff salmon, bake at 375F for 22 min. Serve with asparagus.' },
    ],
    snacks: [
      { recipeName: 'IF Window Snack: Protein Bar', calories: 250, protein: 20, carbs: 28, fat: 8, ingredients: ['1 protein bar (natural ingredients)'], instructions: 'Ready to eat.' },
      { recipeName: 'IF Window Snack: Greek Yogurt Parfait', calories: 280, protein: 22, carbs: 32, fat: 8, ingredients: ['1 cup Greek yogurt', 'granola', 'honey', 'berries'], instructions: 'Layer yogurt with granola, berries, and honey drizzle.' },
      { recipeName: 'IF Window Snack: Mixed Nuts and Dark Chocolate', calories: 260, protein: 8, carbs: 18, fat: 20, ingredients: ['1.5 oz mixed nuts', '0.5 oz dark chocolate'], instructions: 'Combine nuts and chocolate pieces.' },
      { recipeName: 'IF Window Snack: Banana Protein Shake', calories: 300, protein: 30, carbs: 34, fat: 6, ingredients: ['1 scoop whey protein', '1 banana', '1 cup milk', 'ice'], instructions: 'Blend all ingredients until smooth.' },
      { recipeName: 'IF Window Snack: Avocado and Crackers', calories: 240, protein: 6, carbs: 20, fat: 16, ingredients: ['1/2 avocado', '8 seed crackers', 'sea salt', 'lemon'], instructions: 'Mash avocado, spread on crackers, season.' },
      { recipeName: 'IF Window Snack: Turkey and Cheese Roll', calories: 220, protein: 20, carbs: 6, fat: 14, ingredients: ['3 oz turkey', '1 oz Swiss cheese', 'mustard'], instructions: 'Roll turkey around cheese with mustard.' },
      { recipeName: 'IF Window Snack: Cottage Cheese with Pineapple', calories: 230, protein: 22, carbs: 24, fat: 4, ingredients: ['1 cup cottage cheese', '1/2 cup pineapple chunks'], instructions: 'Top cottage cheese with pineapple.' },
    ],
  },
];

// ============================================================
// Template Generator
// ============================================================

function generateMealPlan(
  protocol: ProtocolConfig,
  templateIndex: number,
  calorieTarget: number,
): any {
  const suffixes = [
    'Starter',
    'Essentials',
    'Advanced',
    'Performance',
    'Lean & Clean',
    'Complete',
  ];
  const suffix = suffixes[templateIndex % suffixes.length];
  const planName = `7-Day ${protocol.label} ${suffix} (${calorieTarget} kcal)`;

  const meals: any[] = [];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  for (let day = 1; day <= 7; day++) {
    // Rotate through meals to get variety across days
    const bIdx = (day - 1 + templateIndex) % protocol.breakfasts.length;
    const lIdx = (day - 1 + templateIndex + 2) % protocol.lunches.length;
    const dIdx = (day - 1 + templateIndex + 4) % protocol.dinners.length;
    const sIdx = (day - 1 + templateIndex + 1) % protocol.snacks.length;

    const dayMeals = [
      { ...protocol.breakfasts[bIdx], day, mealType: 'breakfast' },
      { ...protocol.lunches[lIdx], day, mealType: 'lunch' },
      { ...protocol.dinners[dIdx], day, mealType: 'dinner' },
      { ...protocol.snacks[sIdx], day, mealType: 'snack' },
    ];

    meals.push(...dayMeals);
  }

  return {
    planName,
    description: `A complete 7-day ${protocol.label.toLowerCase()} meal plan targeting ${calorieTarget} calories per day. Includes breakfast, lunch, dinner, and snack for each day with detailed ingredients and instructions.`,
    durationDays: 7,
    mealsPerDay: 4,
    dailyCalorieTarget: calorieTarget,
    dietaryProtocol: protocol.protocol,
    meals,
  };
}

function generateAllTemplates(): any[] {
  const templates: any[] = [];

  // 8 protocols x 6 templates each = 48
  for (const protocol of protocols) {
    for (let i = 0; i < 6; i++) {
      templates.push(generateMealPlan(protocol, i, protocol.calorieTargets[i]));
    }
  }

  // 2 bonus templates
  // Bonus 1: Athlete Performance (high-protein variation)
  const athleteProtocol = protocols[0]; // high-protein base
  templates.push({
    ...generateMealPlan(athleteProtocol, 6, 2500),
    planName: '7-Day Athlete Performance Plan (2500 kcal)',
    description: 'Designed for competitive athletes and intense training. Higher calorie and protein targets to support muscle recovery and performance. Includes high-protein meals with complex carbs for sustained energy.',
    dietaryProtocol: 'athlete-performance',
  });

  // Bonus 2: Longevity (mediterranean variation)
  const longevityProtocol = protocols[2]; // mediterranean base
  templates.push({
    ...generateMealPlan(longevityProtocol, 6, 1800),
    planName: '7-Day Longevity & Anti-Aging Plan (1800 kcal)',
    description: 'Based on Blue Zone dietary research and Mediterranean principles. Focuses on anti-inflammatory foods, healthy fats, and antioxidant-rich ingredients for optimal health and longevity.',
    dietaryProtocol: 'longevity',
  });

  return templates;
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('Generating 50 tripwire meal plan templates...\n');

  const templates = generateAllTemplates();

  console.log(`Generated ${templates.length} templates:`);
  const protocolCounts: Record<string, number> = {};
  for (const t of templates) {
    protocolCounts[t.dietaryProtocol] = (protocolCounts[t.dietaryProtocol] || 0) + 1;
  }
  for (const [protocol, count] of Object.entries(protocolCounts)) {
    console.log(`  ${protocol}: ${count} templates`);
  }

  // Calculate total meals
  const totalMeals = templates.reduce((sum, t) => sum + t.meals.length, 0);
  console.log(`\nTotal meals across all templates: ${totalMeals}`);

  // Write output
  const outputDir = path.resolve(__dirname, '..', 'client', 'public', 'downloads');
  const outputPath = path.join(outputDir, 'tripwire-templates.json');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2), 'utf-8');
  console.log(`\nOutput written to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

main();
