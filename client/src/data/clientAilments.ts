/**
 * Client Ailments Database
 * 
 * Comprehensive database of health ailments that clients may experience,
 * organized by categories for targeted meal planning and nutritional support.
 */

export interface ClientAilment {
  id: string;
  name: string;
  description: string;
  category: AilmentCategory;
  severity: 'mild' | 'moderate' | 'severe';
  commonSymptoms: string[];
  nutritionalSupport: {
    beneficialFoods: string[];
    avoidFoods: string[];
    keyNutrients: string[];
    mealPlanFocus: string[];
  };
  medicalDisclaimer?: string;
}

export type AilmentCategory = 
  | 'digestive'
  | 'energy_metabolism'
  | 'inflammatory'
  | 'mental_health'
  | 'hormonal'
  | 'cardiovascular'
  | 'detox_cleansing'
  | 'immune_system'
  | 'skin_beauty';

export interface AilmentCategoryInfo {
  id: AilmentCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  ailments: ClientAilment[];
}

export const CLIENT_AILMENTS_DATABASE: ClientAilment[] = [
  // DIGESTIVE ISSUES
  {
    id: 'bloating',
    name: 'Bloating',
    description: 'Feeling of fullness and swelling in the abdominal area',
    category: 'digestive',
    severity: 'mild',
    commonSymptoms: ['Abdominal distension', 'Feeling of fullness', 'Gas', 'Discomfort'],
    nutritionalSupport: {
      beneficialFoods: ['Ginger', 'Peppermint', 'Fennel', 'Papaya', 'Pineapple', 'Probiotics', 'Bone broth'],
      avoidFoods: ['Carbonated drinks', 'Beans', 'Cruciferous vegetables (raw)', 'Dairy', 'High-sodium foods'],
      keyNutrients: ['Digestive enzymes', 'Probiotics', 'Fiber (gradually)', 'Potassium'],
      mealPlanFocus: ['Anti-inflammatory foods', 'Easy-to-digest proteins', 'Cooked vegetables', 'Herbal teas']
    }
  },
  {
    id: 'ibs',
    name: 'Irritable Bowel Syndrome (IBS)',
    description: 'Chronic condition affecting the large intestine with cramping, bloating, and bowel changes',
    category: 'digestive',
    severity: 'moderate',
    commonSymptoms: ['Cramping', 'Bloating', 'Gas', 'Diarrhea or constipation', 'Mucus in stool'],
    nutritionalSupport: {
      beneficialFoods: ['Low-FODMAP foods', 'Soluble fiber', 'Bone broth', 'Cooked vegetables', 'Lean proteins'],
      avoidFoods: ['High-FODMAP foods', 'Trigger foods', 'Processed foods', 'Caffeine', 'Alcohol'],
      keyNutrients: ['Soluble fiber', 'Probiotics', 'L-glutamine', 'Omega-3 fatty acids'],
      mealPlanFocus: ['Low-FODMAP meal plans', 'Gut-healing foods', 'Anti-inflammatory diet', 'Stress-reducing foods']
    },
    medicalDisclaimer: 'Consult healthcare provider for proper IBS diagnosis and management'
  },
  {
    id: 'constipation',
    name: 'Constipation',
    description: 'Infrequent bowel movements or difficulty passing stool',
    category: 'digestive',
    severity: 'mild',
    commonSymptoms: ['Less than 3 bowel movements per week', 'Hard stools', 'Straining', 'Feeling of incomplete evacuation'],
    nutritionalSupport: {
      beneficialFoods: ['High-fiber foods', 'Prunes', 'Flaxseeds', 'Chia seeds', 'Leafy greens', 'Water-rich fruits'],
      avoidFoods: ['Processed foods', 'Red meat (excess)', 'Dairy (if intolerant)', 'Low-fiber foods'],
      keyNutrients: ['Insoluble fiber', 'Magnesium', 'Vitamin C', 'Potassium'],
      mealPlanFocus: ['High-fiber meals', 'Adequate hydration', 'Regular meal timing', 'Movement-promoting foods']
    }
  },
  {
    id: 'acid_reflux',
    name: 'Acid Reflux / GERD',
    description: 'Stomach acid backing up into the esophagus causing heartburn and discomfort',
    category: 'digestive',
    severity: 'moderate',
    commonSymptoms: ['Heartburn', 'Regurgitation', 'Chest pain', 'Difficulty swallowing', 'Chronic cough'],
    nutritionalSupport: {
      beneficialFoods: ['Oatmeal', 'Bananas', 'Melons', 'Fennel', 'Parsley', 'Rice', 'Lean proteins'],
      avoidFoods: ['Citrus fruits', 'Tomatoes', 'Spicy foods', 'Chocolate', 'Caffeine', 'Alcohol', 'Fried foods'],
      keyNutrients: ['Alkalizing minerals', 'Complex carbohydrates', 'Lean proteins', 'B-vitamins'],
      mealPlanFocus: ['Alkaline-promoting foods', 'Small frequent meals', 'Low-acid options', 'Easily digestible foods']
    }
  },

  // ENERGY & METABOLISM
  {
    id: 'chronic_fatigue',
    name: 'Chronic Fatigue',
    description: 'Persistent, overwhelming tiredness that doesn\'t improve with rest',
    category: 'energy_metabolism',
    severity: 'moderate',
    commonSymptoms: ['Persistent exhaustion', 'Brain fog', 'Muscle weakness', 'Sleep problems', 'Memory issues'],
    nutritionalSupport: {
      beneficialFoods: ['Iron-rich foods', 'B-vitamin rich foods', 'Complex carbohydrates', 'Lean proteins', 'Dark leafy greens'],
      avoidFoods: ['Refined sugars', 'Processed foods', 'Excessive caffeine', 'Alcohol', 'Trans fats'],
      keyNutrients: ['Iron', 'B-vitamins', 'Vitamin D', 'Magnesium', 'Coenzyme Q10'],
      mealPlanFocus: ['Energy-sustaining foods', 'Nutrient-dense meals', 'Blood sugar stabilizing', 'Mitochondrial support']
    },
    medicalDisclaimer: 'Consult healthcare provider to rule out underlying medical conditions'
  },
  {
    id: 'low_energy',
    name: 'Low Energy',
    description: 'General feeling of tiredness and lack of vitality',
    category: 'energy_metabolism',
    severity: 'mild',
    commonSymptoms: ['Tiredness', 'Lack of motivation', 'Afternoon crashes', 'Difficulty concentrating'],
    nutritionalSupport: {
      beneficialFoods: ['Whole grains', 'Nuts', 'Seeds', 'Fruits', 'Vegetables', 'Lean proteins', 'Green tea'],
      avoidFoods: ['Refined sugars', 'Energy drinks', 'Processed snacks', 'Large heavy meals'],
      keyNutrients: ['B-vitamins', 'Iron', 'Magnesium', 'Vitamin C', 'Complex carbohydrates'],
      mealPlanFocus: ['Balanced blood sugar', 'Regular meal timing', 'Energizing superfoods', 'Hydration support']
    }
  },
  {
    id: 'insulin_resistance',
    name: 'Insulin Resistance',
    description: 'Body\'s cells become resistant to insulin, leading to blood sugar issues',
    category: 'energy_metabolism',
    severity: 'moderate',
    commonSymptoms: ['Blood sugar spikes', 'Cravings', 'Weight gain around midsection', 'Fatigue after meals'],
    nutritionalSupport: {
      beneficialFoods: ['Low-glycemic foods', 'Fiber-rich vegetables', 'Lean proteins', 'Healthy fats', 'Cinnamon', 'Chromium-rich foods'],
      avoidFoods: ['Refined carbohydrates', 'Sugary foods', 'Processed foods', 'High-glycemic fruits'],
      keyNutrients: ['Chromium', 'Magnesium', 'Fiber', 'Alpha-lipoic acid', 'Omega-3 fatty acids'],
      mealPlanFocus: ['Low-glycemic index meals', 'Portion control', 'Protein with each meal', 'Anti-inflammatory foods']
    },
    medicalDisclaimer: 'Work with healthcare provider for blood sugar monitoring and management'
  },

  // INFLAMMATORY CONDITIONS
  {
    id: 'joint_pain',
    name: 'Joint Pain',
    description: 'Pain, stiffness, or swelling in one or more joints',
    category: 'inflammatory',
    severity: 'moderate',
    commonSymptoms: ['Joint stiffness', 'Swelling', 'Reduced range of motion', 'Pain with movement'],
    nutritionalSupport: {
      beneficialFoods: ['Fatty fish', 'Turmeric', 'Ginger', 'Leafy greens', 'Berries', 'Cherries', 'Olive oil'],
      avoidFoods: ['Processed foods', 'Sugar', 'Trans fats', 'Excessive omega-6 oils', 'Nightshade vegetables (if sensitive)'],
      keyNutrients: ['Omega-3 fatty acids', 'Curcumin', 'Vitamin D', 'Vitamin C', 'Antioxidants'],
      mealPlanFocus: ['Anti-inflammatory diet', 'Mediterranean-style meals', 'Antioxidant-rich foods', 'Joint-supporting nutrients']
    }
  },
  {
    id: 'arthritis',
    name: 'Arthritis',
    description: 'Inflammation of one or more joints causing pain and stiffness',
    category: 'inflammatory',
    severity: 'moderate',
    commonSymptoms: ['Joint pain', 'Swelling', 'Stiffness', 'Reduced mobility', 'Morning stiffness'],
    nutritionalSupport: {
      beneficialFoods: ['Cold-water fish', 'Colorful vegetables', 'Whole grains', 'Nuts', 'Seeds', 'Green tea'],
      avoidFoods: ['Inflammatory foods', 'Excess sugar', 'Fried foods', 'Refined grains'],
      keyNutrients: ['Omega-3s', 'Antioxidants', 'Vitamin D', 'Calcium', 'Glucosamine'],
      mealPlanFocus: ['Mediterranean diet', 'Anti-inflammatory foods', 'Joint-supporting nutrients', 'Weight management']
    },
    medicalDisclaimer: 'Work with rheumatologist or healthcare provider for proper arthritis management'
  },
  {
    id: 'chronic_inflammation',
    name: 'Chronic Inflammation',
    description: 'Long-term inflammation that can contribute to various health issues',
    category: 'inflammatory',
    severity: 'moderate',
    commonSymptoms: ['General aches', 'Fatigue', 'Skin issues', 'Digestive problems', 'Mood changes'],
    nutritionalSupport: {
      beneficialFoods: ['Anti-inflammatory foods', 'Colorful vegetables', 'Berries', 'Fatty fish', 'Nuts', 'Olive oil'],
      avoidFoods: ['Processed foods', 'Sugar', 'Trans fats', 'Refined carbs', 'Excessive alcohol'],
      keyNutrients: ['Omega-3 fatty acids', 'Antioxidants', 'Polyphenols', 'Vitamin E', 'Selenium'],
      mealPlanFocus: ['Mediterranean diet', 'Rainbow of colors', 'Whole foods', 'Anti-inflammatory spices']
    }
  },

  // MENTAL HEALTH
  {
    id: 'anxiety',
    name: 'Anxiety',
    description: 'Persistent worry, nervousness, or fear that interferes with daily activities',
    category: 'mental_health',
    severity: 'moderate',
    commonSymptoms: ['Excessive worry', 'Restlessness', 'Fatigue', 'Difficulty concentrating', 'Sleep problems'],
    nutritionalSupport: {
      beneficialFoods: ['Magnesium-rich foods', 'Complex carbs', 'Fermented foods', 'Green tea', 'Dark chocolate', 'Omega-3 rich fish'],
      avoidFoods: ['Caffeine (excess)', 'Alcohol', 'Refined sugars', 'Processed foods'],
      keyNutrients: ['Magnesium', 'B-vitamins', 'Omega-3s', 'Probiotics', 'L-theanine'],
      mealPlanFocus: ['Mood-stabilizing foods', 'Gut-brain axis support', 'Stress-reducing nutrients', 'Regular meal timing']
    },
    medicalDisclaimer: 'Seek professional mental health support for anxiety management'
  },
  {
    id: 'depression',
    name: 'Depression',
    description: 'Persistent feelings of sadness, hopelessness, and loss of interest',
    category: 'mental_health',
    severity: 'moderate',
    commonSymptoms: ['Persistent sadness', 'Loss of interest', 'Fatigue', 'Sleep changes', 'Appetite changes'],
    nutritionalSupport: {
      beneficialFoods: ['Fatty fish', 'Folate-rich foods', 'Fermented foods', 'Dark leafy greens', 'Nuts', 'Seeds'],
      avoidFoods: ['Alcohol', 'Highly processed foods', 'Excess sugar', 'Trans fats'],
      keyNutrients: ['Omega-3s', 'Folate', 'B12', 'Vitamin D', 'Probiotics', 'Tryptophan'],
      mealPlanFocus: ['Mood-boosting foods', 'Neurotransmitter support', 'Anti-inflammatory diet', 'Gut health']
    },
    medicalDisclaimer: 'Professional mental health treatment is essential for depression management'
  },
  {
    id: 'brain_fog',
    name: 'Brain Fog',
    description: 'Mental fatigue characterized by confusion, forgetfulness, and lack of focus',
    category: 'mental_health',
    severity: 'mild',
    commonSymptoms: ['Poor concentration', 'Memory problems', 'Mental fatigue', 'Confusion', 'Lack of clarity'],
    nutritionalSupport: {
      beneficialFoods: ['Blueberries', 'Fatty fish', 'Nuts', 'Dark chocolate', 'Green tea', 'Avocados'],
      avoidFoods: ['Processed foods', 'Excess sugar', 'Trans fats', 'Alcohol'],
      keyNutrients: ['Omega-3s', 'Antioxidants', 'B-vitamins', 'Choline', 'Phosphatidylserine'],
      mealPlanFocus: ['Brain-boosting foods', 'Cognitive function support', 'Blood sugar stability', 'Antioxidant-rich meals']
    }
  },

  // HORMONAL ISSUES
  {
    id: 'pms',
    name: 'PMS (Premenstrual Syndrome)',
    description: 'Physical and emotional symptoms before menstruation',
    category: 'hormonal',
    severity: 'mild',
    commonSymptoms: ['Mood swings', 'Bloating', 'Breast tenderness', 'Cravings', 'Fatigue'],
    nutritionalSupport: {
      beneficialFoods: ['Complex carbs', 'Calcium-rich foods', 'Magnesium-rich foods', 'Iron-rich foods', 'Omega-3s'],
      avoidFoods: ['Excess caffeine', 'Alcohol', 'High sodium', 'Refined sugars'],
      keyNutrients: ['Calcium', 'Magnesium', 'B6', 'Iron', 'Omega-3 fatty acids'],
      mealPlanFocus: ['Hormone-balancing foods', 'Nutrient timing', 'Craving management', 'Anti-inflammatory foods']
    }
  },
  {
    id: 'menopause',
    name: 'Menopause Symptoms',
    description: 'Symptoms related to hormonal changes during menopause',
    category: 'hormonal',
    severity: 'moderate',
    commonSymptoms: ['Hot flashes', 'Night sweats', 'Mood changes', 'Weight gain', 'Sleep problems'],
    nutritionalSupport: {
      beneficialFoods: ['Phytoestrogen-rich foods', 'Calcium-rich foods', 'Whole grains', 'Lean proteins', 'Healthy fats'],
      avoidFoods: ['Spicy foods', 'Caffeine', 'Alcohol', 'Processed foods'],
      keyNutrients: ['Phytoestrogens', 'Calcium', 'Vitamin D', 'B-vitamins', 'Omega-3s'],
      mealPlanFocus: ['Hormone-supporting foods', 'Bone health', 'Weight management', 'Cooling foods']
    }
  },
  {
    id: 'thyroid_issues',
    name: 'Thyroid Issues',
    description: 'Problems with thyroid function affecting metabolism',
    category: 'hormonal',
    severity: 'moderate',
    commonSymptoms: ['Fatigue', 'Weight changes', 'Temperature sensitivity', 'Hair loss', 'Mood changes'],
    nutritionalSupport: {
      beneficialFoods: ['Iodine-rich foods', 'Selenium-rich foods', 'Zinc-rich foods', 'Tyrosine-rich foods'],
      avoidFoods: ['Goitrogenic foods (raw)', 'Gluten (if sensitive)', 'Soy (if sensitive)'],
      keyNutrients: ['Iodine', 'Selenium', 'Zinc', 'Tyrosine', 'Iron'],
      mealPlanFocus: ['Thyroid-supporting nutrients', 'Metabolic support', 'Anti-inflammatory foods', 'Nutrient density']
    },
    medicalDisclaimer: 'Work with healthcare provider for thyroid monitoring and medication management'
  },

  // CARDIOVASCULAR
  {
    id: 'high_blood_pressure',
    name: 'High Blood Pressure',
    description: 'Elevated blood pressure that increases cardiovascular risk',
    category: 'cardiovascular',
    severity: 'moderate',
    commonSymptoms: ['Often no symptoms', 'Headaches', 'Dizziness', 'Chest pain'],
    nutritionalSupport: {
      beneficialFoods: ['Potassium-rich foods', 'Magnesium-rich foods', 'Garlic', 'Beets', 'Leafy greens', 'Berries'],
      avoidFoods: ['High sodium foods', 'Processed foods', 'Excess alcohol', 'Saturated fats'],
      keyNutrients: ['Potassium', 'Magnesium', 'Calcium', 'Nitrates', 'Antioxidants'],
      mealPlanFocus: ['DASH diet principles', 'Low sodium', 'Heart-healthy foods', 'Blood pressure support']
    },
    medicalDisclaimer: 'Regular monitoring and medical management essential for high blood pressure'
  },
  {
    id: 'high_cholesterol',
    name: 'High Cholesterol',
    description: 'Elevated cholesterol levels increasing heart disease risk',
    category: 'cardiovascular',
    severity: 'moderate',
    commonSymptoms: ['Usually no symptoms', 'Chest pain (advanced)', 'Fatigue'],
    nutritionalSupport: {
      beneficialFoods: ['Soluble fiber foods', 'Nuts', 'Olive oil', 'Fatty fish', 'Plant sterols', 'Garlic'],
      avoidFoods: ['Saturated fats', 'Trans fats', 'Processed meats', 'Fried foods'],
      keyNutrients: ['Soluble fiber', 'Plant sterols', 'Omega-3s', 'Niacin', 'Antioxidants'],
      mealPlanFocus: ['Heart-healthy diet', 'Cholesterol-lowering foods', 'Mediterranean diet', 'Fiber-rich meals']
    },
    medicalDisclaimer: 'Work with healthcare provider for cholesterol management and monitoring'
  },

  // DETOX & CLEANSING
  {
    id: 'liver_congestion',
    name: 'Liver Congestion',
    description: 'Sluggish liver function affecting detoxification',
    category: 'detox_cleansing',
    severity: 'mild',
    commonSymptoms: ['Fatigue', 'Digestive issues', 'Skin problems', 'Chemical sensitivities'],
    nutritionalSupport: {
      beneficialFoods: ['Cruciferous vegetables', 'Beets', 'Artichokes', 'Garlic', 'Turmeric', 'Green tea'],
      avoidFoods: ['Alcohol', 'Processed foods', 'Excess fats', 'Toxins'],
      keyNutrients: ['Sulfur compounds', 'Antioxidants', 'B-vitamins', 'Choline', 'Milk thistle'],
      mealPlanFocus: ['Liver-supporting foods', 'Detoxification support', 'Phase I & II detox nutrients', 'Gentle cleansing']
    }
  },

  // IMMUNE SYSTEM
  {
    id: 'frequent_infections',
    name: 'Frequent Infections',
    description: 'Recurring infections indicating compromised immune function',
    category: 'immune_system',
    severity: 'moderate',
    commonSymptoms: ['Recurring colds', 'Slow healing', 'Fatigue', 'Swollen lymph nodes'],
    nutritionalSupport: {
      beneficialFoods: ['Vitamin C foods', 'Zinc-rich foods', 'Garlic', 'Ginger', 'Mushrooms', 'Probiotics'],
      avoidFoods: ['Excess sugar', 'Processed foods', 'Alcohol', 'Trans fats'],
      keyNutrients: ['Vitamin C', 'Zinc', 'Vitamin D', 'Selenium', 'Probiotics'],
      mealPlanFocus: ['Immune-boosting foods', 'Anti-viral nutrients', 'Gut health support', 'Antioxidant-rich diet']
    },
    medicalDisclaimer: 'Consult healthcare provider to investigate underlying immune system issues'
  },
  {
    id: 'allergies',
    name: 'Allergies',
    description: 'Immune system overreaction to normally harmless substances',
    category: 'immune_system',
    severity: 'mild',
    commonSymptoms: ['Sneezing', 'Runny nose', 'Itchy eyes', 'Skin reactions', 'Digestive upset'],
    nutritionalSupport: {
      beneficialFoods: ['Quercetin-rich foods', 'Vitamin C foods', 'Anti-inflammatory foods', 'Local honey'],
      avoidFoods: ['Known allergens', 'Histamine-rich foods', 'Inflammatory foods'],
      keyNutrients: ['Quercetin', 'Vitamin C', 'Omega-3s', 'Natural antihistamines'],
      mealPlanFocus: ['Anti-allergic foods', 'Immune modulation', 'Inflammation reduction', 'Histamine management']
    }
  },

  // SKIN & BEAUTY
  {
    id: 'acne',
    name: 'Acne',
    description: 'Skin condition with pimples, blackheads, and inflammation',
    category: 'skin_beauty',
    severity: 'mild',
    commonSymptoms: ['Pimples', 'Blackheads', 'Whiteheads', 'Inflamed skin', 'Scarring'],
    nutritionalSupport: {
      beneficialFoods: ['Low-glycemic foods', 'Omega-3 rich foods', 'Zinc-rich foods', 'Antioxidant foods'],
      avoidFoods: ['High-glycemic foods', 'Dairy (if sensitive)', 'Processed foods', 'Trans fats'],
      keyNutrients: ['Zinc', 'Omega-3s', 'Vitamin A', 'Selenium', 'Antioxidants'],
      mealPlanFocus: ['Low-glycemic diet', 'Anti-inflammatory foods', 'Hormone-balancing foods', 'Skin-supporting nutrients']
    }
  },
  {
    id: 'eczema',
    name: 'Eczema',
    description: 'Inflammatory skin condition causing dry, itchy, red patches',
    category: 'skin_beauty',
    severity: 'moderate',
    commonSymptoms: ['Dry skin', 'Itching', 'Red patches', 'Scaling', 'Cracking'],
    nutritionalSupport: {
      beneficialFoods: ['Omega-3 rich foods', 'Probiotics', 'Anti-inflammatory foods', 'Zinc-rich foods'],
      avoidFoods: ['Common allergens', 'Inflammatory foods', 'Processed foods', 'Excess sugar'],
      keyNutrients: ['Omega-3s', 'Probiotics', 'Zinc', 'Vitamin E', 'Quercetin'],
      mealPlanFocus: ['Anti-inflammatory diet', 'Gut health support', 'Skin barrier support', 'Allergy management']
    }
  }
];

