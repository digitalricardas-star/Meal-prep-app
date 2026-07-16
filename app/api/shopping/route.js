import { getPlan, getMeals } from "@/lib/notion";
import { addDays } from "@/lib/rotation";
import { aggregateShoppingList } from "@/lib/ingredients";
import { pushShoppingList } from "@/lib/todoist";

async function buildList(start) {
  const end = addDays(start, 6);
  const [plan, meals] = await Promise.all([getPlan(start, end), getMeals()]);
  const mealsById = Object.fromEntries(meals.map((m) => [m.id, m]));

  // Only fresh cooks need groceries; group portions per meal (cook + leftovers
  // were cooked at once, so count every planned portion of that meal).
  const portionsByMeal = {};
  for (const e of plan) {
    if (e.source === "Freezer") continue; // already cooked, no groceries
    if (e.source === "Shared") continue; // baby shares the adult dinner — no extra shop
    if (!e.mealId || !mealsById[e.mealId]) continue;
    portionsByMeal[e.mealId] = (portionsByMeal[e.mealId] || 0) + e.portions;
  }

  const items = Object.entries(portionsByMeal).map(([mealId, plannedPortions]) => ({
    meal: mealsById[mealId],
    plannedPortions,
  }));
  return aggregateShoppingList(items);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    if (!start) return Response.json({ error: "start required" }, { status: 400 });
    const list = await buildList(start);
    return Response.json({ list });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST: push the aggregated list to Todoist
export async function POST(req) {
  try {
    const { start, items } = await req.json();
    const list = items && items.length ? items : await buildList(start);
    const result = await pushShoppingList(list);
    return Response.json(result);
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
