import { generateMealImage } from './server/services/openai';

async function testImageGeneration() {
  console.log('Testing AI Image Generation...\n');
  
  const testRecipe = {
    name: "Grilled Chicken Power Bowl",
    description: "Grilled chicken breast served over quinoa with roasted vegetables and avocado",
    mealTypes: ["lunch"]
  };
  
  try {
    console.log(`Generating image for: ${testRecipe.name}`);
    console.log(`Description: ${testRecipe.description}`);
    console.log(`Meal Type: ${testRecipe.mealTypes.join(', ')}\n`);
    
    const imageUrl = await generateMealImage(testRecipe);
    
    console.log('✓ Image Generated Successfully!');
    console.log(`Image URL: ${imageUrl}`);
    console.log('\nThe image generation uses your enhanced prompt with:');
    console.log('- Ultra-realistic, high-resolution photography');
    console.log('- Artful plating on clean white ceramic plate');
    console.log('- Rustic wooden table setting');
    console.log('- Soft, natural side lighting');
    console.log('- Shallow depth of field (f/2.8)');
    console.log('- 45° camera angle for professional look');
    console.log('- Random style selection for uniqueness');
    
  } catch (error) {
    console.error('✗ Image generation failed:', error.message);
  }
}

testImageGeneration();