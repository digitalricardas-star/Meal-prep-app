// Minimal Notion API client (no SDK, pinned API version).
const NOTION_API = "https://api.notion.com/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

export async function notionFetch(path, method = "GET", body) {
  if (!process.env.NOTION_TOKEN) {
    throw new Error(
      "NOTION_TOKEN is not set in .env.local. Add your Notion integration secret, then restart the app."
    );
  }
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function queryDb(databaseId, filter, sorts) {
  if (!databaseId) {
    throw new Error(
      "A Notion database ID is missing from .env.local (NOTION_MEALS_DB / NOTION_PLAN_DB / NOTION_FREEZER_DB). Run `npm run setup`, then restart the app."
    );
  }
  const results = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${databaseId}/query`, "POST", body);
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

export function createPage(databaseId, properties) {
  return notionFetch("/pages", "POST", {
    parent: { database_id: databaseId },
    properties,
  });
}

export function updatePage(pageId, properties) {
  return notionFetch(`/pages/${pageId}`, "PATCH", { properties });
}

// ---------- property readers ----------
const p = {
  title: (page, name) =>
    (page.properties[name]?.title || []).map((t) => t.plain_text).join(""),
  text: (page, name) =>
    (page.properties[name]?.rich_text || []).map((t) => t.plain_text).join(""),
  number: (page, name) => page.properties[name]?.number ?? null,
  select: (page, name) => page.properties[name]?.select?.name ?? null,
  checkbox: (page, name) => page.properties[name]?.checkbox ?? false,
  date: (page, name) => page.properties[name]?.date?.start ?? null,
  relation: (page, name) =>
    (page.properties[name]?.relation || []).map((r) => r.id),
};

// ---------- domain mappers ----------
export function mealFromPage(page) {
  return {
    id: page.id,
    name: p.title(page, "Name"),
    category: p.select(page, "Category"),
    basePortions: p.number(page, "Base portions") || 2,
    protein: p.number(page, "Protein per portion") || 0,
    calories: p.number(page, "Calories per portion") || 0,
    batchFriendly: p.checkbox(page, "Batch friendly"),
    freezerFriendly: p.checkbox(page, "Freezer friendly"),
    babyFriendly: p.checkbox(page, "Baby friendly"),
    fridgeLife: p.number(page, "Fridge life days") || 2,
    rating: p.number(page, "Rating") || 3,
    active: p.checkbox(page, "Active in rotation"),
    lastCooked: p.date(page, "Last cooked"),
    timesCooked: p.number(page, "Times cooked") || 0,
    ingredients: p.text(page, "Ingredients"),
    recipe: p.text(page, "Recipe"),
    notes: p.text(page, "Notes"),
  };
}

export function planFromPage(page) {
  return {
    id: page.id,
    name: p.title(page, "Name"),
    date: p.date(page, "Date"),
    slot: p.select(page, "Slot") || "Dinner",
    mealId: p.relation(page, "Meal")[0] || null,
    source: p.select(page, "Source") || "Fresh cook",
    portions: p.number(page, "Portions") || 2,
    status: p.select(page, "Status") || "Planned",
  };
}

export function freezerFromPage(page) {
  return {
    id: page.id,
    name: p.title(page, "Name"),
    mealId: p.relation(page, "Meal")[0] || null,
    portions: p.number(page, "Portions") || 0,
    frozenOn: p.date(page, "Frozen on"),
    useBy: p.date(page, "Use by"),
    status: p.select(page, "Status") || "In freezer",
    forWhom: p.select(page, "For") || null,
  };
}

// ---------- domain fetchers ----------
export async function getMeals({ activeOnly = false } = {}) {
  const filter = activeOnly
    ? { property: "Active in rotation", checkbox: { equals: true } }
    : undefined;
  const pages = await queryDb(process.env.NOTION_MEALS_DB, filter);
  return pages.map(mealFromPage);
}

export async function getPlan(startDate, endDate) {
  const pages = await queryDb(process.env.NOTION_PLAN_DB, {
    and: [
      { property: "Date", date: { on_or_after: startDate } },
      { property: "Date", date: { on_or_before: endDate } },
    ],
  });
  return pages.map(planFromPage).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function getFreezer() {
  const pages = await queryDb(process.env.NOTION_FREEZER_DB, {
    property: "Status",
    select: { equals: "In freezer" },
  });
  return pages
    .map(freezerFromPage)
    .sort((a, b) => ((a.useBy || "9999") < (b.useBy || "9999") ? -1 : 1));
}

// ---------- writers ----------
// Notion caps each rich_text item at 2000 chars, but allows many items per
// field. Split long text on line boundaries into ≤2000-char chunks.
export function richText(str, max = 2000) {
  const s = str || "";
  if (!s) return [];
  const chunks = [];
  let cur = "";
  for (const line of s.split("\n")) {
    const piece = cur ? cur + "\n" + line : line;
    if (piece.length <= max) {
      cur = piece;
    } else {
      if (cur) chunks.push(cur);
      // a single line longer than max: hard-split it
      if (line.length <= max) {
        cur = line;
      } else {
        for (let i = 0; i < line.length; i += max) chunks.push(line.slice(i, i + max));
        cur = "";
      }
    }
  }
  if (cur) chunks.push(cur);
  return chunks.map((content) => ({ text: { content } }));
}

// Archive any Notion page (recoverable from Notion trash for 30 days).
export function archivePage(id) {
  return notionFetch(`/pages/${id}`, "PATCH", { archived: true });
}

// "Delete" a meal = archive its page.
export function archiveMeal(id) {
  return archivePage(id);
}

export function createMeal(m) {
  return createPage(process.env.NOTION_MEALS_DB, {
    Name: { title: [{ text: { content: m.name.trim().slice(0, 2000) } }] },
    ...(m.category ? { Category: { select: { name: m.category } } } : {}),
    "Base portions": { number: Number(m.basePortions) || 2 },
    "Protein per portion": { number: Number(m.protein) || 0 },
    "Calories per portion": { number: Number(m.calories) || 0 },
    "Batch friendly": { checkbox: !!m.batchFriendly },
    "Freezer friendly": { checkbox: !!m.freezerFriendly },
    "Baby friendly": { checkbox: !!m.babyFriendly },
    "Fridge life days": { number: Number(m.fridgeLife) || 2 },
    Rating: { number: Number(m.rating) || 3 },
    "Active in rotation": { checkbox: m.active !== false },
    "Times cooked": { number: 0 },
    Ingredients: { rich_text: richText(m.ingredients) },
    Recipe: { rich_text: richText(m.recipe) },
    Notes: { rich_text: richText(m.notes) },
  });
}

export function createPlanEntry({ name, date, slot, mealId, source, portions }) {
  return createPage(process.env.NOTION_PLAN_DB, {
    Name: { title: [{ text: { content: name } }] },
    Date: { date: { start: date } },
    Slot: { select: { name: slot } },
    ...(mealId ? { Meal: { relation: [{ id: mealId }] } } : {}),
    Source: { select: { name: source } },
    Portions: { number: portions },
    Status: { select: { name: "Planned" } },
  });
}

export function createFreezerEntry({ name, mealId, portions, frozenOn, useBy, forWhom }) {
  return createPage(process.env.NOTION_FREEZER_DB, {
    Name: { title: [{ text: { content: name } }] },
    ...(mealId ? { Meal: { relation: [{ id: mealId }] } } : {}),
    Portions: { number: portions },
    "Frozen on": { date: { start: frozenOn } },
    "Use by": { date: { start: useBy } },
    Status: { select: { name: "In freezer" } },
    ...(forWhom ? { For: { select: { name: forWhom } } } : {}),
  });
}
