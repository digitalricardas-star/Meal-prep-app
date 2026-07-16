import { getFreezer, updatePage } from "@/lib/notion";

export async function GET() {
  try {
    const items = await getFreezer();
    return Response.json({ items });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: mark a freezer entry as used
export async function PATCH(req) {
  try {
    const { id } = await req.json();
    await updatePage(id, { Status: { select: { name: "Used" } } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[API error]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
