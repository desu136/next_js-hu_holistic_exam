"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

type Question = {
  id: string;
  examId: string;
  type: QuestionType;
  prompt: string;
  imageUrl?: string | null;
  options: unknown;
  correct: unknown;
  marks: number;
  order: number;
  updatedAt: string;
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

export default function AdminEditQuestionPage() {
  const params = useParams<{ examId: string; questionId: string }>();
  const examId = params.examId;
  const questionId = params.questionId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [type, setType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState(1);
  const [optionsText, setOptionsText] = useState("A\nB\nC\nD");
  const [correctChoice, setCorrectChoice] = useState("A");

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

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
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/questions/${questionId}`);
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | { question: Question }
        | null;

      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "FAILED_TO_LOAD");
        return;
      }

      const q = (data as { question: Question }).question;
      if (q.examId !== examId) {
        setError("QUESTION_EXAM_MISMATCH");
        return;
      }

      setType(q.type);
      setPrompt(q.prompt);
      setMarks(q.marks);
      setImageUrl(typeof q.imageUrl === "string" ? q.imageUrl : null);

      if (q.type === "MULTIPLE_CHOICE") {
        const currentOpts = Array.isArray(q.options) ? (q.options as unknown[]).map(String) : [];
        setOptionsText(currentOpts.join("\n"));
        setCorrectChoice(getCorrectChoice(q.correct));
      } else if (q.type === "TRUE_FALSE") {
        const c = getCorrectChoice(q.correct).toLowerCase();
        setCorrectChoice(c === "false" ? "false" : "true");
        setOptionsText("true\nfalse");
      }
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage() {
    if (!imageFile) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const form = new FormData();
      form.append("file", imageFile);

      const res = await fetch(`/api/admin/questions/${questionId}/image`, {
        method: "POST",
        body: form,
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | { question?: { imageUrl?: string | null } }
        | null;

      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "FAILED");
        return;
      }

      const nextUrl = (data as { question?: { imageUrl?: string | null } } | null)?.question?.imageUrl;
      setImageUrl(typeof nextUrl === "string" ? nextUrl : null);
      setImageFile(null);
      setMessage("Image uploaded");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeImage() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/questions/${questionId}/image`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | { question?: { imageUrl?: string | null } }
        | null;

      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "FAILED");
        return;
      }

      setImageUrl(null);
      setImageFile(null);
      setMessage("Image removed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, questionId]);

  async function save() {
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
        payload.correctChoice = correctChoice.toLowerCase() === "false" ? "false" : "true";
      }

      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | { question?: unknown } | null;
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "FAILED");
        return;
      }

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
          <div className="text-sm text-zinc-700">Edit question</div>
          <h1 className="text-2xl font-semibold">Question</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link className="link" href={`/admin/exams/${examId}/questions`}>
            Back
          </Link>
          <button className="btn-primary px-4 py-2" disabled={busy} onClick={() => void save()} type="button">
            Save
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-xs text-zinc-700">Question image (optional)</div>
            {imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Question" className="max-h-80 w-full object-contain" src={imageUrl} />
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">No image attached.</div>
            )}

            <input
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 disabled:opacity-60"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              type="file"
            />

            <div className="flex flex-wrap gap-2">
              <button
                className="btn-ghost px-4 py-2"
                disabled={busy || !imageFile}
                onClick={() => void uploadImage()}
                type="button"
              >
                Upload image
              </button>
              <button
                className="btn-ghost px-4 py-2"
                disabled={busy || !imageUrl}
                onClick={() => void removeImage()}
                type="button"
              >
                Remove image
              </button>
            </div>
          </div>

          <label className="grid gap-1">
            <div className="text-xs text-zinc-700">Type</div>
            <select
              className="input h-11 px-3"
              value={type}
              onChange={(e) => {
                const next = e.target.value as QuestionType;
                setType(next);
                if (next === "TRUE_FALSE") {
                  setOptionsText("true\nfalse");
                  setCorrectChoice("true");
                }
              }}
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
              className="textarea min-h-28"
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
                  className="textarea min-h-28 font-mono"
                  value={optionsText}
                  onChange={(e) => {
                    const nextText = e.target.value;
                    setOptionsText(nextText);

                    const nextOpts = nextText
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (nextOpts.length > 0 && !nextOpts.includes(correctChoice)) {
                      setCorrectChoice(nextOpts[0] ?? "");
                    }
                  }}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-zinc-700">Correct answer</div>
                <select
                  className="input h-11 px-3 font-mono"
                  value={correctChoice}
                  onChange={(e) => setCorrectChoice(e.target.value)}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {type === "TRUE_FALSE" ? (
            <label className="grid gap-1">
              <div className="text-xs text-zinc-700">Correct answer</div>
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

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {message ? (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