export const AILMENT_CATEGORIES: AilmentCategoryInfo[] = [
  {
    id: 'digestive',
    name: 'Digestive Issues',
    description: 'Problems related to digestion, gut health, and gastrointestinal function',
    icon: '🥗',
    color: 'green',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'digestive')
  },
  {
    id: 'energy_metabolism',
    name: 'Energy & Metabolism',
    description: 'Issues with energy levels, metabolism, and blood sugar regulation',
    icon: '⚡',
    color: 'yellow',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'energy_metabolism')
  },
  {
    id: 'inflammatory',
    name: 'Inflammatory Conditions',
    description: 'Chronic inflammation, joint pain, and inflammatory responses',
    icon: '🔥',
    color: 'red',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'inflammatory')
  },
  {
    id: 'mental_health',
    name: 'Mental Health',
    description: 'Mood, cognitive function, and mental wellness concerns',
    icon: '🧠',
    color: 'purple',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'mental_health')
  },
  {
    id: 'hormonal',
    name: 'Hormonal Issues',
    description: 'Hormonal imbalances and endocrine system concerns',
    icon: '⚖️',
    color: 'pink',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'hormonal')
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular',
    description: 'Heart health, blood pressure, and circulation issues',
    icon: '❤️',
    color: 'red',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'cardiovascular')
  },
  {
    id: 'detox_cleansing',
    name: 'Detox & Cleansing',
    description: 'Liver function, detoxification, and cleansing support',
    icon: '🌿',
    color: 'green',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'detox_cleansing')
  },
  {
    id: 'immune_system',
    name: 'Immune System',
    description: 'Immune function, allergies, and infection resistance',
    icon: '🛡️',
    color: 'blue',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'immune_system')
  },
  {
    id: 'skin_beauty',
    name: 'Skin & Beauty',
    description: 'Skin health, appearance, and beauty-related concerns',
    icon: '✨',
    color: 'gold',
    ailments: CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === 'skin_beauty')
  }
];

