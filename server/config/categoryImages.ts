/**
 * Category Image Pool Configuration
 *
 * Pre-configured image pools for manual meal plan creation.
 * Images are from Unsplash (free to use) and organized by meal category.
 *
 * Benefits:
 * - Zero OpenAI API costs
 * - Instant image assignment
 * - High-quality professional food photography
 * - Random selection ensures variety
 */

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface CategoryImagePool {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snack: string[];
}

/**
 * Curated image pools for each meal category
 * Each pool contains 15-20 high-quality food images from Unsplash
 */
export const CATEGORY_IMAGE_POOL: CategoryImagePool = {
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800', // pancakes with berries
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800', // oatmeal bowl
    'https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800', // scrambled eggs
    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800', // avocado toast
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800', // fruit bowl
    'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800', // smoothie bowl
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800', // breakfast spread
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', // avocado eggs
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', // breakfast plate
    'https://images.unsplash.com/photo-1525324948634-bb9a6d0e1ae5?w=800', // waffles
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800', // granola yogurt
    'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800', // french toast
    'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800', // eggs benedict
    'https://images.unsplash.com/photo-1504113888839-1c8eb50233d3?w=800', // acai bowl
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800', // breakfast table
  ],

  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', // healthy salad
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800', // sandwich
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', // soup bowl
    'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800', // poke bowl
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', // healthy bowl
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800', // salad bowl
    'https://images.unsplash.com/photo-1547496502-affa22d38842?w=800', // wrap
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // pizza slice
    'https://images.unsplash.com/photo-1572448862527-d3c904757de6?w=800', // burger bowl
    'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800', // lunch plate
    'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800', // grain bowl
    'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800', // caesar salad
    'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=800', // buddha bowl
    'https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=800', // lunch sandwich
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=800', // chicken salad
  ],

  dinner: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800', // grilled steak
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800', // pasta dish
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', // baked fish
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // burger
    'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800', // salmon plate
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', // grilled chicken
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800', // dinner plate
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800', // roast dinner
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800', // gourmet dish
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', // dinner bowl
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // pizza
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // asian cuisine
    'https://images.unsplash.com/photo-1496412705862-e0088f16f791?w=800', // seafood
    'https://images.unsplash.com/photo-1551218372-a8789b81b253?w=800', // tacos
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=800', // curry
  ],

  snack: [
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', // mixed nuts
    'https://images.unsplash.com/photo-1571212515416-fca2f8cfe8c5?w=800', // yogurt
    'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800', // fresh fruit
    'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800', // protein bar
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800', // snack plate
    'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800', // hummus dip
    'https://images.unsplash.com/photo-1587334207976-50a2df954dcd?w=800', // veggie sticks
    'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800', // energy balls
    'https://images.unsplash.com/photo-1582052393ad-7896b8b88ad3?w=800', // apple slices
    'https://images.unsplash.com/photo-1505576633788-77f6a4e55c48?w=800', // trail mix
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=800', // protein shake
    'https://images.unsplash.com/photo-1587334206617-83f2c8e23f3f?w=800', // cheese crackers
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800', // granola bar
    'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=800', // dried fruit
    'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=800', // rice cakes
  ]
};

/**
 * Get a random image URL from a specific category
 *
 * @param category - The meal category (breakfast, lunch, dinner, snack)
 * @returns A random image URL from the category pool
 */
export function getRandomImageForCategory(category: MealCategory): string {
  const images = CATEGORY_IMAGE_POOL[category];

  if (!images || images.length === 0) {
    // Fallback to a generic food image if category pool is empty
    console.warn(`No images found for category: ${category}, using fallback`);
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
  }

  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}

/**
 * Get image pool health statistics
 * Useful for monitoring and admin dashboard
 *
 * @returns Health statistics for all category image pools
 */
export function getCategoryImagePoolHealth() {
  return {
    breakfast: CATEGORY_IMAGE_POOL.breakfast.length,
    lunch: CATEGORY_IMAGE_POOL.lunch.length,
    dinner: CATEGORY_IMAGE_POOL.dinner.length,
    snack: CATEGORY_IMAGE_POOL.snack.length,
    total: Object.values(CATEGORY_IMAGE_POOL).reduce((sum, pool) => sum + pool.length, 0),
    healthy: Object.values(CATEGORY_IMAGE_POOL).every(pool => pool.length >= 10)
  };
}

/**
 * Validate that a URL is in the category image pool
 * Useful for security and validation
 *
 * @param url - The image URL to validate
 * @returns Whether the URL exists in any category pool
 */
export function isValidCategoryImageUrl(url: string): boolean {
  return Object.values(CATEGORY_IMAGE_POOL).some(pool => pool.includes(url));
}
