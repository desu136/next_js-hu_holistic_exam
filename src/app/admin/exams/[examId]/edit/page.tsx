"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Exam = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  isActive: boolean;
  resultsPublished: boolean;
  maxQuestions?: number | null;
  totalMarks?: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assignments: number;
    attempts: number;
    questions: number;
  };
};

export default function AdminExamEditPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [examPassword, setExamPassword] = useState("");
  const [maxQuestions, setMaxQuestions] = useState<number | "">("");
  const [totalMarks, setTotalMarks] = useState<number | "">("");

  async function load() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/exams/${examId}`);
      const data = (await res.json().catch(() => null)) as { error?: string } | { exam?: Exam } | null;

      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "FAILED_TO_LOAD");
        return;
      }

      const exam = (data as { exam: Exam }).exam;
      setTitle(exam.title);
      setAcademicYear(exam.academicYear);
      setDurationMinutes(exam.durationMinutes);
      setIsActive(exam.isActive);
      setExamPassword("");
      setMaxQuestions(typeof exam.maxQuestions === "number" ? exam.maxQuestions : "");
      setTotalMarks(typeof exam.totalMarks === "number" ? exam.totalMarks : "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        title,
        academicYear,
        durationMinutes,
        isActive,
        maxQuestions: maxQuestions === "" ? null : maxQuestions,
        totalMarks: totalMarks === "" ? null : totalMarks,
      };
      if (examPassword.trim().length > 0) {
        payload.examPassword = examPassword;
      }

      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | { exam?: Exam } | null;
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "FAILED_TO_SAVE");
        return;
      }

      setExamPassword("");
      setMessage("Saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-700">Loading...</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-zinc-700">Exam settings</div>
          <h1 className="text-2xl font-semibold">Edit Exam</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link className="link" href="/admin/exams">
            Back
          </Link>
          <button className="btn-primary px-4 py-2" disabled={busy} onClick={() => void save()} type="button">
            Save
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <div className="text-xs text-zinc-700">Title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <div className="text-xs text-zinc-700">Academic year</div>
              <input
                className="input"
                inputMode="numeric"
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-zinc-700">Duration (minutes)</div>
              <input
                className="input"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <div className="text-xs text-zinc-700">Max questions (optional)</div>
              <input
                className="input"
                inputMode="numeric"
                value={maxQuestions}
                onChange={(e) => {
                  const v = e.target.value;
                  setMaxQuestions(v.trim().length === 0 ? "" : Number(v));
                }}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-zinc-700">Total marks (optional)</div>
              <input
                className="input"
                inputMode="numeric"
                value={totalMarks}
                onChange={(e) => {
                  const v = e.target.value;
                  setTotalMarks(v.trim().length === 0 ? "" : Number(v));
                }}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>

          <label className="grid gap-1">
            <div className="text-xs text-zinc-700">Change exam password (optional)</div>
            <input
              className="input"
              placeholder="Leave empty to keep current password"
              value={examPassword}
              onChange={(e) => setExamPassword(e.target.value)}
            />
          </label>

          {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {message ? <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}

          <button className="btn-ghost px-4 py-2" disabled={busy} onClick={() => void load()} type="button">
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
