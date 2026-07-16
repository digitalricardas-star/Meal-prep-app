# Family Meal Prep

A web + mobile dashboard for family meal planning: batch cooking, freezer
meals, favourite-meal rotation, nutrition tracking, and automatic Todoist
shopping lists — with Notion as the backend database.

## How it works

- **Notion is the source of truth.** Three databases (created for you by the
  setup script): 🍲 Meals, 📅 Meal Plan, 🧊 Freezer. Add/edit recipes in
  Notion; the app reads and writes them via the API.
- **One tap plans the week.** Pick your cook days (default Sun/Wed/Fri). The
  planner picks meals by rating + time-since-last-cooked, enforces variety
  (max 2 per category, nudges fish in), batches each cook to cover the days
  until the next cook, and schedules one freezer meal from inventory
  (oldest use-by first).
- **Batch → freezer loop.** When you mark a batch cook "Cooked", the app asks
  how many portions went to the freezer and logs them with a use-by date.
  Next week's plan pulls them back out automatically.
- **Shopping list → Todoist.** Ingredients from every fresh cook are scaled
  to planned portions, aggregated (600 g + 400 g chicken = 1000 g), rounded
  to sensible pack sizes, and pushed to your Todoist "Groceries" project.
  Freezer meals need no groceries — that's how food waste drops.
- **Nutrition at a glance.** Each meal stores protein + calories per portion;
  the dashboard shows daily totals vs your targets.

## Setup (one time, ~15 minutes)

### 1. Get the code running
You need Node.js 18+ (https://nodejs.org). Then in this folder:

```bash
npm install
cp .env.example .env.local
```

### 2. Connect Notion
1. Go to https://www.notion.so/my-integrations → **New integration**
   (internal). Copy the secret into `.env.local` as `NOTION_TOKEN`.
2. In Notion, create an empty page called e.g. **Meal Prep HQ**.
3. On that page: `···` menu → **Connections** → add your integration.
4. Copy the page ID from its URL (the 32-character code at the end) into
   `.env.local` as `NOTION_PARENT_PAGE_ID`.
5. Run the setup script — it creates all 3 databases and 12 starter meals
   (including the four chicken marinades), and saves the database IDs:

```bash
npm run setup
```

### 3. Connect Todoist
Todoist → Settings → Integrations → Developer → copy the **API token** into
`.env.local` as `TODOIST_TOKEN`.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000 — generate your first week in the Planner tab.

## Deploy to the web (free) + phone home screen

1. Create a free account at https://vercel.com and a free GitHub account.
2. Put this folder in a **private** GitHub repository (GitHub Desktop is the
   easiest way — no command line needed).
3. In Vercel: **Add New → Project** → import the repo.
4. In the project settings, add every variable from your `.env.local`
   under **Environment Variables**, then deploy.
5. Open your Vercel URL on your phone → browser menu → **Add to Home
   Screen**. It installs as an app (icon, full screen, no browser bar).

## Weekly routine (the 10-minute version)

1. **Saturday:** open Planner → Generate week → glance, adjust cook days if
   plans changed.
2. Open Shopping → tick what you already have → **Send to Todoist** → shop
   with Todoist at the store.
3. **Cook days:** cook the batch, tap **Cooked ✓**, enter portions frozen.
4. Rate meals in the Meals tab as you eat — ratings shape future rotations.

## Customising

- **Meals:** add recipes in Notion. Ingredients go one per line, e.g.
  `600 g chicken thighs` — quantities are for the "Base portions" number.
  The **Recipe** field holds the cooking method, one step per line — it shows
  under a "View recipe" toggle on the Today and Meals screens. Tick "Batch
  friendly" / "Freezer friendly" and set "Fridge life days".
- **Existing database?** Run `npm run add-recipes` once to add the Recipe
  field and fill in the starter recipes (safe to re-run, never overwrites).
- **Household size:** `ADULT_PORTIONS` in `.env.local`.
- **Variety rules:** category cap and fish target live in
  `lib/rotation.js` (`categoryCap`, `fishTarget`).
- **Nutrition targets:** `PROTEIN_TARGET` / `CALORIE_TARGET` display targets
  in `app/page.js`.

## Project structure

```
app/            pages (dashboard, planner, meals, shopping, freezer)
app/api/        server routes that talk to Notion + Todoist
lib/notion.js   Notion API client + database mappers
lib/rotation.js weekly plan generator (batch/freezer/variety logic)
lib/ingredients.js  ingredient parser + shopping aggregation
lib/todoist.js  Todoist client
scripts/setup-notion.mjs  one-time database creation + seed meals
```
