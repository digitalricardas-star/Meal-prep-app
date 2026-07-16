// Migration: adds the "Recipe" field to an EXISTING Meals database and fills
// in method steps for the 12 starter meals (matched by name).
// Safe to re-run. Usage: npm run add-recipes
//
// Needs NOTION_TOKEN and NOTION_MEALS_DB in .env.local (both already there
// after your first `npm run setup`).

import { readFileSync, existsSync } from "node:fs";
import { recipes } from "./recipes.mjs";

// --- tiny .env.local loader (no dependency) ---
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

// 1. Add the Recipe property to the database (no-op if it already exists).
console.log("Adding the Recipe field to your Meals database…");
await notion(`/databases/${MEALS_DB}`, "PATCH", {
  properties: { Recipe: { rich_text: {} } },
});

// 2. Walk every meal and fill Recipe where we have one and it's still empty.
console.log("Filling in recipes for the starter meals…");
let cursor;
let filled = 0, skipped = 0;
do {
  const page = await notion(`/databases/${MEALS_DB}/query`, "POST", {
    page_size: 100,
    ...(cursor ? { start_cursor: cursor } : {}),
  });
  for (const row of page.results) {
    const name = (row.properties.Name?.title || []).map((t) => t.plain_text).join("");
    const current = (row.properties.Recipe?.rich_text || [])
      .map((t) => t.plain_text)
      .join("");
    const recipe = recipes[name];
    if (!recipe) { skipped++; continue; }         // your own custom meal — leave it
    if (current.trim()) { skipped++; continue; }  // already has a recipe — don't overwrite
    await notion(`/pages/${row.id}`, "PATCH", {
      properties: { Recipe: { rich_text: [{ text: { content: recipe } }] } },
    });
    console.log(`  ✓ ${name}`);
    filled++;
  }
  cursor = page.has_more ? page.next_cursor : undefined;
} while (cursor);

console.log(`\nDone. Added recipes to ${filled} meal(s), left ${skipped} untouched.`);
console.log("Restart the app (Ctrl+C then npm run dev) to see recipes.");
