"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ResultRow = {
  score: number;
  maxScore: number;
  updatedAt: string;
  attempt: {
    id: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "LOCKED";
    _count?: {
      answers: number;
    };
    student: {
      username: string;
      firstName: string | null;
      lastName: string | null;
      studentId: string | null;
    };
  };
};

type LockedAttemptRow = {
  id: string;
  lockedAt: string | null;
  lockedReason: string | null;
  _count?: { answers: number };
  student: {
    username: string;
    firstName: string | null;
    lastName: string | null;
    studentId: string | null;
  };
};

type ExamInfo = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  resultsPublished: boolean;
  isActive: boolean;
  _count: { assignments: number; attempts: number; questions: number };
};

export default function AdminExamResultsPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [lockedAttempts, setLockedAttempts] = useState<LockedAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/results/summary`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        if (!data) {
          setError(`FAILED_TO_LOAD (HTTP_${res.status})`);
          return;
        }
        setError(data.message ? `${data.error ?? "FAILED_TO_LOAD"}: ${data.message}` : (data.error ?? "FAILED_TO_LOAD"));
        return;
      }
      const data = (await res.json()) as { exam: ExamInfo; results: ResultRow[] };
      setExam(data.exam);
      setResults(data.results);
      setLockedAttempts((data as unknown as { lockedAttempts?: LockedAttemptRow[] }).lockedAttempts ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function resetAttempt(attemptId: string) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/attempts/${attemptId}/reset`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED");
        return;
      }
      setMessage("Reset");
      await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function action(path: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED");
        return;
      }
      setMessage("Done");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-zinc-700">Loading...</div>
    );
  }

  if (!exam) {
    return (
      <div className="card p-6">
        <div className="text-sm text-red-700">{error ?? "FAILED"}</div>
        <div className="mt-4">
          <Link className="link" href="/admin/exams">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-zinc-700">{exam.academicYear}</div>
          <h1 className="text-2xl font-semibold">Results: {exam.title}</h1>
          <div className="mt-1 text-sm text-zinc-700">
            Published: <span className="font-mono">{exam.resultsPublished ? "YES" : "NO"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link className="link" href="/admin/exams">
            Back
          </Link>
          <Link className="link" href={`/admin/exams/${examId}/sessions`}>
            Active sessions
          </Link>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-zinc-700">
            Questions: <span className="font-mono">{exam._count.questions}</span> | Assigned:{" "}
            <span className="font-mono">{exam._count.assignments}</span> | Attempts:{" "}
            <span className="font-mono">{exam._count.attempts}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-ghost px-3 py-2" href={`/api/admin/exams/${examId}/results/export`}>
              Download CSV
            </a>
            <button
              className="btn-ghost px-3 py-2"
              disabled={busy}
              onClick={() => void action(`/api/admin/exams/${examId}/results/generate`)}
              type="button"
            >
              Generate / Regenerate
            </button>
            <button
              className="btn-primary px-3 py-2"
              disabled={busy}
              onClick={() => void action(`/api/admin/exams/${examId}/results/publish`)}
              type="button"
            >
              Publish
            </button>
            <button
              className="btn-ghost px-3 py-2"
              disabled={busy}
              onClick={() => void action(`/api/admin/exams/${examId}/results/hide`)}
              type="button"
            >
              Hide
            </button>
            <button className="btn-ghost px-3 py-2" onClick={() => void load()} type="button">
              Refresh
            </button>
          </div>
        </div>

        {error ? <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? (
          <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
        ) : null}

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="py-2">Student</th>
                <th className="py-2">Student ID</th>
                <th className="py-2">Score</th>
                <th className="py-2">Updated</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.attempt.id} className="border-t">
                  <td className="py-2">
                    <div className="font-mono">{r.attempt.student.username}</div>
                    <div className="text-xs text-zinc-600">
                      {(r.attempt.student.firstName ?? "") +
                        (r.attempt.student.lastName ? ` ${r.attempt.student.lastName}` : "")}
                    </div>
                  </td>
                  <td className="py-2 font-mono">{r.attempt.student.studentId}</td>
                  <td className="py-2 font-mono">
                    {r.score} / {r.maxScore}
                  </td>
                  <td className="py-2 text-zinc-600">{new Date(r.updatedAt).toLocaleString()}</td>
                  <td className="py-2">
                    {r.attempt.status === "SUBMITTED" && (r.attempt._count?.answers ?? 0) === 0 ? (
                      <button
                        className="btn-ghost px-3 py-2 text-xs"
                        disabled={busy}
                        onClick={() => void resetAttempt(r.attempt.id)}
                        type="button"
                      >
                        Reset attempt
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lockedAttempts.length > 0 ? (
        <div className="card mt-6 p-5">
          <div className="text-sm font-medium">Locked attempts</div>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-2">Student</th>
                  <th className="py-2">Student ID</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Locked at</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lockedAttempts.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2">
                      <div className="font-mono">{a.student.username}</div>
                      <div className="text-xs text-zinc-600">
                        {(a.student.firstName ?? "") + (a.student.lastName ? ` ${a.student.lastName}` : "")}
                      </div>
                    </td>
                    <td className="py-2 font-mono">{a.student.studentId}</td>
                    <td className="py-2 font-mono text-xs">{a.lockedReason ?? "-"}</td>
                    <td className="py-2 text-zinc-600">{a.lockedAt ? new Date(a.lockedAt).toLocaleString() : "-"}</td>
                    <td className="py-2">
                      <button
                        className="btn-ghost px-3 py-2 text-xs"
                        disabled={busy}
                        onClick={() => void resetAttempt(a.id)}
                        type="button"
                      >
                        Reset attempt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
