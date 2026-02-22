"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ExamRow = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  isActive: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "LOCKED";
};

export default function StudentExamsPage() {
  const [year, setYear] = useState<number | null>(null);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/student/exams");
        if (!res.ok) {
          setError("FAILED_TO_LOAD");
          return;
        }
        const data = (await res.json()) as { year: number | null; exams: ExamRow[] };
        setYear(data.year);
        setExams(data.exams);
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
          <h1 className="text-2xl font-semibold">My Exams</h1>
          <div className="mt-1 text-sm text-zinc-700">{year ? `Academic year: ${year}` : "No exams available"}</div>
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
        ) : exams.length === 0 ? (
          <div className="text-sm text-zinc-700">No active assigned exams.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-2">Exam</th>
                  <th className="py-2">Duration</th>
                  <th className="py-2">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.id} className="border-t">
                    <td className="py-2">{ex.title}</td>
                    <td className="py-2 font-mono">{ex.durationMinutes}m</td>
                    <td className="py-2">{ex.status}</td>
                    <td className="py-2 text-right">
                      {ex.status === "SUBMITTED" ? (
                        <span className="text-zinc-500">Completed</span>
                      ) : ex.status === "LOCKED" ? (
                        <span className="text-red-700">Locked</span>
                      ) : (
                        <Link className="btn-primary px-3 py-2 text-xs" href={`/student/exams/${ex.id}/start`}>
                          {ex.status === "IN_PROGRESS" ? "Resume" : "Start"}
                        </Link>
                      )}
                    </td>
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
