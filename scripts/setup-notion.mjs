// One-time setup: creates the 3 Notion databases and seeds starter meals.
// Usage:
//   1. Put NOTION_TOKEN and NOTION_PARENT_PAGE_ID in .env.local
//   2. npm run setup
// The script appends the created database IDs to .env.local.

import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { recipes } from "./recipes.mjs";

// --- tiny .env.local loader (no dependency) ---
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TOKEN = process.env.NOTION_TOKEN;
const PARENT = (process.env.NOTION_PARENT_PAGE_ID || "").replace(/-/g, "");
if (!TOKEN || !PARENT) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_PARENT_PAGE_ID in .env.local — see README step 2."
  );
  process.exit(1);
}

async function notion(path, method, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Notion ${path} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const select = (options) => ({ select: { options: options.map((name) => ({ name })) } });

console.log("Creating Meals database…");
const mealsDb = await notion("/databases", "POST", {
  parent: { type: "page_id", page_id: PARENT },
  title: [{ text: { content: "🍲 Meals" } }],
  properties: {
    Name: { title: {} },
    Category: select(["Chicken", "Fish", "Red meat", "Pork", "Vegetarian", "Soup", "Baby", "Other"]),
    "Base portions": { number: {} },
    "Protein per portion": { number: {} },
    "Calories per portion": { number: {} },
    "Batch friendly": { checkbox: {} },
    "Freezer friendly": { checkbox: {} },
    "Baby friendly": { checkbox: {} },
    "Fridge life days": { number: {} },
    Rating: { number: {} },
    "Active in rotation": { checkbox: {} },
    "Last cooked": { date: {} },
    "Times cooked": { number: {} },
    Ingredients: { rich_text: {} },
    Recipe: { rich_text: {} },
    Notes: { rich_text: {} },
  },
});

console.log("Creating Meal Plan database…");
const planDb = await notion("/databases", "POST", {
  parent: { type: "page_id", page_id: PARENT },
  title: [{ text: { content: "📅 Meal Plan" } }],
  properties: {
    Name: { title: {} },
    Date: { date: {} },
    Slot: select(["Lunch", "Dinner", "Baby"]),
    Meal: { relation: { database_id: mealsDb.id, single_property: {} } },
    Source: select(["Fresh cook", "Leftover", "Freezer", "Shared", "Baby meal"]),
    Portions: { number: {} },
    Status: select(["Planned", "Cooked", "Eaten", "Skipped"]),
  },
});

console.log("Creating Freezer database…");
const freezerDb = await notion("/databases", "POST", {
  parent: { type: "page_id", page_id: PARENT },
  title: [{ text: { content: "🧊 Freezer" } }],
  properties: {
    Name: { title: {} },
    Meal: { relation: { database_id: mealsDb.id, single_property: {} } },
    Portions: { number: {} },
    "Frozen on": { date: {} },
    "Use by": { date: {} },
    Status: select(["In freezer", "Used"]),
    For: select(["Adult", "Baby", "Shared"]),
  },
});

// ---------------- seed meals ----------------
// qty per Base portions; protein/calories are per adult portion (approx).
const seedMeals = [
  {
    name: "Asian marinade chicken thighs + rice",
    category: "Chicken", basePortions: 4, protein: 38, calories: 640,
    batch: true, freezer: true, fridgeLife: 3, rating: 4,
    ingredients: "800 g skinless chicken thighs\n300 g jasmine rice\n3 tbsp soy sauce\n2 tbsp sesame oil\n1 tbsp grated ginger\n3 clove garlic\n2 spring onions\n1 broccoli head",
    notes: "Fan 200°C, ~25 min, swap trays halfway.",
  },
  {
    name: "Mediterranean chicken thighs + couscous",
    category: "Chicken", basePortions: 4, protein: 37, calories: 610,
    batch: true, freezer: true, fridgeLife: 3, rating: 4,
    ingredients: "800 g skinless chicken thighs\n250 g couscous\n2 tbsp olive oil\n1 lemon\n2 tsp dried oregano\n3 clove garlic\n2 courgettes\n250 g cherry tomatoes",
    notes: "Fan 200°C, ~25 min.",
  },
  {
    name: "Indian-spiced chicken thighs + rice",
    category: "Chicken", basePortions: 4, protein: 38, calories: 650,
    batch: true, freezer: true, fridgeLife: 3, rating: 4,
    ingredients: "800 g skinless chicken thighs\n300 g basmati rice\n150 g yogurt\n2 tbsp garam masala\n1 tbsp turmeric\n1 tbsp grated ginger\n3 clove garlic\n1 cauliflower head",
    notes: "Yogurt marinade, fan 200°C ~25 min.",
  },
  {
    name: "Honey-soy-garlic chicken + noodles",
    category: "Chicken", basePortions: 4, protein: 37, calories: 680,
    batch: true, freezer: true, fridgeLife: 3, rating: 5,
    ingredients: "800 g skinless chicken thighs\n300 g egg noodles\n3 tbsp honey\n4 tbsp soy sauce\n4 clove garlic\n2 carrots\n1 red pepper\n200 g sugar snap peas",
    notes: "Family favourite.",
  },
  {
    name: "Baked salmon, potatoes & broccoli",
    category: "Fish", basePortions: 2, protein: 34, calories: 620,
    batch: false, freezer: false, fridgeLife: 1, rating: 4, baby: true,
    ingredients: "300 g salmon fillets\n500 g baby potatoes\n1 broccoli head\n1 lemon\n2 tbsp olive oil\n2 tsp dijon mustard",
    notes: "Cook fresh — doesn't keep well.",
  },
  {
    name: "Beef bolognese + pasta",
    category: "Red meat", basePortions: 6, protein: 35, calories: 720,
    batch: true, freezer: true, fridgeLife: 3, rating: 5, baby: true,
    ingredients: "800 g beef mince\n2 cans chopped tomatoes\n500 g spaghetti\n2 onions\n2 carrots\n4 clove garlic\n2 tbsp tomato paste\n100 ml milk\n2 tsp dried oregano",
    notes: "Classic batch meal — freeze sauce flat in bags.",
  },
  {
    name: "Lentil & vegetable curry",
    category: "Vegetarian", basePortions: 6, protein: 22, calories: 560,
    batch: true, freezer: true, fridgeLife: 4, rating: 3, baby: true,
    ingredients: "400 g red lentils\n1 can coconut milk\n1 can chopped tomatoes\n300 g rice\n2 onions\n3 clove garlic\n2 tbsp curry paste\n300 g spinach\n2 carrots",
    notes: "Cheap, freezes perfectly.",
  },
  {
    name: "Chicken & vegetable soup",
    category: "Soup", basePortions: 6, protein: 28, calories: 420,
    batch: true, freezer: true, fridgeLife: 4, rating: 3, baby: true,
    ingredients: "600 g chicken thighs\n2 l chicken stock\n3 carrots\n2 leeks\n200 g pearl barley\n2 celery sticks\n1 onion",
    notes: "Great freezer buffer meal.",
  },
  {
    name: "Chili con carne + rice",
    category: "Red meat", basePortions: 6, protein: 33, calories: 690,
    batch: true, freezer: true, fridgeLife: 4, rating: 4,
    ingredients: "700 g beef mince\n2 cans kidney beans\n2 cans chopped tomatoes\n300 g rice\n2 onions\n3 clove garlic\n2 tbsp chili powder\n1 tsp cumin",
    notes: "Freeze in 2-portion tubs.",
  },
  {
    name: "Pork tenderloin + roasted vegetables",
    category: "Pork", basePortions: 2, protein: 36, calories: 580,
    batch: false, freezer: false, fridgeLife: 2, rating: 3,
    ingredients: "400 g pork tenderloin\n500 g baby potatoes\n2 carrots\n1 red onion\n2 tbsp olive oil\n2 tsp smoked paprika",
    notes: "Quick one-tray dinner.",
  },
  {
    name: "Greek salad with chickpeas & feta",
    category: "Vegetarian", basePortions: 2, protein: 20, calories: 520,
    batch: false, freezer: false, fridgeLife: 1, rating: 3,
    ingredients: "1 can chickpeas\n200 g feta\n1 cucumber\n250 g cherry tomatoes\n1 red onion\n80 g olives\n3 tbsp olive oil\n1 lemon",
    notes: "No-cook dinner for hot days.",
  },
  {
    name: "Veggie omelette + salad",
    category: "Vegetarian", basePortions: 2, protein: 26, calories: 480,
    batch: false, freezer: false, fridgeLife: 1, rating: 3,
    ingredients: "6 eggs\n100 g cheese\n1 red pepper\n1 onion\n100 g mushrooms\n1 bag salad leaves\n2 tbsp olive oil",
    notes: "10-minute fallback dinner.",
  },
];

console.log(`Seeding ${seedMeals.length} starter meals…`);
for (const m of seedMeals) {
  await notion("/pages", "POST", {
    parent: { database_id: mealsDb.id },
    properties: {
      Name: { title: [{ text: { content: m.name } }] },
      Category: { select: { name: m.category } },
      "Base portions": { number: m.basePortions },
      "Protein per portion": { number: m.protein },
      "Calories per portion": { number: m.calories },
      "Batch friendly": { checkbox: m.batch },
      "Freezer friendly": { checkbox: m.freezer },
      "Baby friendly": { checkbox: !!m.baby },
      "Fridge life days": { number: m.fridgeLife },
      Rating: { number: m.rating },
      "Active in rotation": { checkbox: true },
      "Times cooked": { number: 0 },
      Ingredients: { rich_text: [{ text: { content: m.ingredients } }] },
      Recipe: { rich_text: [{ text: { content: recipes[m.name] || "" } }] },
      Notes: { rich_text: [{ text: { content: m.notes } }] },
    },
  });
  console.log(`  ✓ ${m.name}`);
}

const envLines = `
# Added by npm run setup on ${new Date().toISOString().slice(0, 10)}
NOTION_MEALS_DB=${mealsDb.id}
NOTION_PLAN_DB=${planDb.id}
NOTION_FREEZER_DB=${freezerDb.id}
`;
appendFileSync(".env.local", envLines);

console.log("\nDone! Database IDs were added to .env.local:");
console.log(envLines);
console.log("Next: add your TODOIST_TOKEN to .env.local, then run: npm run dev");
