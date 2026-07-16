"use client";
import { useCallback, useEffect, useState } from "react";
import { todayIso, mondayOf } from "@/components/util";
import WeekHeader from "@/components/WeekHeader";

export default function Shopping() {
  const [start, setStart] = useState(mondayOf(todayIso()));
  const [list, setList] = useState(null);
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [pushed, setPushed] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    // keep the current list visible while refetching — no blank/blink
    setPushed(null);
    fetch(`/api/shopping?start=${start}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setList(d.list)))
      .catch((e) => setError(e.message));
  }, [start]);

  useEffect(load, [load]);

  async function pushToTodoist() {
    setBusy(true);
    setError(null);
    try {
      const items = list.filter((_, i) => !checked[i]);
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, items }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setPushed(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Shopping list</h1>

      <WeekHeader start={start} onChange={setStart} />

      <p className="text-sm text-stone-500">
        Quantities aggregated from every fresh cook in the plan (freezer meals
        need no groceries). Tick anything you already have, then send the rest to
        Todoist.
      </p>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!list && !error && <p className="text-stone-500">Loading…</p>}

      {list && list.length === 0 && (
        <div className="card text-sm text-stone-600">
          Nothing to buy — generate a plan for this week first.
        </div>
      )}

      {list && list.length > 0 && (
        <>
          <div className="card divide-y divide-stone-100 !p-0">
            {list.map((item, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className={checked[i] ? "text-stone-400 line-through" : ""}>
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-2 text-xs text-stone-400">{item.meals}</span>
                </span>
              </label>
            ))}
          </div>
          {pushed ? (
            <div className="card border-brand-100 bg-brand-50 text-sm text-brand-700">
              ✓ Sent {pushed.count} items to Todoist project “{pushed.project}”.
            </div>
          ) : (
            <button className="btn-primary w-full" onClick={pushToTodoist} disabled={busy}>
              {busy
                ? "Sending…"
                : `Send ${list.filter((_, i) => !checked[i]).length} items to Todoist`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