/**
 * Helper functions for working with ailments data
 */
export const getAilmentById = (id: string): ClientAilment | undefined => {
  return CLIENT_AILMENTS_DATABASE.find(ailment => ailment.id === id);
};

export const getAilmentsByCategory = (category: AilmentCategory): ClientAilment[] => {
  return CLIENT_AILMENTS_DATABASE.filter(ailment => ailment.category === category);
};

export const getCategoryInfo = (category: AilmentCategory): AilmentCategoryInfo | undefined => {
  return AILMENT_CATEGORIES.find(cat => cat.id === category);
};

export const searchAilments = (query: string): ClientAilment[] => {
  const lowercaseQuery = query.toLowerCase();
  return CLIENT_AILMENTS_DATABASE.filter(ailment => 
    ailment.name.toLowerCase().includes(lowercaseQuery) ||
    ailment.description.toLowerCase().includes(lowercaseQuery) ||
    ailment.commonSymptoms.some(symptom => symptom.toLowerCase().includes(lowercaseQuery))
  );
};

export const getAilmentNutritionalFocus = (ailmentIds: string[]): {
  beneficialFoods: string[];
  avoidFoods: string[];
  keyNutrients: string[];
  mealPlanFocus: string[];
} => {
  const ailments = ailmentIds.map(id => getAilmentById(id)).filter(Boolean) as ClientAilment[];
  
  const combined = {
    beneficialFoods: new Set<string>(),
    avoidFoods: new Set<string>(),
    keyNutrients: new Set<string>(),
    mealPlanFocus: new Set<string>()
  };

  ailments.forEach(ailment => {
    ailment.nutritionalSupport.beneficialFoods.forEach(food => combined.beneficialFoods.add(food));
    ailment.nutritionalSupport.avoidFoods.forEach(food => combined.avoidFoods.add(food));
    ailment.nutritionalSupport.keyNutrients.forEach(nutrient => combined.keyNutrients.add(nutrient));
    ailment.nutritionalSupport.mealPlanFocus.forEach(focus => combined.mealPlanFocus.add(focus));
  });

  return {
    beneficialFoods: Array.from(combined.beneficialFoods),
    avoidFoods: Array.from(combined.avoidFoods),
    keyNutrients: Array.from(combined.keyNutrients),
    mealPlanFocus: Array.from(combined.mealPlanFocus)
  };
};