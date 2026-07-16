"use client";
import { addDays, mondayOf, todayIso, isoWeek, weekRange } from "@/components/util";

// Shared week banner: green + "Now" for the current week, grey for others,
// with a relative label and a jump-to-now shortcut. onChange(newStartIso).
export default function WeekHeader({ start, onChange }) {
  const currentMonday = mondayOf(todayIso());
  const isCurrent = start === currentMonday;
  const weekOffset = Math.round(
    (Date.parse(`${start}T00:00:00Z`) - Date.parse(`${currentMonday}T00:00:00Z`)) /
      604800000
  );
  const relLabel =
    weekOffset === 0
      ? "This week"
      : weekOffset === 1
      ? "Next week"
      : weekOffset === -1
      ? "Last week"
      : weekOffset > 0
      ? `In ${weekOffset} weeks`
      : `${-weekOffset} weeks ago`;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-4 text-white shadow-sm ${
        isCurrent
          ? "bg-gradient-to-r from-brand-600 to-brand-500 ring-2 ring-white/40"
          : "bg-gradient-to-r from-stone-500 to-stone-400"
      }`}
    >
      <button
        onClick={() => onChange(addDays(start, -7))}
        className="rounded-lg bg-white/15 px-2.5 py-1 text-lg leading-none hover:bg-white/25"
        aria-label="Previous week"
      >
        ←
      </button>

      <div className="flex flex-1 items-center gap-3">
        <div className="flex flex-col items-center justify-center rounded-lg bg-white/20 px-3 py-1.5 leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/75">
            Week
          </span>
          <span className="text-2xl font-extrabold tabular-nums">
            W{isoWeek(start)}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold leading-tight">{weekRange(start)}</p>
            {isCurrent && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                Now
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-white/80">
            {relLabel} · Mon–Sun ·{" "}
            {new Date(`${start}T00:00:00Z`).getUTCFullYear()}
            {!isCurrent && (
              <button
                onClick={() => onChange(currentMonday)}
                className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold hover:bg-white/40"
              >
                Jump to now
              </button>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={() => onChange(addDays(start, 7))}
        className="rounded-lg bg-white/15 px-2.5 py-1 text-lg leading-none hover:bg-white/25"
        aria-label="Next week"
      >
        →
      </button>
    </div>
  );
}
