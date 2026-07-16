"use client";
import { useEffect, useState } from "react";
import Recipe from "@/components/Recipe";
import { convertIngredientsToMetric, convertTemperatures } from "@/lib/units";
import { aggregateShoppingList } from "@/lib/ingredients";

const CATEGORIES = ["Chicken", "Fish", "Red meat", "Pork", "Vegetarian", "Soup", "Baby", "Other"];

const CAT_ICON = {
  Chicken: "🍗",
  Fish: "🐟",
  "Red meat": "🥩",
  Pork: "🥓",
  Vegetarian: "🥦",
  Soup: "🍲",
  Baby: "👶",
  Other: "🍽️",
};

const FEATURES = [
  { key: "freezerFriendly", label: "Freezer", icon: "🧊" },
  { key: "batchFriendly", label: "Batch", icon: "🍲" },
  { key: "babyFriendly", label: "Baby", icon: "👶" },
  { key: "active", label: "In rotation", icon: "🔄" },
];

export default function Meals() {
  const [meals, setMeals] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");
  const [feats, setFeats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [tdState, setTdState] = useState({}); // mealId -> "sending" | "done" | {error}
  const [tdOpenId, setTdOpenId] = useState(null);
  const [tdPortions, setTdPortions] = useState(2);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showPaused, setShowPaused] = useState(false);

  const toggleFeat = (k) => setFeats((f) => ({ ...f, [k]: !f[k] }));
  const clearFilters = () => {
    setCategory("All");
    setFeats({});
  };

  function openTodoist(meal) {
    setTdPortions(meal.basePortions || 2);
    setTdOpenId((id) => (id === meal.id ? null : meal.id));
  }

  async function addToTodoist(meal, portions) {
    const list = aggregateShoppingList([{ meal, plannedPortions: portions }]);
    if (list.length === 0) {
      setTdState((s) => ({ ...s, [meal.id]: { error: "No ingredients listed" } }));
      return;
    }
    setTdOpenId(null);
    setTdState((s) => ({ ...s, [meal.id]: "sending" }));
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setTdState((s) => ({ ...s, [meal.id]: "done" }));
      setTimeout(
        () =>
          setTdState((s) => {
            const n = { ...s };
            if (n[meal.id] === "done") delete n[meal.id];
            return n;
          }),
        4000
      );
    } catch (e) {
      setTdState((s) => ({ ...s, [meal.id]: { error: e.message } }));
    }
  }

  function load() {
    fetch("/api/meals")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setMeals(d.meals)))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function toggleActive(meal) {
    setMeals((ms) =>
      ms.map((m) => (m.id === meal.id ? { ...m, active: !m.active } : m))
    );
    await fetch("/api/meals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: meal.id, active: !meal.active }),
    });
  }

  async function setRating(meal, rating) {
    setMeals((ms) => ms.map((m) => (m.id === meal.id ? { ...m, rating } : m)));
    await fetch("/api/meals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: meal.id, rating }),
    });
  }

  async function performDelete(meal) {
    setConfirmDeleteId(null);
    const prev = meals;
    setMeals((ms) => ms.filter((m) => m.id !== meal.id));
    const res = await fetch("/api/meals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: meal.id }),
    });
    const d = await res.json().catch(() => ({}));
    if (d?.error) {
      setError(d.error);
      setMeals(prev); // put it back if the delete failed
    }
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!meals) return <p className="text-stone-500">Loading…</p>;

  const categories = ["All", ...new Set(meals.map((m) => m.category).filter(Boolean))];
  const activeFeats = FEATURES.filter((f) => feats[f.key]);
  const anyFilter = category !== "All" || activeFeats.length > 0;
  const shown = meals
    .filter((m) => category === "All" || m.category === category)
    .filter((m) => activeFeats.every((f) => m[f.key]))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const activeMeals = shown.filter((m) => m.active);
  const pausedMeals = shown.filter((m) => !m.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meals ({meals.length})</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "+ Add meal"}
        </button>
      </div>

      {showForm && (
        <MealForm
          onCancel={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {/* visual filters */}
      <div className="card space-y-3 !p-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Type
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`badge cursor-pointer border px-2.5 py-1 ${
                  category === c
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-stone-300 bg-white text-stone-500"
                }`}
              >
                {c === "All" ? "All" : `${CAT_ICON[c] || ""} ${c}`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Features
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FEATURES.map((f) => (
              <button
                key={f.key}
                onClick={() => toggleFeat(f.key)}
                className={`badge cursor-pointer border px-2.5 py-1 ${
                  feats[f.key]
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-stone-300 bg-white text-stone-500"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing {shown.length} of {meals.length}
          </span>
          {anyFilter && (
            <button
              onClick={clearFilters}
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-stone-500">No meals match these filters.</p>
      )}

      {activeMeals.map(renderMealRow)}

      {pausedMeals.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowPaused((s) => !s)}
            className="flex w-full items-center gap-2 pt-2 text-sm font-semibold text-stone-500 hover:text-stone-700"
          >
            <span className="text-xs">{showPaused ? "▾" : "▸"}</span>
            Paused · not in rotation ({pausedMeals.length})
            <span className="h-px flex-1 bg-stone-200" />
          </button>
          {showPaused && pausedMeals.map(renderMealRow)}
        </div>
      )}
    </div>
  );

  function renderMealRow(m) {
    return editId === m.id ? (
          <MealForm
            key={m.id}
            mealId={m.id}
            initial={m}
            onCancel={() => setEditId(null)}
            onDone={() => {
              setEditId(null);
              load();
            }}
          />
        ) : (
          <div key={m.id} className={`card !p-3 ${m.active ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-stone-500">
                  {m.category} · {m.protein}g protein · {m.calories} kcal ·{" "}
                  {m.batchFriendly ? "batch ✓" : "no batch"} ·{" "}
                  {m.freezerFriendly ? "freezer ✓" : "fresh only"}
                  {m.babyFriendly ? " · 👶 baby" : ""}
                  {m.lastCooked ? ` · last cooked ${m.lastCooked}` : " · never cooked"}
                </p>
                <Stars value={m.rating} onSet={(r) => setRating(m, r)} />
              </div>
              <button
                onClick={() => toggleActive(m)}
                className={`badge shrink-0 cursor-pointer border px-3 py-1 ${
                  m.active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-stone-300 text-stone-500"
                }`}
              >
                {m.active ? "In rotation" : "Paused"}
              </button>
            </div>
            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Recipe meal={m} />
              </div>
              <div className="flex shrink-0 items-center gap-3 pt-2">
                <TodoistButton
                  state={tdState[m.id]}
                  open={tdOpenId === m.id}
                  onClick={() => openTodoist(m)}
                />
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditId(m.id);
                  }}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDeleteId(m.id)}
                  className="text-xs font-medium text-stone-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>

            {confirmDeleteId === m.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                <p className="min-w-[160px] flex-1 text-xs text-red-800">
                  Delete “{m.name}”? It moves to your Notion trash — recoverable
                  there for 30 days.
                </p>
                <button
                  onClick={() => performDelete(m)}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs font-medium text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
              </div>
            )}

            {tdOpenId === m.id && (
              <div className="mt-2 rounded-lg bg-stone-50 p-2.5">
                <p className="text-xs font-medium text-stone-700">
                  🛒 How many portions to shop for?
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTdPortions((p) => Math.max(1, p - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg leading-none hover:bg-stone-100"
                      aria-label="Fewer portions"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold tabular-nums">
                      {tdPortions}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTdPortions((p) => p + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg leading-none hover:bg-stone-100"
                      aria-label="More portions"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="btn-primary !py-1.5 text-xs"
                    onClick={() => addToTodoist(m, tdPortions)}
                  >
                    Add {tdPortions} {tdPortions === 1 ? "portion" : "portions"} to Todoist
                  </button>
                  <button
                    className="text-xs text-stone-500 hover:text-stone-700"
                    onClick={() => setTdOpenId(null)}
                  >
                    Cancel
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500">
                  Base recipe makes {m.basePortions} — ingredient amounts scale to
                  your number.
                </p>
              </div>
            )}

            {tdState[m.id]?.error && (
              <p className="mt-1 text-xs text-red-600">{tdState[m.id].error}</p>
            )}
          </div>
        );
  }
}

function TodoistButton({ state, open, onClick }) {
  const sending = state === "sending";
  const done = state === "done";
  const base =
    "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-60 text-[#E44332] ring-1 ring-inset ring-[#E44332]";
  return (
    <button
      onClick={onClick}
      disabled={sending}
      className={done ? `${base} bg-[#E44332]/10` : `${base} bg-white hover:bg-[#E44332]/10`}
    >
      {done ? "✓ Added" : sending ? "Adding…" : open ? "🛒 Todoist ▴" : "🛒 Todoist"}
    </button>
  );
}

function MealForm({ mealId = null, initial = null, onDone, onCancel }) {
  const isEdit = !!mealId;
  const [f, setF] = useState(
    initial
      ? {
          name: initial.name || "",
          category: initial.category || "Chicken",
          basePortions: initial.basePortions ?? 4,
          protein: initial.protein ?? 30,
          calories: initial.calories ?? 600,
          fridgeLife: initial.fridgeLife ?? 3,
          rating: initial.rating ?? 3,
          batchFriendly: !!initial.batchFriendly,
          freezerFriendly: !!initial.freezerFriendly,
          babyFriendly: !!initial.babyFriendly,
          active: initial.active !== false,
          ingredients: initial.ingredients || "",
          recipe: initial.recipe || "",
          notes: initial.notes || "",
        }
      : {
          name: "",
          category: "Chicken",
          basePortions: 4,
          protein: 30,
          calories: 600,
          fridgeLife: 3,
          rating: 3,
          batchFriendly: true,
          freezerFriendly: true,
          babyFriendly: false,
          active: true,
          ingredients: "",
          recipe: "",
          notes: "",
        }
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState(null);
  const set = (k) => (e) =>
    setF((s) => ({
      ...s,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  async function extract() {
    if (!url.trim()) return;
    setExtracting(true);
    setExtractMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      const r = d.recipe;
      setF((s) => ({
        ...s,
        name: r.name || s.name,
        ingredients: r.ingredients || s.ingredients,
        recipe: r.recipe || s.recipe,
        calories: r.calories ?? s.calories,
        protein: r.protein ?? s.protein,
        basePortions: r.basePortions ?? s.basePortions,
        notes: r.sourceName ? `From ${r.sourceName} · ${url.trim()}` : s.notes,
      }));
      setExtractMsg("Recipe pulled in — check the fields and adjust before saving.");
    } catch (e) {
      setExtractMsg(null);
      setErr(e.message);
    } finally {
      setExtracting(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return setErr("Give the meal a name.");
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/meals", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: mealId, ...f } : f),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const label = "text-xs font-medium text-stone-500";
  const input =
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm";

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
        <label className={label}>Import from a recipe website</label>
        <div className="mt-1 flex gap-2">
          <input
            className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                extract();
              }
            }}
            placeholder="Paste a recipe URL…"
            type="url"
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={extract}
            disabled={extracting || !url.trim()}
          >
            {extracting ? "Reading…" : "Extract"}
          </button>
        </div>
        {extractMsg && <p className="mt-2 text-xs text-brand-700">{extractMsg}</p>}
        <p className="mt-1 text-xs text-stone-500">
          Pulls in the name, ingredients, method and nutrition where the site
          provides them. Then set the category and protein and save.
        </p>
      </div>

      <div>
        <label className={label}>Meal name</label>
        <input
          className={input}
          value={f.name}
          onChange={set("name")}
          placeholder="e.g. Teriyaki salmon bowl"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Category</label>
          <select className={input} value={f.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Base portions</label>
          <input type="number" min="1" className={input} value={f.basePortions} onChange={set("basePortions")} />
        </div>
        <div>
          <label className={label}>Protein / portion (g)</label>
          <input type="number" min="0" className={input} value={f.protein} onChange={set("protein")} />
        </div>
        <div>
          <label className={label}>Calories / portion</label>
          <input type="number" min="0" className={input} value={f.calories} onChange={set("calories")} />
        </div>
        <div>
          <label className={label}>Fridge life (days)</label>
          <input type="number" min="1" className={input} value={f.fridgeLife} onChange={set("fridgeLife")} />
        </div>
        <div>
          <label className={label}>Rating (1–5)</label>
          <input type="number" min="1" max="5" className={input} value={f.rating} onChange={set("rating")} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.batchFriendly} onChange={set("batchFriendly")} />
          Batch friendly
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.freezerFriendly} onChange={set("freezerFriendly")} />
          Freezer friendly
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.babyFriendly} onChange={set("babyFriendly")} />
          👶 Baby friendly
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.active} onChange={set("active")} />
          In rotation
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={label}>Ingredients (one per line, e.g. “600 g chicken thighs”)</label>
          <button
            type="button"
            className="text-xs font-medium text-brand-700 hover:text-brand-800"
            onClick={() =>
              setF((s) => ({
                ...s,
                ingredients: convertIngredientsToMetric(s.ingredients),
                recipe: convertTemperatures(s.recipe),
              }))
            }
          >
            ⇄ Convert imperial → metric
          </button>
        </div>
        <textarea className={`${input} h-24 resize-y`} value={f.ingredients} onChange={set("ingredients")} placeholder={"400 g salmon fillets\n300 g rice\n1 broccoli head"} />
      </div>
      <div>
        <label className={label}>Recipe / method (one step per line)</label>
        <textarea className={`${input} h-24 resize-y`} value={f.recipe} onChange={set("recipe")} placeholder={"Cook the rice.\nRoast the salmon 12 min.\nSteam the broccoli."} />
      </div>
      <div>
        <label className={label}>Notes (optional)</label>
        <input className={input} value={f.notes} onChange={set("notes")} placeholder="e.g. kids' favourite" />
      </div>

      {err && <p className="text-sm text-red-700">{err}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Save meal"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="text-xs text-stone-400">
        Quantities are for the base portions above — the planner scales them
        automatically when it cooks a bigger batch.
      </p>
    </form>
  );
}

function Stars({ value, onSet }) {
  return (
    <div className="mt-1 flex gap-0.5 text-lg leading-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={() => onSet(i)}
          className={i <= value ? "text-amber-400" : "text-stone-300"}
          aria-label={`Rate ${i}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
