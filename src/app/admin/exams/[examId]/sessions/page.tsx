"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ExamInfo = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  isActive: boolean;
};

type AttemptRow = {
  id: string;
  status: "IN_PROGRESS";
  startedAt: string | null;
  lockUpdatedAt: string | null;
  lockToken: string | null;
  student: {
    username: string;
    firstName: string | null;
    lastName: string | null;
    studentId: string | null;
  };
};

function formatTimeLeft(seconds: number) {
  const s = Math.max(0, seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function AdminExamSessionsPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/sessions`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED_TO_LOAD");
        return;
      }
      const data = (await res.json()) as { exam: ExamInfo; attempts: AttemptRow[] };
      setExam(data.exam);
      setAttempts(data.attempts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function post(path: string) {
    setBusy(true);
    setError(null);
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
    return <div className="text-sm text-zinc-700">Loading...</div>;
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

  const now = Date.now();

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-zinc-700">{exam.academicYear}</div>
          <h1 className="text-2xl font-semibold">Active sessions: {exam.title}</h1>
          <div className="mt-1 text-sm text-zinc-700">
            Auto-refresh: <span className="font-mono">5s</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link className="link" href={`/admin/exams/${examId}/results`}>
            Results
          </Link>
          <Link className="link" href="/admin/exams">
            Back
          </Link>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-zinc-700">
            In progress: <span className="font-mono">{attempts.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost px-3 py-2" disabled={busy} onClick={() => void load()} type="button">
              Refresh
            </button>
          </div>
        </div>

        {error ? <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? (
          <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
        ) : null}

        {attempts.length === 0 ? (
          <div className="mt-4 text-sm text-zinc-700">No active sessions.</div>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-2">Student</th>
                  <th className="py-2">Student ID</th>
                  <th className="py-2">Started</th>
                  <th className="py-2">Time left</th>
                  <th className="py-2">Lock</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const startedMs = a.startedAt ? new Date(a.startedAt).getTime() : null;
                  const elapsed = startedMs ? Math.max(0, Math.floor((now - startedMs) / 1000)) : null;
                  const remaining = elapsed === null ? null : exam.durationMinutes * 60 - elapsed;

                  return (
                    <tr key={a.id} className="border-t">
                      <td className="py-2">
                        <div className="font-mono">{a.student.username}</div>
                        <div className="text-xs text-zinc-600">
                          {(a.student.firstName ?? "") + (a.student.lastName ? ` ${a.student.lastName}` : "")}
                        </div>
                      </td>
                      <td className="py-2 font-mono">{a.student.studentId}</td>
                      <td className="py-2 text-zinc-600">{a.startedAt ? new Date(a.startedAt).toLocaleString() : "-"}</td>
                      <td className="py-2 font-mono">{remaining === null ? "--:--" : formatTimeLeft(remaining)}</td>
                      <td className="py-2">
                        {a.lockToken ? (
                          <span className="rounded-lg bg-zinc-100 px-2 py-1 font-mono text-xs">LOCKED</span>
                        ) : (
                          <span className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-700">OPEN</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn-ghost px-3 py-2 text-xs"
                            disabled={busy}
                            onClick={() => void post(`/api/admin/attempts/${a.id}/unlock`)}
                            type="button"
                          >
                            Unlock
                          </button>
                          <button
                            className="btn-primary px-3 py-2 text-xs"
                            disabled={busy}
                            onClick={() => void post(`/api/admin/attempts/${a.id}/terminate`)}
                            type="button"
                          >
                            Terminate
                          </button>
                          <button
                            className="btn-ghost px-3 py-2 text-xs"
                            disabled={busy}
                            onClick={() => void post(`/api/admin/attempts/${a.id}/reset`)}
                            type="button"
                          >
                            Reset attempt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
