export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Monday of the week containing `iso`
export function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDay(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday).
export function isoWeek(iso) {
  const target = new Date(`${iso}T00:00:00Z`);
  const dayNr = (target.getUTCDay() + 6) % 7; // Mon=0
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday of this week
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1); // Jan 1
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// "13–19 Jul" or "29 Jul – 4 Aug" for the Mon–Sun week starting at `start`.
export function weekRange(start) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${addDays(start, 6)}T00:00:00Z`);
  const mon = (d) => d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const sD = s.getUTCDate();
  const eD = e.getUTCDate();
  return mon(s) === mon(e)
    ? `${sD}–${eD} ${mon(e)}`
    : `${sD} ${mon(s)} – ${eD} ${mon(e)}`;
}

export const sourceBadge = {
  "Fresh cook": "bg-amber-100 text-amber-800",
  Leftover: "bg-sky-100 text-sky-800",
  Freezer: "bg-indigo-100 text-indigo-800",
  Shared: "bg-emerald-100 text-emerald-800",
  "Baby meal": "bg-pink-100 text-pink-800",
};
