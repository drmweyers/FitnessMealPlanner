const { openai } = require('./server/services/openai.js');

async function generateRecipesDirect() {
  console.log('Starting direct recipe generation...');
  
  const recipePrompts = [
    {
      type: 'breakfast',
      dietary: 'high-protein',
      ingredient: 'eggs',
      description: 'high-protein breakfast with eggs, under 15 minutes prep'
    },
    {
      type: 'lunch', 
      dietary: 'low-carb',
      ingredient: 'chicken',
      description: 'low-carb lunch with chicken, quick preparation'
    },
    {
      type: 'dinner',
      dietary: 'vegetarian',
      ingredient: 'quinoa',
      description: 'vegetarian dinner with quinoa, balanced nutrition'
    }
  ];

  for (const prompt of recipePrompts) {
    try {
      console.log(`Generating ${prompt.type} recipe...`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Generate a detailed fitness ${prompt.description}. Include name, description, ingredients with amounts, instructions, prep time, cook time, servings, and nutrition (calories, protein, carbs, fat). Format as JSON.`
        }],
        response_format: { type: 'json_object' },
        max_tokens: 800
      });

      const recipe = JSON.parse(response.choices[0].message.content);
      console.log(`Generated: ${recipe.name} (${recipe.calories || 'unknown'} cal)`);
      
    } catch (error) {
      console.log(`Failed to generate ${prompt.type} recipe:`, error.message);
      if (error.message.includes('API key')) {
        console.log('OpenAI API key issue detected');
        break;
      }
    }
  }
  
  console.log('Recipe generation test completed');
}

generateRecipesDirect();