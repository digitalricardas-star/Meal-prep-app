"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { todayIso, mondayOf, fmtDay, sourceBadge } from "@/components/util";
import Recipe from "@/components/Recipe";

const PROTEIN_TARGET = 30; // g per adult per dinner (display default)
const CALORIE_TARGET = 750;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [freezer, setFreezer] = useState([]);
  const [error, setError] = useState(null);
  const start = mondayOf(todayIso());

  useEffect(() => {
    Promise.all([
      fetch(`/api/plan?start=${start}`).then((r) => r.json()),
      fetch(`/api/freezer`).then((r) => r.json()),
    ])
      .then(([plan, fz]) => {
        if (plan.error) throw new Error(plan.error);
        setData(plan);
        setFreezer(fz.items || []);
      })
      .catch((e) => setError(e.message));
  }, [start]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <p className="text-stone-500">Loading…</p>;

  const today = todayIso();
  const todayAll = data.plan.filter((e) => e.date === today);
  const todayEntries = todayAll.filter((e) => e.slot !== "Baby");
  const babyToday = todayAll.filter((e) => e.slot === "Baby");
  const upcoming = data.plan
    .filter((e) => e.date > today && e.slot !== "Baby")
    .slice(0, 6);
  const cooksLeft = data.plan.filter(
    (e) => e.source === "Fresh cook" && e.status === "Planned" && e.date >= today
  ).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Today · {fmtDay(today)}</h1>

      {todayEntries.length === 0 ? (
        <div className="card">
          <p className="text-stone-600">Nothing planned for today.</p>
          <Link href="/planner" className="btn-primary mt-3">
            Plan this week
          </Link>
        </div>
      ) : (
        todayEntries.map((e) => (
          <MealCard key={e.id} entry={e} meal={data.mealsById[e.mealId]} />
        ))
      )}

      {babyToday.map((e) => (
        <div key={e.id} className="card !p-3 border-pink-100 bg-pink-50/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">👶 Baby today</p>
              <p className="font-semibold">
                {data.mealsById[e.mealId]?.name || e.name}
              </p>
            </div>
            <span className={`badge ${sourceBadge[e.source] || ""}`}>
              {e.source === "Shared" ? "Shares dinner" : "Baby meal"}
            </span>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Cooks left this week" value={cooksLeft} />
        <Stat
          label="Freezer portions"
          value={freezer.reduce((s, f) => s + f.portions, 0)}
        />
        <Stat label="Planned days" value={new Set(data.plan.map((e) => e.date)).size} />
      </div>

      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Coming up</h2>
          <ul className="divide-y divide-stone-100">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="text-stone-500">{fmtDay(e.date)}</span>{" "}
                  {data.mealsById[e.mealId]?.name || e.name}
                </span>
                <span className={`badge ${sourceBadge[e.source] || ""}`}>{e.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MealCard({ entry, meal }) {
  const protein = meal?.protein || 0;
  const calories = meal?.calories || 0;
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{entry.slot}</p>
          <p className="text-lg font-semibold">{meal?.name || entry.name}</p>
        </div>
        <span className={`badge ${sourceBadge[entry.source] || ""}`}>{entry.source}</span>
      </div>
      {meal && (
        <>
          <div className="mt-3 flex gap-4 text-sm text-stone-600">
            <NutrientBar label="Protein" value={protein} target={PROTEIN_TARGET} unit="g" />
            <NutrientBar label="Calories" value={calories} target={CALORIE_TARGET} unit="kcal" />
          </div>
          <Recipe meal={meal} />
        </>
      )}
    </div>
  );
}

function NutrientBar({ label, value, target, unit }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const ok = value >= target * 0.9;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className={ok ? "text-brand-600 font-medium" : "text-stone-500"}>
          {value} / {target} {unit}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-stone-100">
        <div
          className={`h-1.5 rounded ${ok ? "bg-brand-500" : "bg-amber-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card !p-3">
      <p className="text-2xl font-semibold text-brand-700">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="card border-red-200 bg-red-50 text-sm text-red-800">
      <p className="font-semibold">Something needs attention</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-red-600">
        Check your .env.local values (Notion token + database IDs) and that the
        setup script has been run.
      </p>
    </div>
  );
}
