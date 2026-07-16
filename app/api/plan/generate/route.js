import { getMeals, getFreezer, createPlanEntry } from "@/lib/notion";
import { generateWeek, generateBabyWeek } from "@/lib/rotation";

export async function POST(req) {
  try {
    const body = await req.json();
    const { start, cookDays } = body;
    if (!start) return Response.json({ error: "start required" }, { status: 400 });

    const adults = Number(process.env.ADULT_PORTIONS || 2);
    // fetch ALL meals: adult rotation uses active ones, baby pool may include
    // baby-only meals that are paused from the adult rotation.
    const [allMeals, freezer] = await Promise.all([getMeals(), getFreezer()]);
    const activeMeals = allMeals.filter((m) => m.active !== false);

    if (activeMeals.length === 0) {
      return Response.json(
        { error: "No active meals in rotation. Add meals in Notion first." },
        { status: 400 }
      );
    }

    const week = generateWeek({
      meals: activeMeals,
      freezer,
      startDate: start,
      cookDayOffsets: cookDays && cookDays.length ? cookDays : [0, 3, 5],
      adults,
    });

    const babyWeek = generateBabyWeek({
      adultWeek: week,
      meals: allMeals,
      startDate: start,
    });

    const dayName = (iso) =>
      new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "short",
        timeZone: "UTC",
      });

    // persist to Notion sequentially (rate limits) — adults then baby
    for (const entry of week) {
      await createPlanEntry({
        name: `${dayName(entry.date)} ${entry.slot} — ${entry.mealName}`,
        date: entry.date,
        slot: entry.slot,
        mealId: entry.mealId,
        source: entry.source,
        portions: entry.portions,
      });
    }
    for (const entry of babyWeek) {
      await createPlanEntry({
        name: `${dayName(entry.date)} Baby — ${entry.mealName}`,
        date: entry.date,
        slot: entry.slot,
        mealId: entry.mealId,
        source: entry.source,
        portions: entry.portions,
      });
    }

    return Response.json({ week, babyWeek });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
