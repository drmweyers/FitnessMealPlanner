import { parseNaturalLanguageMealPlan } from './server/services/openai.js';

async function testNaturalLanguageParsing() {
  console.log('Testing natural language meal plan parsing...');
  
  const testInputs = [
    "I need a 7-day weight loss meal plan for my client Sarah. She wants to lose 10 pounds, has a 1600 calorie target, is vegetarian, and prefers 4 meals per day.",
    "Create a muscle building plan for John. He's bulking, needs 2800 calories daily, wants 5 days of meals with 3 meals per day.",
    "Generate a maintenance plan for someone who exercises regularly, needs about 2200 calories, wants a 14-day plan with 4 meals per day."
  ];

  for (const input of testInputs) {
    try {
      console.log(`\nInput: "${input}"`);
      const result = await parseNaturalLanguageMealPlan(input);
      console.log('Parsed result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testNaturalLanguageParsing().catch(console.error);