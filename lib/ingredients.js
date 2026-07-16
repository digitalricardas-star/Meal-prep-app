// Ingredient parsing and shopping-list aggregation.
//
// Meals store ingredients as plain lines in Notion, one per line:
//   "600 g chicken thighs"
//   "2 tbsp soy sauce"
//   "1 broccoli head"
// Quantities are for the meal's "Base portions".

const UNITS = ["kg", "g", "l", "ml", "tbsp", "tsp", "pcs", "cup", "cups", "cloves", "clove", "can", "cans"];

export function parseIngredientLine(line) {
  const clean = line.trim();
  if (!clean) return null;
  const m = clean.match(/^([\d.,/]+)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (!m) return { qty: null, unit: null, name: clean };
  let qty = parseQty(m[1]);
  let unit = (m[2] || "").toLowerCase();
  let name = m[3].trim();
  if (unit && !UNITS.includes(unit)) {
    // "2 large onions" -> unit was actually part of the name
    name = `${unit} ${name}`.trim();
    unit = null;
  }
  // normalize to base units
  if (unit === "kg") { qty *= 1000; unit = "g"; }
  if (unit === "l") { qty *= 1000; unit = "ml"; }
  if (unit === "cups") unit = "cup";
  if (unit === "cloves") unit = "clove";
  if (unit === "cans") unit = "can";
  return { qty, unit: unit || null, name };
}

function parseQty(s) {
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : Number(a);
  }
  return Number(s.replace(",", "."));
}

export function parseIngredients(text) {
  return (text || "")
    .split("\n")
    .map(parseIngredientLine)
    .filter(Boolean);
}

// items: [{ meal, plannedPortions }] where meal has .ingredients and .basePortions
export function aggregateShoppingList(items) {
  const map = new Map();
  for (const { meal, plannedPortions } of items) {
    const scale = plannedPortions / (meal.basePortions || 2);
    for (const ing of parseIngredients(meal.ingredients)) {
      const key = `${ing.name.toLowerCase()}|${ing.unit || ""}`;
      const prev = map.get(key);
      if (prev) {
        if (prev.qty != null && ing.qty != null) prev.qty += ing.qty * scale;
        if (!prev.mealNames.includes(meal.name)) prev.mealNames.push(meal.name);
      } else {
        map.set(key, {
          name: ing.name,
          unit: ing.unit,
          qty: ing.qty != null ? ing.qty * scale : null,
          mealNames: [meal.name],
        });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((it) => ({
      ...it,
      label: formatItem(it),
      meals: it.mealNames.join(", "),
    }));
}

export function formatItem(it) {
  if (it.qty == null) return it.name;
  const qty = roundQty(it.qty);
  return it.unit ? `${qty} ${it.unit} ${it.name}` : `${qty} ${it.name}`;
}

function roundQty(q) {
  if (q >= 100) return Math.ceil(q / 50) * 50; // round grams/ml up to 50s
  if (q >= 10) return Math.ceil(q);
  return Math.round(q * 4) / 4; // quarters for small quantities
}
