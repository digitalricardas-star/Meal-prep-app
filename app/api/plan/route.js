import {
  getPlan,
  getMeals,
  createPlanEntry,
  updatePage,
  archivePage,
} from "@/lib/notion";
import { addDays } from "@/lib/rotation";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    if (!start) return Response.json({ error: "start required" }, { status: 400 });
    const end = addDays(start, 6);
    const [plan, meals] = await Promise.all([getPlan(start, end), getMeals()]);
    const mealsById = Object.fromEntries(meals.map((m) => [m.id, m]));
    return Response.json({ plan, mealsById });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: swap the meal on an existing plan entry
export async function PATCH(req) {
  try {
    const { id, mealId, name, source } = await req.json();
    if (!id || !mealId)
      return Response.json({ error: "id and mealId required" }, { status: 400 });
    const props = { Meal: { relation: [{ id: mealId }] } };
    if (name) props["Name"] = { title: [{ text: { content: name } }] };
    if (source) props["Source"] = { select: { name: source } };
    await updatePage(id, props);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST: add a single plan entry (e.g. fill an empty day)
export async function POST(req) {
  try {
    const { date, slot, mealId, name, source, portions } = await req.json();
    if (!date || !mealId)
      return Response.json({ error: "date and mealId required" }, { status: 400 });
    await createPlanEntry({
      name,
      date,
      slot: slot || "Dinner",
      mealId,
      source: source || "Fresh cook",
      portions: portions || 2,
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: remove a plan entry (archives the Notion page)
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await archivePage(id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
