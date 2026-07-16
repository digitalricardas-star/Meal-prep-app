"use client";
import { useEffect, useState } from "react";
import { todayIso, addDays } from "@/components/util";

const FOR_META = {
  Adult: { label: "Adult", icon: "🍽️", badge: "bg-amber-100 text-amber-800" },
  Baby: { label: "Baby", icon: "👶", badge: "bg-pink-100 text-pink-800" },
  Shared: { label: "Shared", icon: "🤝", badge: "bg-emerald-100 text-emerald-800" },
  Unlabelled: { label: "Unlabelled", icon: "❔", badge: "bg-stone-100 text-stone-600" },
};

function keyOf(item) {
  return item.forWhom && FOR_META[item.forWhom] ? item.forWhom : "Unlabelled";
}

export default function Freezer() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  function load() {
    fetch("/api/freezer")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setItems(d.items)))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function markUsed(item) {
    setItems((its) => its.filter((i) => i.id !== item.id));
    await fetch("/api/freezer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!items) return <p className="text-stone-500">Loading…</p>;

  const soon = addDays(todayIso(), 21);
  const total = items.reduce((s, i) => s + i.portions, 0);

  // portion totals per category
  const byCat = {};
  for (const it of items) {
    const k = keyOf(it);
    byCat[k] = (byCat[k] || 0) + it.portions;
  }
  const ORDER = ["Adult", "Baby", "Shared", "Unlabelled"];
  const presentCats = ORDER.filter((k) => byCat[k]);
  const shown = items.filter((it) => filter === "All" || keyOf(it) === filter);
  const groups = ORDER.map((cat) => ({
    cat,
    list: shown.filter((it) => keyOf(it) === cat),
  })).filter((g) => g.list.length);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Freezer · {total} portions</h1>

      {/* breakdown summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {["Adult", "Baby", "Shared"].map((k) => (
            <div key={k} className="card !p-3 text-center">
              <p className="text-lg leading-none">{FOR_META[k].icon}</p>
              <p className="mt-1 text-xl font-bold text-stone-800">{byCat[k] || 0}</p>
              <p className="text-[11px] text-stone-500">{FOR_META[k].label} portions</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-stone-500">
        Oldest use-by first — the planner schedules the top of this list. 👶 baby
        portions are baby-only, 🤝 shared works for the whole family, 🍽️ adult is
        grown-ups.
      </p>

      {/* filter chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {["All", ...presentCats].map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`badge cursor-pointer border px-3 py-1 ${
                filter === k
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-stone-300 bg-white text-stone-500"
              }`}
            >
              {k === "All" ? "All" : `${FOR_META[k].icon} ${FOR_META[k].label}`}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="card text-sm text-stone-600">
          Freezer is empty. Cook a batch-friendly meal and freeze the extra
          portions to build a buffer.
        </div>
      )}

      {groups.map(({ cat, list }) => {
        const meta = FOR_META[cat];
        const groupPortions = list.reduce((s, i) => s + i.portions, 0);
        return (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2 pt-1">
              <span className={`badge ${meta.badge}`}>
                {meta.icon} {meta.label}
              </span>
              <span className="text-xs text-stone-400">
                {groupPortions} portions · {list.length}{" "}
                {list.length === 1 ? "item" : "items"}
              </span>
              <div className="h-px flex-1 bg-stone-100" />
            </div>

            {list.map((item) => {
              const expiring = item.useBy && item.useBy <= soon;
              return (
                <div key={item.id} className="card !p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {item.portions} portions · frozen {item.frozenOn} ·{" "}
                        <span className={expiring ? "font-semibold text-amber-600" : ""}>
                          use by {item.useBy}
                        </span>
                      </p>
                    </div>
                    <button
                      className="btn-ghost shrink-0 text-xs"
                      onClick={() => markUsed(item)}
                    >
                      Used ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
