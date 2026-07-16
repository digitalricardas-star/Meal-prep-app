// Weekly plan generator: batch cooking + freezer usage + variety rotation.
//
// Strategy for a 7-dinner week with default cook days [Sun, Wed, Fri]:
//  1. Reserve one non-cook day for a freezer meal (oldest use-by first),
//     if freezer inventory exists.
//  2. On each cook day pick a meal, favouring batch-friendly ones for the
//     first cook, and cook enough portions to cover dinners until the next
//     cook day (bounded by the meal's fridge life). Extra batch portions
//     beyond the covered days are suggested for freezing.
//  3. Meal choice is scored: rating x how long since last cooked, with
//     variety constraints (max per category per week, fish target).

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

function daysSince(iso, todayIso) {
  if (!iso) return 60; // never cooked -> strong boost
  return Math.max(
    0,
    Math.round(
      (new Date(`${todayIso}T00:00:00Z`) - new Date(`${iso}T00:00:00Z`)) / DAY_MS
    )
  );
}

export function scoreMeal(meal, todayIso) {
  const recency = Math.min(daysSince(meal.lastCooked, todayIso), 42) / 14; // 0..3
  return (meal.rating || 3) * (0.5 + recency) + Math.random() * 0.75;
}

export function generateWeek({
  meals,
  freezer = [],
  startDate, // ISO Monday (or any start day)
  cookDayOffsets = [0, 3, 5], // days from startDate on which you cook
  adults = 2,
  categoryCap = 2, // max dinners per category per week
  fishTarget = 1, // try to include at least this many fish dinners
  freezerMealsToUse = 1,
}) {
  const pool = meals.filter((m) => m.active !== false);
  const week = []; // {date, slot, mealId, mealName, source, portions, cookPortions?, freezePortions?}
  const categoryCount = {};
  const usedMealIds = new Set();
  const dayAssigned = new Array(7).fill(false);

  // --- 1. freezer meals on non-cook days ---
  const freezerQueue = [...freezer].filter((f) => f.portions >= adults);
  let freezerUsed = 0;
  for (let d = 0; d < 7 && freezerUsed < freezerMealsToUse; d++) {
    if (cookDayOffsets.includes(d)) continue;
    const item = freezerQueue.shift();
    if (!item) break;
    const meal = pool.find((m) => m.id === item.mealId);
    week.push({
      date: addDays(startDate, d),
      slot: "Dinner",
      mealId: item.mealId,
      mealName: meal ? meal.name : item.name,
      source: "Freezer",
      portions: adults,
      freezerEntryId: item.id,
    });
    dayAssigned[d] = true;
    freezerUsed++;
    usedMealIds.add(item.mealId); // don't fresh-cook the same meal this week
    if (meal?.category) {
      categoryCount[meal.category] = (categoryCount[meal.category] || 0) + 1;
    }
  }

  // --- 2. cook days: batch to cover the gap until next cook day ---
  const sortedCookDays = [...cookDayOffsets].sort((a, b) => a - b);
  sortedCookDays.forEach((day, idx) => {
    const nextCookDay = sortedCookDays[idx + 1] ?? 7;
    // days this cook needs to cover (skip already-assigned freezer days)
    const coverDays = [];
    for (let d = day; d < nextCookDay && d < 7; d++) {
      if (!dayAssigned[d]) coverDays.push(d);
    }
    if (coverDays.length === 0) return;

    const needsBatch = coverDays.length > 1;
    const fishSoFar = categoryCount["Fish"] || 0;
    const candidates = pool
      .filter((m) => !usedMealIds.has(m.id))
      .filter((m) => (categoryCount[m.category] || 0) < categoryCap)
      .filter((m) => !needsBatch || m.batchFriendly)
      .filter((m) => !needsBatch || m.fridgeLife >= coverDays.length - 1);

    let ranked = candidates
      .map((m) => ({ m, s: scoreMeal(m, startDate) }))
      .sort((a, b) => b.s - a.s);

    // nudge fish in if we're behind target and it's a viable pick
    if (fishSoFar < fishTarget) {
      const fishIdx = ranked.findIndex((r) => r.m.category === "Fish");
      if (fishIdx > 0) ranked.unshift(ranked.splice(fishIdx, 1)[0]);
    }

    const pick = ranked[0]?.m;
    if (!pick) return;

    usedMealIds.add(pick.id);
    categoryCount[pick.category] = (categoryCount[pick.category] || 0) + 1;

    const eatPortions = coverDays.length * adults;
    // batch+freezer friendly meals: cook extra portions for the freezer
    const freezePortions =
      pick.batchFriendly && pick.freezerFriendly && coverDays.length > 1
        ? adults
        : 0;
    const cookPortions = eatPortions + freezePortions;

    coverDays.forEach((d, i) => {
      week.push({
        date: addDays(startDate, d),
        slot: "Dinner",
        mealId: pick.id,
        mealName: pick.name,
        source: i === 0 ? "Fresh cook" : "Leftover",
        portions: adults,
        ...(i === 0 ? { cookPortions, freezePortions } : {}),
      });
      dayAssigned[d] = true;
    });
  });

  // --- 3. any unassigned days: quick single-day meals ---
  for (let d = 0; d < 7; d++) {
    if (dayAssigned[d]) continue;
    const candidates = pool
      .filter((m) => !usedMealIds.has(m.id))
      .filter((m) => (categoryCount[m.category] || 0) < categoryCap);
    const ranked = candidates
      .map((m) => ({ m, s: scoreMeal(m, startDate) }))
      .sort((a, b) => b.s - a.s);
    const pick = ranked[0]?.m;
    if (!pick) break;
    usedMealIds.add(pick.id);
    categoryCount[pick.category] = (categoryCount[pick.category] || 0) + 1;
    week.push({
      date: addDays(startDate, d),
      slot: "Dinner",
      mealId: pick.id,
      mealName: pick.name,
      source: "Fresh cook",
      portions: adults,
      cookPortions: adults,
      freezePortions: 0,
    });
    dayAssigned[d] = true;
  }

  return week.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Baby track (hybrid): baby shares the family dinner when it's baby-friendly,
// otherwise the planner picks a separate baby meal — rotating the category so
// the baby gets ingredient variety day to day (and never the same category two
// baby days running, nor the same meal twice in the week).
export function generateBabyWeek({ adultWeek, meals, startDate, babyPortions = 1 }) {
  const babyPool = meals.filter((m) => m.babyFriendly);
  if (babyPool.length === 0) return [];
  const mealsById = Object.fromEntries(meals.map((m) => [m.id, m]));

  // the (first) dinner planned for each date
  const dinnerByDate = {};
  for (const e of adultWeek) {
    if (e.slot === "Dinner" && !dinnerByDate[e.date]) dinnerByDate[e.date] = e;
  }

  const out = [];
  const usedIds = new Set();
  let lastCategory = null;

  for (let d = 0; d < 7; d++) {
    const date = addDays(startDate, d);
    const dinner = dinnerByDate[date];
    const dinnerMeal = dinner ? mealsById[dinner.mealId] : null;

    // 1. share the family dinner when it's baby-friendly
    if (dinnerMeal && dinnerMeal.babyFriendly) {
      out.push({
        date,
        slot: "Baby",
        mealId: dinnerMeal.id,
        mealName: dinnerMeal.name,
        source: "Shared",
        portions: babyPortions,
      });
      lastCategory = dinnerMeal.category;
      continue;
    }

    // 2. otherwise pick a separate baby meal, rotating the category
    let candidates = babyPool.filter((m) => !usedIds.has(m.id));
    const varied = candidates.filter((m) => m.category !== lastCategory);
    if (varied.length) candidates = varied;
    if (candidates.length === 0) {
      // exhausted the pool — reset repeats but still avoid same category as yesterday
      usedIds.clear();
      candidates = babyPool.filter((m) => m.category !== lastCategory);
      if (candidates.length === 0) candidates = babyPool;
    }

    const pick = candidates
      .map((m) => ({ m, s: scoreMeal(m, startDate) }))
      .sort((a, b) => b.s - a.s)[0]?.m;
    if (!pick) continue;

    usedIds.add(pick.id);
    lastCategory = pick.category;
    out.push({
      date,
      slot: "Baby",
      mealId: pick.id,
      mealName: pick.name,
      source: "Baby meal",
      portions: babyPortions,
    });
  }
  return out;
}

// Nutrition summary per day for the dashboard.
export function nutritionByDay(planEntries, mealsById) {
  const days = {};
  for (const e of planEntries) {
    const meal = mealsById[e.mealId];
    if (!meal) continue;
    const d = (days[e.date] ||= { protein: 0, calories: 0, meals: [] });
    d.protein += meal.protein;
    d.calories += meal.calories;
    d.meals.push(meal.name);
  }
  return days;
}
