"use client";
import { useState } from "react";

// Collapsible recipe panel: ingredients + numbered method steps.
// Pass a meal object (needs .ingredients and .recipe strings).
export default function Recipe({ meal, open: openDefault = false }) {
  const [open, setOpen] = useState(openDefault);
  const steps = (meal.recipe || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const ingredients = (meal.ingredients || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const hasContent = steps.length > 0 || ingredients.length > 0;
  if (!hasContent) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        {open ? "Hide recipe ▲" : "View recipe ▾"}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg bg-stone-50 p-3">
          {ingredients.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Ingredients
              </p>
              <ul className="space-y-0.5 text-sm text-stone-700">
                {ingredients.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-500">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {steps.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Method
              </p>
              <ol className="space-y-1.5 text-sm text-stone-700">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {meal.notes && (
            <p className="text-xs italic text-stone-500">Note: {meal.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
