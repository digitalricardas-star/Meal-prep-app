// Imperial -> metric conversion for recipe ingredients and oven temperatures.
//
// Recipe sites (especially US ones) use cups / ounces / pounds / °F. This
// normalises them to g / ml / °C so quantities aggregate cleanly in the
// shopping list. Volumes use US customary measures (1 cup = 240 ml, 1 pint =
// 473 ml), which is what almost all recipe data uses.

const UNICODE_FRACTIONS = {
  "¼": 0.25, "½": 0.5, "¾": 0.75,
  "⅐": 1 / 7, "⅑": 1 / 9, "⅒": 0.1,
  "⅓": 1 / 3, "⅔": 2 / 3,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// grams per unit
const WEIGHT = {
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
};
// millilitres per unit
const VOLUME = {
  cup: 240, cups: 240,
  pint: 473, pints: 473, pt: 473,
  quart: 946, quarts: 946, qt: 946,
  gallon: 3785, gallons: 3785, gal: 3785,
  floz: 30,
};

export function parseLeadingQuantity(str) {
  const s = str.trim();
  // integer + unicode fraction, e.g. "1½" or bare "½"
  let m = s.match(/^(\d+)?\s*([¼-¾⅐-⅞])\s*(.*)$/);
  if (m) {
    const whole = m[1] ? parseInt(m[1], 10) : 0;
    return { qty: whole + (UNICODE_FRACTIONS[m[2]] || 0), rest: m[3] };
  }
  // mixed number "1 1/2"
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (m) return { qty: +m[1] + +m[2] / +m[3], rest: m[4] };
  // simple fraction "1/2"
  m = s.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (m) return { qty: +m[1] / +m[2], rest: m[3] };
  // decimal or integer "1.5", "1,5", "2"
  m = s.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (m) return { qty: parseFloat(m[1].replace(",", ".")), rest: m[2] };
  return null;
}

function roundGrams(v) {
  if (v < 250) return Math.round(v / 5) * 5;
  return Math.round(v / 25) * 25;
}
function roundMl(v) {
  if (v < 250) return Math.round(v / 5) * 5;
  return Math.round(v / 10) * 10;
}

// Convert a single ingredient line. Returns the line unchanged if it has no
// imperial unit (metric units, "3 cloves garlic", "2 tbsp soy sauce", etc.).
export function convertIngredientLine(line) {
  const parsed = parseLeadingQuantity(line);
  if (!parsed) return line;

  // normalise "fl oz" / "fluid ounce(s)" to a single token first
  const rest = parsed.rest.replace(/\bfl\.?\s*oz\b|\bfluid\s+ounces?\b/i, "floz");

  const m = rest.match(/^([a-zA-Z]+)\.?\s+(.*)$/);
  if (!m) return line;
  const unit = m[1].toLowerCase();
  const name = m[2].trim();

  if (WEIGHT[unit]) {
    return `${roundGrams(parsed.qty * WEIGHT[unit])} g ${name}`.trim();
  }
  if (VOLUME[unit]) {
    return `${roundMl(parsed.qty * VOLUME[unit])} ml ${name}`.trim();
  }
  return line; // tbsp/tsp and metric units pass through untouched
}

// Multi-line ingredient text.
export function convertIngredientsToMetric(text) {
  return (text || "")
    .split("\n")
    .map((l) => (l.trim() ? convertIngredientLine(l) : l))
    .join("\n");
}

// Oven temperatures in method text: 350°F / 400 degrees F -> °C (nearest 5).
export function convertTemperatures(text) {
  return (text || "").replace(
    /(\d{2,3})\s*(?:°\s*)?(?:degrees?\s*)?F(?:ahrenheit)?\b/gi,
    (_match, f) => {
      const c = Math.round(((parseFloat(f) - 32) * 5) / 9 / 5) * 5;
      return `${c}°C`;
    }
  );
}

// Convenience: convert both an ingredient block and a method block.
export function toMetric({ ingredients, recipe }) {
  return {
    ingredients: convertIngredientsToMetric(ingredients),
    recipe: convertTemperatures(recipe || ""),
  };
}
