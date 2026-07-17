import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { password } = await req.json();
    const pw = process.env.APP_PASSWORD;
    if (!pw) return Response.json({ ok: true }); // gate disabled

    if (password !== pw) {
      return Response.json({ error: "Wrong password" }, { status: 401 });
    }

    cookies().set("mp_auth", pw, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // remember for a year
      secure: req.url.startsWith("https"),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
