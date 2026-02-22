"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type QuestionRow = {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  prompt: string;
  options: unknown;
  correct: unknown;
  marks: number;
  order: number;
  updatedAt: string;
};

type Exam = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  isActive: boolean;
  resultsPublished: boolean;
  questions: QuestionRow[];
};

function getCorrectChoice(correct: unknown) {
  if (!correct) return "";
  if (typeof correct === "string") return correct;
  if (typeof correct === "object") {
    const c = correct as Record<string, unknown>;
    if (typeof c.choice === "string") return c.choice;
    if (typeof c.value === "string") return c.value;
  }
  return "";
}

export default function AdminExamQuestionsPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [type, setType] = useState<QuestionRow["type"]>("MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState(1);
  const [optionsText, setOptionsText] = useState("A\nB\nC\nD");
  const [correctChoice, setCorrectChoice] = useState("A");

  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const options = useMemo(() => {
    if (type === "MULTIPLE_CHOICE") {
      return optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (type === "TRUE_FALSE") return ["true", "false"];
    return [];
  }, [optionsText, type]);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/questions`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED_TO_LOAD");
        return;
      }
      const data = (await res.json()) as { exam: Exam };
      setExam(data.exam);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function createQuestion() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        type,
        prompt,
        marks,
      };
      if (type === "MULTIPLE_CHOICE") {
        payload.options = options;
        payload.correctChoice = correctChoice;
      }
      if (type === "TRUE_FALSE") {
        payload.correctChoice = correctChoice.toLowerCase();
      }

      const res = await fetch(`/api/admin/exams/${examId}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED");
        return;
      }

      setPrompt("");
      setMessage("Question created");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function reorderQuestion(questionId: string, direction: "UP" | "DOWN") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/questions/reorder`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, direction }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(q: QuestionRow) {
    const ok = window.confirm("Delete this question?");
    if (!ok) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED");
        return;
      }
      setMessage("Deleted");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function bulkUploadFromFile() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!bulkFile) {
        setError("NO_FILE");
        return;
      }

      const raw = await bulkFile.text();
      let questions: unknown = null;
      try {
        questions = JSON.parse(raw);
      } catch {
        setError("INVALID_JSON");
        return;
      }

      const res = await fetch(`/api/admin/exams/${examId}/questions/bulk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questions }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | { created?: number; failures?: unknown };

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "FAILED");
        return;
      }

      setMessage("Bulk upload done");
      setBulkFile(null);
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
          <h1 className="text-2xl font-semibold">Questions: {exam.title}</h1>
          <div className="mt-1 text-sm text-zinc-700">
            Total: <span className="font-mono">{exam.questions.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link className="link" href="/admin/exams">
            Back
          </Link>
          <Link className="link" href={`/admin/exams/${examId}/results`}>
            Results
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
            <div className="text-sm font-medium">Add question</div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-zinc-700">Type</div>
                <select
                  className="input h-11 px-3"
                  value={type}
                  onChange={(e) => setType(e.target.value as QuestionRow["type"])}
                >
                  <option value="MULTIPLE_CHOICE">Multiple choice</option>
                  <option value="TRUE_FALSE">True/False</option>
                </select>
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-zinc-700">Marks</div>
                <input
                  className="input px-3"
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-zinc-700">Prompt</div>
                <textarea
                  className="textarea min-h-24"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type the question prompt..."
                />
              </label>

              {type === "MULTIPLE_CHOICE" ? (
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <div className="text-xs text-zinc-700">Options (one per line)</div>
                    <textarea
                      className="textarea min-h-24 font-mono"
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-zinc-700">Correct option (must match one option exactly)</div>
                    <input
                      className="input font-mono"
                      value={correctChoice}
                      onChange={(e) => setCorrectChoice(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {type === "TRUE_FALSE" ? (
                <label className="grid gap-1">
                  <div className="text-xs text-zinc-700">Correct</div>
                  <select
                    className="input h-11 px-3"
                    value={correctChoice.toLowerCase() === "false" ? "false" : "true"}
                    onChange={(e) => setCorrectChoice(e.target.value)}
                  >
                    <option value="true">TRUE</option>
                    <option value="false">FALSE</option>
                  </select>
                </label>
              ) : null}

              <button
                className="btn-primary px-4 py-2"
                disabled={busy || prompt.trim().length === 0}
                onClick={() => void createQuestion()}
                type="button"
              >
                Create
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            {message ? (
              <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
            ) : null}
          </div>

          <div className="card p-5">
            <div className="text-sm font-medium">Bulk upload (JSON file)</div>
            <div className="mt-2 text-xs text-zinc-700">
              Choose a <span className="font-mono">.json</span> file containing an array like:{" "}
              <span className="font-mono">
                {`[{"type":"MULTIPLE_CHOICE","prompt":"...","options":["A","B"],"correctChoice":"A","marks":1}]`}
              </span>
            </div>
            <input
              className="mt-3 block w-full text-sm"
              accept="application/json,.json"
              disabled={busy}
              onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
              type="file"
            />
            <button
              className="btn-ghost mt-3 px-4 py-2"
              disabled={busy || !bulkFile}
              onClick={() => void bulkUploadFromFile()}
              type="button"
            >
              Upload
            </button>
          </div>
        </div>

        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Existing questions</div>
            <button className="btn-ghost px-3 py-2" onClick={() => void load()} type="button">
              Refresh
            </button>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-2">#</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Marks</th>
                  <th className="py-2">Prompt</th>
                  <th className="py-2">Correct</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exam.questions.map((q) => (
                  <tr key={q.id} className="border-t align-top">
                    <td className="py-2 font-mono">{q.order}</td>
                    <td className="py-2 font-mono text-xs">{q.type}</td>
                    <td className="py-2 font-mono">{q.marks}</td>
                    <td className="py-2 whitespace-pre-wrap">{q.prompt}</td>
                    <td className="py-2 font-mono text-xs">{getCorrectChoice(q.correct)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"
                          href={`/admin/exams/${examId}/questions/${q.id}`}
                        >
                          Edit
                        </Link>
                        <button
                          className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"
                          disabled={busy || q.order <= 1}
                          onClick={() => void reorderQuestion(q.id, "UP")}
                          type="button"
                        >
                          Up
                        </button>
                        <button
                          className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"
                          disabled={busy}
                          onClick={() => void reorderQuestion(q.id, "DOWN")}
                          type="button"
                        >
                          Down
                        </button>

                        <button
                          className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"
                          disabled={busy}
                          onClick={() => void deleteQuestion(q)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">Updated: {new Date(q.updatedAt).toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
