// Migration: adds the "Baby friendly" checkbox to an EXISTING Meals database
// and bootstraps a sensible set of the starter meals as baby-friendly.
// Safe to re-run. Usage: npm run add-baby
//
// Needs NOTION_TOKEN and NOTION_MEALS_DB in .env.local.

import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TOKEN = process.env.NOTION_TOKEN;
const MEALS_DB = process.env.NOTION_MEALS_DB;
if (!TOKEN || !MEALS_DB) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_MEALS_DB in .env.local. Run `npm run setup` first."
  );
  process.exit(1);
}

async function notion(path, method, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

// Starter meals that are a good baby fit (no honey, low added salt/spice).
const BABY_SEED = new Set([
  "Baked salmon, potatoes & broccoli",
  "Beef bolognese + pasta",
  "Lentil & vegetable curry",
  "Chicken & vegetable soup",
]);

// 1. Add the checkbox property (no-op if it already exists) + a "Baby" category.
console.log("Adding the Baby friendly field to your Meals database…");
await notion(`/databases/${MEALS_DB}`, "PATCH", {
  properties: { "Baby friendly": { checkbox: {} } },
});

// 2. Tick the sensible starter meals (only where currently unticked).
console.log("Marking suitable starter meals as baby-friendly…");
let cursor, ticked = 0, skipped = 0;
do {
  const page = await notion(`/databases/${MEALS_DB}/query`, "POST", {
    page_size: 100,
    ...(cursor ? { start_cursor: cursor } : {}),
  });
  for (const row of page.results) {
    const name = (row.properties.Name?.title || []).map((t) => t.plain_text).join("");
    const already = row.properties["Baby friendly"]?.checkbox;
    if (!BABY_SEED.has(name) || already) { skipped++; continue; }
    await notion(`/pages/${row.id}`, "PATCH", {
      properties: { "Baby friendly": { checkbox: true } },
    });
    console.log(`  ✓ ${name}`);
    ticked++;
  }
  cursor = page.has_more ? page.next_cursor : undefined;
} while (cursor);

console.log(`\nDone. Marked ${ticked} meal(s) baby-friendly, left ${skipped} untouched.`);
console.log(
  "Tip: for baby-only meals (purées, finger foods), add them with category \"Baby\",\n" +
  "tick Baby friendly, and untick In rotation so they never show up as an adult dinner."
);
console.log("Restart the app (Ctrl+C then npm run dev), then regenerate the week.");
