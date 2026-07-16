import { getMeals, updatePage, createMeal, archiveMeal, richText } from "@/lib/notion";

export async function GET() {
  try {
    const meals = await getMeals();
    return Response.json({ meals });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: archive a meal (moves it to Notion trash)
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await archiveMeal(id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST: create a new meal from the in-app form
export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return Response.json({ error: "Meal name is required" }, { status: 400 });
    }
    const page = await createMeal(body);
    return Response.json({ ok: true, id: page.id });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: update any subset of a meal's fields (used for the quick rating /
// rotation toggles AND the full edit form).
export async function PATCH(req) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "id required" }, { status: 400 });
    if (b.name !== undefined && !String(b.name).trim()) {
      return Response.json({ error: "Meal name can't be empty" }, { status: 400 });
    }

    const props = {};
    if (b.name !== undefined)
      props["Name"] = { title: [{ text: { content: b.name.trim().slice(0, 2000) } }] };
    if (b.category !== undefined) props["Category"] = { select: { name: b.category } };
    if (b.basePortions !== undefined)
      props["Base portions"] = { number: Number(b.basePortions) || 2 };
    if (b.protein !== undefined)
      props["Protein per portion"] = { number: Number(b.protein) || 0 };
    if (b.calories !== undefined)
      props["Calories per portion"] = { number: Number(b.calories) || 0 };
    if (b.fridgeLife !== undefined)
      props["Fridge life days"] = { number: Number(b.fridgeLife) || 2 };
    if (b.rating !== undefined) props["Rating"] = { number: Number(b.rating) || 3 };
    if (b.batchFriendly !== undefined)
      props["Batch friendly"] = { checkbox: !!b.batchFriendly };
    if (b.freezerFriendly !== undefined)
      props["Freezer friendly"] = { checkbox: !!b.freezerFriendly };
    if (b.babyFriendly !== undefined)
      props["Baby friendly"] = { checkbox: !!b.babyFriendly };
    if (b.active !== undefined)
      props["Active in rotation"] = { checkbox: !!b.active };
    if (b.ingredients !== undefined)
      props["Ingredients"] = { rich_text: richText(b.ingredients) };
    if (b.recipe !== undefined) props["Recipe"] = { rich_text: richText(b.recipe) };
    if (b.notes !== undefined) props["Notes"] = { rich_text: richText(b.notes) };

    await updatePage(b.id, props);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
