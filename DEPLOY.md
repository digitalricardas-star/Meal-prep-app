# Deploy to Vercel (put the app online + on your phone)

This puts the app on a real URL you can open anywhere — including installing it
on your phone's home screen. Your local `npm run dev` setup keeps working too;
this is just a hosted copy.

You do **not** re-run setup or migrations — your Notion databases already exist.
Vercel only needs your keys to talk to the same Notion and Todoist.

---

## 1. Make two free accounts

- **GitHub** — https://github.com (stores the code)
- **Vercel** — https://vercel.com → "Sign up" → **Continue with GitHub**
  (linking them now saves a step later)

## 2. Put the folder on GitHub (no command line)

Easiest with **GitHub Desktop**:

1. Download https://desktop.github.com and sign in.
2. **File → Add Local Repository** → choose your
   `Documents/Claude/Projects/Meal prep app` folder.
3. It'll say "this isn't a Git repository" → click **Create a repository** →
   **Create Repository**.
4. Click **Publish repository**. **Keep "Keep this code private" ticked.**

Your secrets never get uploaded — the `.gitignore` already excludes
`.env.local`, so your tokens stay only on your computer and in Vercel.

## 3. Import into Vercel

1. Go to https://vercel.com → **Add New… → Project**.
2. Find your **meal-prep-app** repo → **Import**.
3. Framework Preset auto-detects **Next.js** — leave all build settings as-is.
4. **Don't deploy yet** — first add the environment variables (next step).

## 4. Add your keys (Environment Variables)

Open your `.env.local` file (in the project folder). In Vercel's
**Environment Variables** section, add each line from it as a Name / Value pair.
At minimum you need:

| Name | Where it comes from |
|---|---|
| `NOTION_TOKEN` | your `.env.local` |
| `NOTION_MEALS_DB` | your `.env.local` |
| `NOTION_PLAN_DB` | your `.env.local` |
| `NOTION_FREEZER_DB` | your `.env.local` |
| `TODOIST_TOKEN` | your `.env.local` |
| `TODOIST_PROJECT` | your `.env.local` (e.g. `V_R Pirkiniai 🛒🎈`) |
| `ADULT_PORTIONS` | your `.env.local` (e.g. `2`) |

Tip: just copy every non-blank line from `.env.local`. Paste the part before
`=` as the Name and the part after as the Value.

## 5. Deploy

Click **Deploy**. After ~1 minute you get a URL like
`meal-prep-app-xxxx.vercel.app`. Open it — same app, now online.

## 6. Put it on your phone

Open your Vercel URL on your phone's browser → share/menu → **Add to Home
Screen**. It installs like an app (icon, full screen, no browser bar).

---

## Updating it later

Whenever you (or I) change the code in the folder:
1. Open GitHub Desktop → it shows the changed files.
2. Type a short summary → **Commit to main** → **Push origin**.
3. Vercel automatically rebuilds and redeploys within a minute.

## Important: the URL is public

The free Vercel URL has no password, and the app can read/write your Notion and
Todoist. Anyone who has the link could use it. So:

- Treat the URL like a private password — don't share or post it.
- Vercel's guessable-but-random URL is reasonable for personal use, but if you
  want real protection, Vercel offers password protection (paid), or I can add a
  simple shared-password gate to the app. Ask if you want that.

## If the build fails on Vercel

- Almost always a missing environment variable. Check every key from step 4 is
  present, then **Redeploy** from the Vercel dashboard.
- Paste me the red error text from Vercel's build log and I'll pinpoint it.
