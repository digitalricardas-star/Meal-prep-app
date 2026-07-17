import { cookies } from "next/headers";

export async function POST() {
  cookies().set("mp_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expire immediately
  });
  return Response.json({ ok: true });
}
