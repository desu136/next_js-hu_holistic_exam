"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ExamRow = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  isActive: boolean;
  resultsPublished: boolean;
  maxQuestions?: number | null;
  totalMarks?: number | null;
  createdAt: string;
  _count?: {
    assignments: number;
    attempts: number;
    questions: number;
  };
};

type Student = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  studentId: string | null;
};

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examPassword, setExamPassword] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [maxQuestions, setMaxQuestions] = useState<number | "">("");
  const [totalMarks, setTotalMarks] = useState<number | "">("");

  const [assignExamId, setAssignExamId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});
  const [assignResult, setAssignResult] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    setLoading(true);
    try {
      const [exRes, stRes] = await Promise.all([
        fetch("/api/admin/exams"),
        fetch("/api/admin/students/minimal"),
      ]);

      if (!exRes.ok) {
        setError("FAILED_TO_LOAD_EXAMS");
        return;
      }
      if (!stRes.ok) {
        setError("FAILED_TO_LOAD_STUDENTS");
        return;
      }

      const exData = (await exRes.json()) as { exams: ExamRow[] };
      const stData = (await stRes.json()) as { students: Student[] };

      setExams(exData.exams);
      setStudents(stData.students);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function toggleActive(exam: ExamRow) {
    setError(null);
    const res = await fetch(`/api/admin/exams/${exam.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !exam.isActive }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "FAILED_TO_UPDATE");
      return;
    }

    await loadAll();
  }

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        academicYear,
        durationMinutes,
        examPassword,
        isActive,
        maxQuestions: maxQuestions === "" ? null : maxQuestions,
        totalMarks: totalMarks === "" ? null : totalMarks,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "FAILED_TO_CREATE");
      return;
    }

    setTitle("");
    setExamPassword("");
    setMaxQuestions("");
    setTotalMarks("");
    await loadAll();
  }

  async function assignSelected() {
    if (!assignExamId) return;
    setAssignResult(null);

    const studentUserIds = Object.entries(selectedStudents)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (studentUserIds.length === 0) {
      setAssignResult("NO_STUDENTS_SELECTED");
      return;
    }

    const res = await fetch("/api/admin/exams/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examId: assignExamId, studentUserIds }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setAssignResult(data?.error ?? "FAILED_TO_ASSIGN");
      return;
    }

    const data = (await res.json()) as { assignedCount: number };
    setAssignResult(`Assigned to ${data.assignedCount} students.`);
    await loadAll();
  }

  const rows = useMemo(() => exams, [exams]);

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Exam Management</h1>
          <div className="mt-1 text-sm text-zinc-700">Create exams and assign them to students.</div>
        </div>
        <Link className="link" href="/admin">
          Back to dashboard
        </Link>
      </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-medium">Create Exam</h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={createExam}>
              <input
                className="input"
                placeholder="Exam title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="Academic year"
                  inputMode="numeric"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value))}
                />
                <input
                  className="input"
                  placeholder="Duration (minutes)"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="Max questions (optional)"
                  inputMode="numeric"
                  value={maxQuestions}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMaxQuestions(v.trim().length === 0 ? "" : Number(v));
                  }}
                />
                <input
                  className="input"
                  placeholder="Total marks (optional)"
                  inputMode="numeric"
                  value={totalMarks}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTotalMarks(v.trim().length === 0 ? "" : Number(v));
                  }}
                />
              </div>
              <input
                className="input"
                placeholder="Exam password (students must enter to start)"
                value={examPassword}
                onChange={(e) => setExamPassword(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>

              {error ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

              <button className="btn-primary h-11" type="submit">
                Create exam
              </button>
            </form>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Assign Exam</h2>
              <button className="btn-ghost px-3 py-1" onClick={() => void loadAll()} type="button">
                Refresh
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Select exam</label>
              <select
                className="input mt-2"
                value={assignExamId ?? ""}
                onChange={(e) => {
                  setAssignExamId(e.target.value || null);
                  setAssignResult(null);
                }}
              >
                <option value="">Choose...</option>
                {rows.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.academicYear})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium">Select students</div>
              <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                {students.map((s) => {
                  const name = (s.firstName ?? "") + (s.lastName ? ` ${s.lastName}` : "");
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selectedStudents[s.id])}
                        onChange={(e) =>
                          setSelectedStudents((prev) => ({ ...prev, [s.id]: e.target.checked }))
                        }
                      />
                      <div className="flex-1">
                        <div className="font-mono text-xs">{s.username}</div>
                        <div className="text-xs text-zinc-700">{name || s.studentId}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {assignResult ? (
              <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{assignResult}</div>
            ) : null}

            <button
              className="btn-primary mt-4 h-11 w-full"
              onClick={() => void assignSelected()}
              type="button"
            >
              Assign selected students
            </button>
          </div>
        </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Exams</h2>
          <button className="btn-ghost" onClick={() => void loadAll()} type="button">
            Refresh
          </button>
        </div>

          {loading ? (
            <div className="mt-4 text-sm text-zinc-700">Loading...</div>
          ) : (
            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-600">
                    <th className="py-2">Title</th>
                    <th className="py-2">Year</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2">Active</th>
                    <th className="py-2">Assigned</th>
                    <th className="py-2">Attempts</th>
                    <th className="py-2 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ex) => (
                    <tr key={ex.id} className="border-t">
                      <td className="py-2">{ex.title}</td>
                      <td className="py-2 font-mono">{ex.academicYear}</td>
                      <td className="py-2 font-mono">{ex.durationMinutes}m</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span>{ex.isActive ? "Yes" : "No"}</span>
                          <button
                            className="btn-ghost px-3 py-1 text-xs"
                            onClick={() => void toggleActive(ex)}
                            type="button"
                          >
                            {ex.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 font-mono">{ex._count?.assignments ?? 0}</td>
                      <td className="py-2 font-mono">{ex._count?.attempts ?? 0}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            className="rounded-xl border bg-white px-3 py-2 text-xs"
                            href={`/admin/exams/${ex.id}/edit`}
                          >
                            Edit
                          </Link>
                          <Link
                            className="rounded-xl border bg-white px-3 py-2 text-xs"
                            href={`/admin/exams/${ex.id}/questions`}
                          >
                            Questions
                          </Link>
                          <Link
                            className="rounded-xl border bg-white px-3 py-2 text-xs"
                            href={`/admin/exams/${ex.id}/results`}
                          >
                            Results
                          </Link>
                        </div>
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
