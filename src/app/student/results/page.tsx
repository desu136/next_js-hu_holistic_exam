"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  score: number;
  maxScore: number;
  updatedAt: string;
  attempt: {
    exam: { id: string; title: string; academicYear: number };
  };
};

export default function StudentResultsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student/results");
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? "FAILED_TO_LOAD");
          return;
        }
        const data = (await res.json()) as { results: Row[] };
        setRows(data.results);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Results</h1>
          <div className="mt-1 text-sm text-zinc-700">Visible only when results are published.</div>
        </div>
        <Link className="link" href="/student">
          Back
        </Link>
      </div>

      <div className="card mt-6 p-5">
        {loading ? (
          <div className="text-sm text-zinc-700">Loading...</div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-zinc-700">No published results yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-2">Exam</th>
                  <th className="py-2 sm:hidden">Year / Score</th>
                  <th className="hidden py-2 sm:table-cell">Year</th>
                  <th className="hidden py-2 sm:table-cell">Score</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.attempt.exam.id} className="border-t">
                    <td className="py-2">{r.attempt.exam.title}</td>
                    <td className="py-2 sm:hidden">
                      <div className="grid gap-1">
                        <div className="font-mono">{r.attempt.exam.academicYear}</div>
                        <div className="font-mono">
                          {r.score} / {r.maxScore}
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-2 font-mono sm:table-cell">{r.attempt.exam.academicYear}</td>
                    <td className="hidden py-2 font-mono sm:table-cell">
                      {r.score} / {r.maxScore}
                    </td>
                    <td className="py-2 text-zinc-600">{new Date(r.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
