"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Question = {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  prompt: string;
  imageUrl?: string | null;
  options: unknown;
  marks: number;
  order: number;
};

type Exam = {
  id: string;
  title: string;
  academicYear: number;
  durationMinutes: number;
  isActive: boolean;
  questions: Question[];
};

type AttemptAnswer = {
  questionId: string;
  value: unknown;
  flagged: boolean;
  answeredAt: string | null;
};

type Attempt = {
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "LOCKED";
  startedAt: string | null;
  submittedAt: string | null;
  timeTakenSeconds: number | null;
  lockedAt?: string | null;
  lockedReason?: string | null;
  answers: AttemptAnswer[];
};

function formatTime(seconds: number) {
  const s = Math.max(0, seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function isAnswered(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.choice === "string") return v.choice.trim().length > 0;
    if (typeof v.value === "string") return v.value.trim().length > 0;
  }
  return true;
}

export default function StudentExamAttemptPage() {
  const router = useRouter();
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [saving, setSaving] = useState(false);
  const pendingSave = useRef<number | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const [warning, setWarning] = useState<string | null>(null);

  const violationSent = useRef(false);
  const fullscreenEver = useRef(false);

  function incrementStrike(kind: "TAB_HIDDEN" | "FULLSCREEN_EXIT") {
    if (!attempt) return;
    if (attempt.status !== "IN_PROGRESS") return;
    if (violationSent.current) return;

    const limit = 5;
    const key = `attempt_strikes_${attempt.id}`;
    const current = Number(window.sessionStorage.getItem(key) ?? "0") || 0;
    const next = current + 1;
    window.sessionStorage.setItem(key, String(next));

    const remaining = Math.max(0, limit - next);
    if (next >= limit) {
      void reportViolation(kind);
      return;
    }

    setWarning(`${kind} (${next}/${limit}). Remaining: ${remaining}`);
  }

  async function reportViolation(kind: "TAB_HIDDEN" | "FULLSCREEN_EXIT") {
    if (!attempt) return;
    if (attempt.status !== "IN_PROGRESS") return;
    if (violationSent.current) return;
    violationSent.current = true;

    setSaving(true);
    try {
      await fetch(`/api/student/attempts/${attempt.id}/violation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
    } finally {
      setSaving(false);
    }

    setAttempt((prev) => (prev ? { ...prev, status: "LOCKED", lockedReason: kind, lockedAt: new Date().toISOString() } : prev));
  }

  const answerMap = useMemo(() => {
    const map = new Map<string, AttemptAnswer>();
    for (const a of attempt?.answers ?? []) map.set(a.questionId, a);
    return map;
  }, [attempt?.answers]);

  const questions = exam?.questions ?? [];
  const activeQuestion = questions[activeIndex] ?? null;
  const activeAnswer = activeQuestion ? answerMap.get(activeQuestion.id) ?? null : null;

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/student/exams/${examId}/attempt`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED_TO_LOAD");
        return;
      }
      const data = (await res.json()) as { exam: Exam; attempt: Attempt };
      setExam(data.exam);
      setAttempt(data.attempt);
      setActiveIndex(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;

    setWarning(null);

    function onVisibility() {
      if (document.hidden) incrementStrike("TAB_HIDDEN");
    }

    function onFullscreen() {
      if (document.fullscreenElement) {
        fullscreenEver.current = true;
        return;
      }
      if (fullscreenEver.current) incrementStrike("FULLSCREEN_EXIT");
    }

    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
    }

    function onPaste(e: ClipboardEvent) {
      e.preventDefault();
    }

    function onCut(e: ClipboardEvent) {
      e.preventDefault();
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);
    window.addEventListener("cut", onCut);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("cut", onCut);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [attempt?.id, attempt?.status]);

  useEffect(() => {
    if (!exam || !attempt?.startedAt) {
      setRemainingSeconds(null);
      return;
    }

    const startedAt = new Date(attempt.startedAt).getTime();
    const durationSeconds = exam.durationMinutes * 60;

    function tick() {
      const now = Date.now();
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = durationSeconds - elapsed;
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        void submitAttempt(true);
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.durationMinutes, attempt?.startedAt, attempt?.id]);

  async function saveAnswer(questionId: string, value: unknown, flagged?: boolean) {
    if (!attempt) return;
    if (attempt.status !== "IN_PROGRESS") return;

    setAttempt((prev) => {
      if (!prev) return prev;
      const exists = prev.answers.find((a) => a.questionId === questionId);
      const nextAnswer: AttemptAnswer = {
        questionId,
        value,
        flagged: flagged ?? exists?.flagged ?? false,
        answeredAt: new Date().toISOString(),
      };
      const nextAnswers = exists
        ? prev.answers.map((a) => (a.questionId === questionId ? nextAnswer : a))
        : [...prev.answers, nextAnswer];
      return { ...prev, answers: nextAnswers };
    });

    if (pendingSave.current) window.clearTimeout(pendingSave.current);
    pendingSave.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/student/attempts/${attempt.id}/answer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ questionId, value, flagged }),
        });
      } finally {
        setSaving(false);
      }
    }, 400);
  }

  async function toggleFlag(questionId: string) {
    const current = answerMap.get(questionId);
    await saveAnswer(questionId, current?.value ?? null, !Boolean(current?.flagged));
  }

  async function submitAttempt(auto = false) {
    if (!attempt) return;
    if (attempt.status !== "IN_PROGRESS") return;

    if (!auto) {
      const ok = window.confirm("Submit your exam? You cannot edit after submitting.");
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/student/attempts/${attempt.id}/submit`, { method: "POST" });
      if (!res.ok) return;
      await load();
      router.push("/student/exams");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-700">Loading...</div>;
  }

  if (!exam || !attempt) {
    return (
      <div className="card p-6">
        <div className="text-sm text-red-700">{error ?? "FAILED"}</div>
        <div className="mt-4">
          <Link className="link" href="/student/exams">
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (attempt.status === "LOCKED") {
    return (
      <div className="card p-6">
        <div className="text-sm text-zinc-700">Your attempt is locked.</div>
        <div className="mt-2 text-sm text-zinc-700">
          Reason: <span className="font-mono">{attempt.lockedReason ?? "-"}</span>
        </div>
        <div className="mt-4">
          <Link className="link" href="/student/exams">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-zinc-700">{exam.academicYear}</div>
          <h1 className="text-2xl font-semibold">{exam.title}</h1>
          <div className="mt-1 text-sm text-zinc-700">
            Status: <span className="font-mono">{attempt.status}</span>
            {saving ? <span className="ml-2">Saving...</span> : null}
            {warning ? <span className="ml-2 text-amber-700">{warning}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 shadow-sm">
            Time left:{" "}
            <span className="font-mono">
              {remainingSeconds === null ? "--:--" : formatTime(remainingSeconds)}
            </span>
          </div>
          <button
            className="btn-primary px-4 py-2"
            disabled={attempt.status !== "IN_PROGRESS"}
            onClick={() => void submitAttempt(false)}
            type="button"
          >
            Submit
          </button>
          <Link className="link" href="/student/exams">
            Exit
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="card p-4">
          <div className="text-sm font-medium">Questions</div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {questions.map((q, idx) => {
              const a = answerMap.get(q.id);
              const answered = isAnswered(a?.value);
              const flagged = Boolean(a?.flagged);
              const isActive = idx === activeIndex;

              let cls = "border border-zinc-200 bg-white";
              if (flagged) cls = "border-amber-300 bg-amber-50";
              else if (answered) cls = "border-emerald-300 bg-emerald-50";

              return (
                <button
                  key={q.id}
                  className={`${cls} h-10 rounded-xl text-xs font-mono ${isActive ? "ring-2 ring-emerald-600" : ""}`}
                  onClick={() => setActiveIndex(idx)}
                  type="button"
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2 text-xs text-zinc-700">
            <div>
              <span className="inline-block h-3 w-3 rounded-sm border border-zinc-200 bg-white align-middle" />{" "}
              Not answered
            </div>
            <div>
              <span className="inline-block h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-50 align-middle" />{" "}
              Answered
            </div>
            <div>
              <span className="inline-block h-3 w-3 rounded-sm border border-amber-300 bg-amber-50 align-middle" />{" "}
              Flagged
            </div>
          </div>
        </div>

        <div className="card p-6">
          {activeQuestion ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-zinc-600">Question {activeIndex + 1}</div>
                  <div className="mt-2 text-base whitespace-pre-wrap">{activeQuestion.prompt}</div>
                  {activeQuestion.imageUrl ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={`Question ${activeIndex + 1}`}
                        className="max-h-96 w-full object-contain"
                        src={activeQuestion.imageUrl}
                      />
                    </div>
                  ) : null}
                </div>
                <button
                  className={`rounded-xl border border-zinc-200 px-3 py-2 text-xs ${
                    activeAnswer?.flagged ? "border-amber-300 bg-amber-50" : "bg-white"
                  }`}
                  onClick={() => void toggleFlag(activeQuestion.id)}
                  type="button"
                >
                  {activeAnswer?.flagged ? "Flagged" : "Flag"}
                </button>
              </div>

              <div className="mt-6">
                {activeQuestion.type === "MULTIPLE_CHOICE" ? (
                  <div className="grid gap-2">
                    {Array.isArray(activeQuestion.options)
                      ? (activeQuestion.options as unknown[]).map((opt, i) => {
                          const label = String(opt);
                          const selected =
                            (activeAnswer?.value as { choice?: string } | null | undefined)?.choice === label;
                          return (
                            <label
                              key={`${activeQuestion.id}-${i}`}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                                selected ? "border-emerald-600" : "bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${activeQuestion.id}`}
                                checked={selected}
                                onChange={() => void saveAnswer(activeQuestion.id, { choice: label })}
                                disabled={attempt.status !== "IN_PROGRESS"}
                              />
                              {label}
                            </label>
                          );
                        })
                      : null}
                  </div>
                ) : null}

                {activeQuestion.type === "TRUE_FALSE" ? (
                  <div className="grid gap-2">
                    {["true", "false"].map((v) => {
                      const selected =
                        (activeAnswer?.value as { choice?: string } | null | undefined)?.choice === v;
                      return (
                        <label
                          key={v}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                            selected ? "border-emerald-600" : "bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${activeQuestion.id}`}
                            checked={selected}
                            onChange={() => void saveAnswer(activeQuestion.id, { choice: v })}
                            disabled={attempt.status !== "IN_PROGRESS"}
                          />
                          {v.toUpperCase()}
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {activeQuestion.type !== "MULTIPLE_CHOICE" && activeQuestion.type !== "TRUE_FALSE" ? (
                  <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">Unsupported question type.</div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  className="btn-ghost px-4 py-2"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="btn-ghost px-4 py-2"
                  disabled={activeIndex >= questions.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(questions.length - 1, i + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-600">No questions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
