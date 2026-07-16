# Install guide — Family Meal Prep (Mac)

Everything is already in this folder:
`~/Documents/Claude/Projects/Meal prep app`

No unzipping needed. Budget ~15 minutes — the fiddly part is getting two
tokens, not the code.

---

## 1. Install Node.js (one time only)

1. Go to https://nodejs.org
2. Download the big green **LTS** button.
3. Open the downloaded `.pkg` file and click through the installer.

Check it worked — open **Terminal** (press `Cmd + Space`, type `Terminal`,
hit Enter) and run:

```bash
node -v
```

If it prints something like `v20.11.0`, you're set.

---

## 2. Point Terminal at this folder

In Terminal, type `cd ` (the letters c, d, then a space), then **drag the
"Meal prep app" folder from Finder into the Terminal window** and press Enter.
It will look like this:

```bash
cd ~/Documents/Claude/Projects/Meal\ prep\ app
```

Tip: to confirm you're in the right place, run `ls` — you should see
`package.json`, `README.md`, `app`, `lib`, etc.

---

## 3. Install the code's libraries

```bash
npm install
```

Takes a minute or two. Some yellow warnings are normal — only red `ERR!`
lines matter.

---

## 4. Create your settings file

```bash
cp .env.example .env.local
```

Open it in TextEdit and leave it open — you'll paste two tokens in shortly:

```bash
open -e .env.local
```

---

## 5. Connect Notion

1. Go to https://www.notion.so/my-integrations → **New integration** → name
   it (e.g. "Meal Prep") → **Save**.
2. Copy the **Internal Integration Secret** (starts with `ntn_` or
   `secret_`). Paste it after `NOTION_TOKEN=` in `.env.local`.
3. In Notion, create a new empty page — call it **Meal Prep HQ**.
4. On that page, click **`•••`** (top-right) → **Connections** →
   **Connect to** → choose your integration.
5. Copy the page's ID from its URL. It's the 32-character block after the
   last `/` and before any `?`. Paste it after `NOTION_PARENT_PAGE_ID=`.

Save the file (`Cmd + S`), then in Terminal run:

```bash
npm run setup
```

This creates your 3 Notion databases + 12 starter meals and auto-fills the
database IDs into `.env.local`. Success looks like a list of ✓ meal names.

---

## 6. Connect Todoist

In Todoist: **Settings → Integrations → Developer** → copy the **API token**.
Paste it after `TODOIST_TOKEN=` in `.env.local`. Save.

---

## 7. Run it

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. Go to the **Planner** tab and
hit **Generate week**.

- **Stop it:** click the Terminal window and press `Ctrl + C`.
- **Start it again another day:** repeat step 2 (cd into the folder), then
  `npm run dev`. You never repeat steps 1, 3–6.

---

## Adding recipes (if you already ran setup)

The app now stores a full **Recipe** (method steps) for each meal, shown under
a "View recipe" toggle on the Today and Meals screens. If your Notion database
was created before this feature, run this once to add the field and fill in
the 12 starter recipes:

```bash
npm run add-recipes
```

Then restart (`Ctrl + C`, then `npm run dev`). It won't overwrite any recipe
you've already written, and it leaves your own custom meals untouched. To
write a recipe for a new meal, just type the steps (one per line) into the
**Recipe** field of that meal in Notion.

## Baby meals (if you already ran setup)

Meals now have a **👶 Baby friendly** flag, and the planner builds a baby track
alongside the adult one: the baby shares the family dinner when it's
baby-friendly, and on other days the planner picks a separate baby meal,
rotating the ingredient/category so the baby gets variety. Run once to add the
field and tick sensible starter meals:

```bash
npm run add-baby
```

Then restart and regenerate the week. For baby-only meals (purées, finger
foods), add them with category **Baby**, tick **Baby friendly**, and untick
**In rotation** so they never appear as an adult dinner.

Two safety notes when marking meals baby-friendly: no honey under 12 months,
and go easy on added salt.

## Good to know

- `localhost` only works while Terminal is running, and only on this Mac.
  To use it from your phone anytime, see the **Deploy to Vercel** section in
  `README.md`.
- Your secrets live in `.env.local` and never leave your computer.

## If something breaks

| Symptom | Most likely fix |
|---|---|
| `command not found: npm` | Node.js didn't install — redo step 1, restart Terminal. |
| `npm run setup` errors on Notion | Step 5.4 skipped (integration not connected to the page), or a mistyped page ID. |
| Page loads but says "Something needs attention" | A token or database ID in `.env.local` is wrong. Re-check steps 5–6. |
| Todoist push fails | Wrong `TODOIST_TOKEN`, or you copied the "test" token instead of the API token. |

Paste any red error text to me and I'll pinpoint it.
