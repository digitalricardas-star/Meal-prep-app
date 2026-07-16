// Minimal Todoist API v1 client.
// (REST v2 was deprecated in 2025; the unified API lives under /api/v1 and
//  list endpoints are cursor-paginated: { results: [...], next_cursor }.)
const API = "https://api.todoist.com/api/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.TODOIST_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function todoist(path, method = "GET", body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Todoist ${method} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// GET a paginated list endpoint, following next_cursor to collect all rows.
async function todoistList(path) {
  const all = [];
  let cursor = null;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${path}${sep}limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const data = await todoist(url);
    // v1 returns { results, next_cursor }; be tolerant of a plain array too.
    const rows = Array.isArray(data) ? data : data.results || [];
    all.push(...rows);
    cursor = Array.isArray(data) ? null : data.next_cursor || null;
  } while (cursor);
  return all;
}

export async function getOrCreateProject(name) {
  const projects = await todoistList("/projects");
  const existing = projects.find(
    (pr) => pr.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) return existing;
  return todoist("/projects", "POST", { name });
}

export async function pushShoppingList(items, projectName) {
  const project = await getOrCreateProject(
    projectName || process.env.TODOIST_PROJECT || "Groceries"
  );
  const created = [];
  for (const item of items) {
    // sequential on purpose: Todoist rate limits burst requests
    const task = await todoist("/tasks", "POST", {
      project_id: String(project.id),
      content: item.label,
      description: item.meals ? `For: ${item.meals}` : undefined,
    });
    created.push(task.id);
  }
  return { project: project.name, count: created.length };
}
