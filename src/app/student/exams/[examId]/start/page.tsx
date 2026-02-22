"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function ExamStartPage() {
  const router = useRouter();
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [examPassword, setExamPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/student/exams/enter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examId, examPassword }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED");
        return;
      }

      router.push(`/student/exams/${examId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Enter Exam Password</h1>
            <div className="mt-1 text-sm text-zinc-700">Ask your admin for the password.</div>
          </div>
          <Link className="link" href="/student/exams">
            Back
          </Link>
        </div>

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Exam password"
            value={examPassword}
            onChange={(e) => setExamPassword(e.target.value)}
            type="password"
          />

          {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <button className="btn-primary mt-2 h-11" disabled={loading} type="submit">
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
