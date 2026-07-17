"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const d = await res.json();
      if (d.error) {
        setErr("That password isn’t right.");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-xs space-y-3 text-center">
        <div className="text-3xl">🍲</div>
        <h1 className="text-lg font-semibold">Family Meal Prep</h1>
        <p className="text-sm text-stone-500">Enter the household password to continue.</p>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 pr-14 text-sm"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400 hover:text-stone-600"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !pw}>
          {busy ? "Checking…" : "Enter"}
        </button>
        <p className="text-[11px] text-stone-400">
          You’ll stay signed in on this device.
        </p>
      </form>
    </div>
  );
}
