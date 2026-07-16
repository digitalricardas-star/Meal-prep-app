"use client";
import { useCallback, useEffect, useState } from "react";
import { todayIso, mondayOf, addDays, sourceBadge } from "@/components/util";
import WeekHeader from "@/components/WeekHeader";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Planner() {
  const [start, setStart] = useState(mondayOf(todayIso()));
  const [data, setData] = useState(null);
  const [cookDays, setCookDays] = useState([0, 3, 5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [cookingId, setCookingId] = useState(null);
  const [freezeQty, setFreezeQty] = useState(0);

  const load = useCallback(() => {
    // Don't blank the view while refetching — keep the current data on screen
    // and swap it in when the new data arrives (no blink).
    fetch(`/api/plan?start=${start}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(e.message));
  }, [start]);

  useEffect(load, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, cookDays }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Freezer-friendly fresh cooks open an inline stepper; everything else
  // marks cooked immediately.
  function startCooked(entry) {
    const meal = data.mealsById[entry.mealId];
    const cookable = entry.source === "Fresh cook" || entry.source === "Baby meal";
    if (meal?.freezerFriendly && cookable) {
      setFreezeQty(0);
      setCookingId(entry.id);
    } else {
      confirmCooked(entry, 0);
    }
  }

  async function confirmCooked(entry, freeze) {
    const meal = data.mealsById[entry.mealId];
    const forWhom =
      entry.source === "Baby meal"
        ? "Baby"
        : meal?.babyFriendly
        ? "Shared"
        : "Adult";
    await fetch("/api/plan/cooked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: entry.id,
        mealId: entry.mealId,
        freezePortions: freeze,
        date: entry.date,
        forWhom,
      }),
    });
    setCookingId(null);
    load();
  }

  function entryName(date, slot, mealName) {
    const d = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      timeZone: "UTC",
    });
    return slot === "Baby" ? `${d} Baby — ${mealName}` : `${d} ${slot} — ${mealName}`;
  }

  async function swapMeal(entry, mealId) {
    const meal = data.mealsById[mealId];
    if (!meal) return;
    const source =
      entry.slot === "Baby"
        ? "Baby meal"
        : entry.source === "Freezer"
        ? "Freezer"
        : "Fresh cook";
    await fetch("/api/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entry.id,
        mealId,
        name: entryName(entry.date, entry.slot, meal.name),
        source,
      }),
    });
    load();
  }

  async function addMeal(date, mealId, slot = "Dinner") {
    const meal = data.mealsById[mealId];
    if (!meal) return;
    await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        slot,
        mealId,
        name: entryName(date, slot, meal.name),
        source: slot === "Baby" ? "Baby meal" : "Fresh cook",
        portions: slot === "Baby" ? 1 : 2,
      }),
    });
    load();
  }

  async function removeEntry(entry) {
    await fetch("/api/plan", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id }),
    });
    load();
  }

  const days = [...Array(7)].map((_, i) => addDays(start, i));
  const byDate = {};
  (data?.plan || []).forEach((e) => (byDate[e.date] ||= []).push(e));
  const hasPlan = (data?.plan || []).length > 0;
  const allMeals = data
    ? Object.values(data.mealsById).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Week planner</h1>

      <WeekHeader start={start} onChange={setStart} />

      {!hasPlan && data && (
        <div className="card space-y-3">
          <div>
            <p className="text-sm font-semibold text-stone-700">
              Which evenings can you cook this week?
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Tap the days you’ll actually cook. The planner fills every other
              day for you — leftovers from a bigger batch, plus a freezer meal —
              so you’re not cooking from scratch every night.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() =>
                  setCookDays((cd) =>
                    cd.includes(i) ? cd.filter((x) => x !== i) : [...cd, i].sort()
                  )
                }
                className={`badge cursor-pointer border px-3 py-1 ${
                  cookDays.includes(i)
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-stone-300 bg-white text-stone-500"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500">
            💡 Fewer days = more batch cooking and less time at the stove; more
            days = fresher and more variety. 2–3 is the sweet spot for most weeks.
          </p>
          <button className="btn-primary" onClick={generate} disabled={busy || cookDays.length === 0}>
            {busy
              ? "Generating…"
              : cookDays.length === 0
              ? "Pick at least one cook day"
              : `Generate week — cooking ${cookDays.length} ${
                  cookDays.length === 1 ? "day" : "days"
                }`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-stone-500">Loading…</p>}

      {days.map((date) => {
        const dObj = new Date(`${date}T00:00:00Z`);
        const wdayShort = dObj.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
        const wdayLong = dObj.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
        const dayNum = dObj.getUTCDate();
        const monthShort = dObj.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
        const isToday = date === todayIso();
        return (
        <div key={date} className={`card !p-3 ${isToday ? "ring-2 ring-brand-500" : ""}`}>
          <div className="mb-2 flex items-center gap-2.5">
            <div
              className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg leading-none ${
                isToday ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-500"
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide">{wdayShort}</span>
              <span className="text-lg font-extrabold tabular-nums">{dayNum}</span>
            </div>
            <div>
              <p className="font-semibold leading-tight text-stone-800">{wdayLong}</p>
              <p className="text-xs text-stone-500">
                {monthShort}
                {isToday && <span className="font-semibold text-brand-600"> · Today</span>}
              </p>
            </div>
          </div>
          {(byDate[date] || []).length === 0 ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-stone-400">—</p>
              <MealSelect
                meals={allMeals}
                placeholder="+ Add meal…"
                onPick={(mealId) => addMeal(date, mealId)}
              />
            </div>
          ) : (
            byDate[date].map((e) => {
              const meal = data.mealsById[e.mealId];
              const cooked = e.status === "Cooked";
              return (
                <div
                  key={e.id}
                  className={`border-b border-stone-100 py-1.5 last:border-0 ${
                    cooked ? "-mx-1.5 rounded-lg border-transparent bg-brand-50 px-1.5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`flex items-center gap-1.5 truncate font-medium ${cooked ? "text-stone-500" : ""}`}>
                        {cooked && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                            ✓
                          </span>
                        )}
                        <span className={cooked ? "line-through decoration-stone-400" : ""}>
                          {e.slot === "Baby" ? "👶 " : ""}
                          {meal?.name || e.name}
                        </span>
                      </p>
                      <p className="text-xs text-stone-500">
                        {e.slot === "Baby"
                          ? e.source === "Shared"
                            ? "shares the family dinner"
                            : "baby meal"
                          : `${e.portions} portions${
                              meal ? ` · ${meal.protein}g protein · ${meal.calories} kcal` : ""
                            }`}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {meal?.freezerFriendly && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                            🧊 Freezer-friendly
                          </span>
                        )}
                        {meal?.batchFriendly && e.slot !== "Baby" && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            🍲 Batch-friendly
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {cooked ? (
                        <span className="badge bg-brand-600 text-white">✓ Cooked</span>
                      ) : (
                        <span className={`badge ${sourceBadge[e.source] || ""}`}>{e.source}</span>
                      )}
                      {(e.source === "Fresh cook" || e.source === "Baby meal") &&
                        e.status === "Planned" &&
                        cookingId !== e.id && (
                          <button
                            className="btn-ghost !px-2 !py-1 text-xs"
                            onClick={() => startCooked(e)}
                          >
                            Cooked ✓
                          </button>
                        )}
                    </div>
                  </div>

                  {cookingId === e.id && (
                    <div className="mt-2 rounded-lg bg-brand-50 p-2.5">
                      <p className="text-xs font-medium text-stone-700">
                        🧊 Freeze extra portions from this batch?
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFreezeQty((q) => Math.max(0, q - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg leading-none hover:bg-stone-100"
                            aria-label="Fewer portions"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-semibold tabular-nums">
                            {freezeQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFreezeQty((q) => q + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg leading-none hover:bg-stone-100"
                            aria-label="More portions"
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="btn-primary !py-1.5 text-xs"
                          onClick={() => confirmCooked(e, freezeQty)}
                        >
                          {freezeQty > 0
                            ? `Mark cooked · freeze ${freezeQty}`
                            : "Mark cooked · freeze none"}
                        </button>
                        <button
                          className="text-xs text-stone-500 hover:text-stone-700"
                          onClick={() => setCookingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-stone-500">
                        Frozen portions get a 90-day use-by and show up in the
                        Freezer tab for future weeks.
                      </p>
                    </div>
                  )}

                  <div className="mt-1 flex items-center gap-2">
                    <MealSelect
                      meals={allMeals}
                      placeholder="Swap meal…"
                      onPick={(mealId) => swapMeal(e, mealId)}
                    />
                    <button
                      onClick={() => removeEntry(e)}
                      className="text-xs font-medium text-stone-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        );
      })}
    </div>
  );
}

function MealSelect({ meals, onPick, placeholder }) {
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
      }}
      className="max-w-[60%] rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-600"
    >
      <option value="">{placeholder}</option>
      {meals.map((m) => (
        <option key={m.id} value={m.id}>
          {m.babyFriendly ? "👶 " : ""}
          {m.name}
        </option>
      ))}
    </select>
  );
}
