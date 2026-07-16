import { updatePage, createFreezerEntry, notionFetch, mealFromPage } from "@/lib/notion";
import { addDays } from "@/lib/rotation";

// Mark a plan entry as cooked: update meal stats, optionally freeze portions.
export async function POST(req) {
  try {
    const { planId, mealId, freezePortions = 0, date, forWhom } = await req.json();
    const today = date || new Date().toISOString().slice(0, 10);

    await updatePage(planId, { Status: { select: { name: "Cooked" } } });

    if (mealId) {
      const page = await notionFetch(`/pages/${mealId}`);
      const meal = mealFromPage(page);
      await updatePage(mealId, {
        "Last cooked": { date: { start: today } },
        "Times cooked": { number: (meal.timesCooked || 0) + 1 },
      });
      if (freezePortions > 0) {
        await createFreezerEntry({
          name: `${meal.name} (${freezePortions} portions)`,
          mealId,
          portions: freezePortions,
          frozenOn: today,
          useBy: addDays(today, 90),
          // fall back to the meal's own baby-friendliness if the client
          // didn't send an explicit label
          forWhom: forWhom || (meal.babyFriendly ? "Shared" : "Adult"),
        });
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
