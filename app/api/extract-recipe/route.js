import { parseRecipeFromHtml } from "@/lib/recipe-extract";

// POST { url } -> { recipe: { name, ingredients, recipe, calories, protein, basePortions } }
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || !/^https?:\/\//i.test(url)) {
      return Response.json(
        { error: "Enter a full URL starting with http:// or https://" },
        { status: 400 }
      );
    }

    let res;
    try {
      res = await fetch(url, {
        headers: {
          // Some recipe sites reject the default fetch agent.
          "User-Agent":
            "Mozilla/5.0 (compatible; FamilyMealPrep/1.0; +https://localhost)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
    } catch (e) {
      return Response.json(
        { error: `Couldn't reach that page (${e.message}).` },
        { status: 400 }
      );
    }

    if (!res.ok) {
      return Response.json(
        {
          error: `That page returned an error (${res.status}). Some sites block automated reading — try a different recipe site.`,
        },
        { status: 400 }
      );
    }

    const html = await res.text();
    const recipe = parseRecipeFromHtml(html);

    if (!recipe || (!recipe.ingredients && !recipe.recipe)) {
      return Response.json(
        {
          error:
            "No structured recipe found on that page. You can still fill the form in by hand.",
        },
        { status: 422 }
      );
    }

    return Response.json({ recipe });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
