// Extracts a recipe from a web page's HTML using schema.org structured data.
//
// Almost every recipe site embeds a JSON-LD <script type="application/ld+json">
// block with @type "Recipe". We parse that — it's far more reliable than
// scraping the visible HTML, which changes constantly between sites.

import { convertIngredientLine, convertTemperatures } from "./units.js";

export function parseRecipeFromHtml(html) {
  const nodes = collectJsonLd(html);
  const recipe = nodes.find((n) => hasType(n, "Recipe"));
  if (!recipe) return null;

  const ingredients = asArray(recipe.recipeIngredient || recipe.ingredients)
    .map(cleanText)
    .filter(Boolean)
    .map(convertIngredientLine); // imperial -> metric

  const steps = normalizeInstructions(recipe.recipeInstructions)
    .map(cleanText)
    .filter(Boolean)
    .map(convertTemperatures); // °F -> °C

  return {
    name: cleanText(recipe.name) || "",
    ingredients: ingredients.join("\n"),
    recipe: steps.join("\n"),
    calories: firstNumber(recipe?.nutrition?.calories),
    protein: firstNumber(recipe?.nutrition?.proteinContent),
    basePortions: parseYield(recipe.recipeYield),
    sourceName: cleanText(recipe?.author?.name || recipe?.author) || "",
  };
}

// ---- JSON-LD collection ----
function collectJsonLd(html) {
  const out = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let raw = m[1].trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      flatten(data, out);
    } catch {
      // Some sites emit invalid JSON (trailing commas, HTML entities). Skip.
    }
  }
  return out;
}

function flatten(data, out) {
  if (Array.isArray(data)) {
    data.forEach((d) => flatten(d, out));
  } else if (data && typeof data === "object") {
    out.push(data);
    if (Array.isArray(data["@graph"])) flatten(data["@graph"], out);
  }
}

function hasType(node, type) {
  const t = node && node["@type"];
  if (!t) return false;
  return Array.isArray(t) ? t.includes(type) : t === type;
}

// ---- instructions can take many shapes ----
function normalizeInstructions(ins) {
  if (!ins) return [];
  if (typeof ins === "string") {
    // one big HTML/text blob — split on line breaks or list markers
    return stripTags(ins)
      .split(/\r?\n|(?:\s*\d+\.\s)/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(ins)) ins = [ins];
  const steps = [];
  for (const item of ins) {
    if (typeof item === "string") {
      steps.push(item);
    } else if (item && typeof item === "object") {
      if (hasType(item, "HowToSection") && Array.isArray(item.itemListElement)) {
        for (const sub of item.itemListElement) {
          steps.push(typeof sub === "string" ? sub : sub.text || sub.name || "");
        }
      } else {
        steps.push(item.text || item.name || "");
      }
    }
  }
  return steps;
}

// ---- helpers ----
function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, " ");
}

function cleanText(s) {
  if (s == null) return "";
  if (typeof s === "object") s = s.name || s.text || "";
  return stripTags(s)
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1") // drop space left before punctuation by stripped tags
    .trim();
}

function firstNumber(v) {
  if (v == null) return null;
  const m = String(v).replace(",", ".").match(/[\d.]+/);
  return m ? Math.round(parseFloat(m[0])) : null;
}

function parseYield(v) {
  if (v == null) return null;
  if (Array.isArray(v)) v = v.find((x) => /\d/.test(String(x))) || v[0];
  const n = firstNumber(v);
  return n && n > 0 && n < 50 ? n : null; // ignore weird values
}
