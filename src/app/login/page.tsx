"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "LOGIN_FAILED");
        return;
      }

      const data = (await res.json()) as { role: "ADMIN" | "STUDENT" };
      router.push(data.role === "ADMIN" ? "/admin" : "/student");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Holistic Exam System</h1>
            <div className="mt-1 text-sm text-zinc-700">Sign in to continue</div>
          </div>
        </div>

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="text-sm font-medium">Username</label>
          <input
            className="input"
            placeholder="e.g. admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <label className="mt-2 text-sm font-medium">Password</label>
          <input
            className="input"
            placeholder="Your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            className="btn-primary mt-2 h-11"
            disabled={loading}
            type="submit"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 text-xs text-zinc-500">
          Admin default: <span className="font-mono">admin</span> / <span className="font-mono">Admin@123</span>
        </div>
      </div>
    </div>
  );
}
