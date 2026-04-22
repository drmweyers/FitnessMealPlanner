/**
 * In-App Resources referenced by the Business Vault PDFs.
 *
 * These are the email templates, questionnaire, and meal-plan template
 * references that the PDFs tell trainers to use "in your dashboard."
 * Kept as typed static data — trainers copy emails to their own CRM,
 * share the questionnaire with clients, and clone meal-plan templates
 * via the trainer dashboard.
 */

export interface EmailTemplate {
  slug: string;
  title: string;
  category: "onboarding" | "retention" | "acquisition";
  subject: string;
  body: string;
  placeholders: string[];
}

export interface QuestionnaireSection {
  heading: string;
  questions: string[];
}

export interface DietaryQuestionnaire {
  title: string;
  intro: string;
  sections: QuestionnaireSection[];
}

export interface MealPlanTemplateRef {
  slug: string;
  title: string;
  tagline: string;
  tags: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    slug: "day-1-welcome",
    title: "Day 1 — Welcome + Meal Plan Delivery",
    category: "onboarding",
    subject:
      "Your custom meal plan is ready, {{firstName}} — here's how to start",
    body: `Hi {{firstName}},

Welcome aboard — your custom meal plan is in your dashboard and ready to go.

Here are the three things I want you to do today:

1. Log in and open your meal plan: {{dashboardUrl}}
2. Read the first three recipes end-to-end before you touch a grocery store. I don't want you guessing at portions at the checkout.
3. Reply to this email with one word: READY. That's my signal that you've had a look and you're committed to Week 1.

A few reminders before you start:

• This plan is built around your goal of {{primaryGoal}}. Follow the meals in order — every swap weakens the plan.
• Your shopping list is inside the plan. Use it. No freestyling the grocery run.
• You'll get a check-in from me on Day 3. If anything is unclear before then, hit reply.

I'm in your corner.

— {{trainerName}}`,
    placeholders: ["firstName", "dashboardUrl", "primaryGoal", "trainerName"],
  },
  {
    slug: "day-3-check-in",
    title: "Day 3 — Early Check-In",
    category: "onboarding",
    subject: "{{firstName}}, quick check — how's the plan feeling?",
    body: `Hi {{firstName}},

You're three days in. This is the window where the early wins happen AND where most people get tripped up by something small.

Tell me:

1. Did you complete all of your meals on Day 1 and Day 2?
2. What's one thing that felt surprisingly easy?
3. What's one thing that felt harder than you expected?

Reply right here — even one-line answers are fine. The sooner I see the friction, the sooner I can adjust.

Tomorrow is the last day of Week 1's initial push. Stay on plan.

— {{trainerName}}`,
    placeholders: ["firstName", "trainerName"],
  },
  {
    slug: "week-4-reengagement",
    title: "Week 4 — Drop-Off Re-Engagement",
    category: "retention",
    subject: "{{firstName}} — I noticed you went quiet. Can we talk?",
    body: `Hi {{firstName}},

I haven't seen you log in to the app this week. No judgment — life happens — but I want to check in before a slow week turns into a month off-plan.

The most common reason people slip at Week 4 is one of these three:

1. The plan got too repetitive. (Fixable — I can swap meals today.)
2. Something changed at home or work. (Also fixable — we can scale down, not off.)
3. Early results stalled and motivation dropped. (Very fixable — Week 4 is always the plateau, not the ceiling.)

Which one is it? Reply with the number.

If I don't hear back, I'll send you one more note in three days and then give you space. But I'd much rather adjust the plan than lose you.

— {{trainerName}}`,
    placeholders: ["firstName", "trainerName"],
  },
  {
    slug: "waitlist-acquisition",
    title: "Lead Magnet → Sales Conversation",
    category: "acquisition",
    subject:
      "{{firstName}} — quick question after you downloaded the meal guide",
    body: `Hi {{firstName}},

I saw you grabbed the free meal plan guide yesterday. Hope it's useful.

One question before you close the tab on it:

What's the ONE thing about meal planning that's been keeping you stuck? Not what you've read online — what YOU keep hitting in your own week.

I ask because the guide covers the general playbook, but if I know your specific friction point I can point you at the exact section that matters (and skip you past the rest).

Hit reply with whatever comes to mind. Two sentences is plenty.

— {{trainerName}}`,
    placeholders: ["firstName", "trainerName"],
  },
];

export const DIETARY_QUESTIONNAIRE: DietaryQuestionnaire = {
  title: "New Client — Dietary Intake Questionnaire",
  intro:
    "Send this form to new clients before their first session. It takes 5–10 minutes and gives you the signal you need to build a meal plan that actually sticks.",
  sections: [
    {
      heading: "Basics",
      questions: [
        "Full name and preferred name",
        "Date of birth",
        "Height and current weight",
        "Your primary goal for the next 12 weeks (fat loss, muscle gain, recomposition, performance, other)",
        "How would you describe your activity level outside of training? (sedentary, lightly active, moderately active, very active)",
      ],
    },
    {
      heading: "Medical & Safety",
      questions: [
        "Any diagnosed food allergies or intolerances? Please list each one.",
        "Any medical conditions that affect how you eat (diabetes, IBS, thyroid, PCOS, other)?",
        "Are you taking any medications that affect appetite or digestion?",
        "History of disordered eating? (Answer yes/no — if yes, I'll follow up privately.)",
        "Are you currently pregnant or breastfeeding?",
      ],
    },
    {
      heading: "Food Preferences",
      questions: [
        "Foods you will NOT eat under any circumstance (not allergy — preference)",
        "Foods you strongly dislike but could tolerate",
        "Protein sources you eat weekly (chicken, beef, fish, eggs, tofu, etc.)",
        "How many meals per day do you prefer? (2, 3, 4, 5)",
        "Do you eat breakfast? If yes, by what time?",
      ],
    },
    {
      heading: "Lifestyle Fit",
      questions: [
        "How many nights per week do you cook at home?",
        "How many meals per week do you eat at restaurants or get delivery?",
        "How much time can you realistically spend on meal prep on a weekend? (0, <1hr, 1-2hr, 2-4hr, 4hr+)",
        "What's your typical grocery budget per week?",
        "Who else do you cook for? (just me, partner, family with kids, roommates)",
      ],
    },
    {
      heading: "Goal Context",
      questions: [
        "Why is this goal important to you right now?",
        "What's the main thing that has stopped you from reaching it in the past?",
        "On a scale of 1–10, how important is it that the meal plan is flexible vs. exact?",
        "Anything else I should know before building your plan?",
      ],
    },
  ],
};

export const MEAL_PLAN_TEMPLATES: MealPlanTemplateRef[] = [
  {
    slug: "7-day-high-protein-starter",
    title: "7-Day High-Protein Starter",
    tagline:
      "A balanced 2,000-calorie plan with 180g+ protein per day — the default template for new fat-loss and recomp clients.",
    tags: ["template", "high-protein", "starter", "fat-loss"],
  },
  {
    slug: "7-day-travel-friendly",
    title: "7-Day Travel-Friendly Plan",
    tagline:
      "Hotel-room breakfasts, room-service-friendly lunches, and restaurant ordering guides for clients on the road.",
    tags: ["template", "travel", "flexible"],
  },
  {
    slug: "7-day-home-cook-family",
    title: "7-Day Home-Cook Family Plan",
    tagline:
      "Meals that scale to 2–4 people with a single grocery list — for clients feeding a household alongside their own goal.",
    tags: ["template", "family", "home-cooked"],
  },
];
