// Migration: adds a "For" label (Adult / Baby / Shared) to an EXISTING Freezer
// database, and back-fills existing entries by looking at each linked meal's
// baby-friendliness (baby-friendly -> Shared, otherwise Adult).
// Safe to re-run. Usage: npm run add-freezer-labels
//
// Needs NOTION_TOKEN, NOTION_FREEZER_DB and NOTION_MEALS_DB in .env.local.

import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TOKEN = process.env.NOTION_TOKEN;
const FREEZER_DB = process.env.NOTION_FREEZER_DB;
if (!TOKEN || !FREEZER_DB) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_FREEZER_DB in .env.local. Run `npm run setup` first."
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

// 1. Add the "For" select property with its three options.
console.log("Adding the For label to your Freezer database…");
await notion(`/databases/${FREEZER_DB}`, "PATCH", {
  properties: {
    For: {
      select: {
        options: [{ name: "Adult" }, { name: "Baby" }, { name: "Shared" }],
      },
    },
  },
});

// 2. Back-fill any existing entries that don't have a label yet.
console.log("Labelling existing frozen portions…");
let cursor, labelled = 0, skipped = 0;
do {
  const page = await notion(`/databases/${FREEZER_DB}/query`, "POST", {
    page_size: 100,
    ...(cursor ? { start_cursor: cursor } : {}),
  });
  for (const row of page.results) {
    if (row.properties.For?.select) { skipped++; continue; } // already labelled
    // infer from the linked meal's baby-friendliness where possible
    let forWhom = "Adult";
    const mealRel = row.properties.Meal?.relation?.[0]?.id;
    if (mealRel) {
      try {
        const meal = await notion(`/pages/${mealRel}`);
        if (meal.properties["Baby friendly"]?.checkbox) forWhom = "Shared";
      } catch {
        /* meal deleted — leave as Adult */
      }
    }
    await notion(`/pages/${row.id}`, "PATCH", {
      properties: { For: { select: { name: forWhom } } },
    });
    labelled++;
  }
  cursor = page.has_more ? page.next_cursor : undefined;
} while (cursor);

console.log(`\nDone. Labelled ${labelled} entry(ies), left ${skipped} already-labelled.`);
console.log("Restart the app (Ctrl+C then npm run dev) to see the labels.");
