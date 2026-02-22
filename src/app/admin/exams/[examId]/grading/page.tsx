"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminExamGradingPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-sm text-zinc-700">Manual grading</div>
        <h1 className="text-2xl font-semibold">Disabled</h1>
        <div className="mt-2 text-sm text-zinc-700">Short answer questions are removed, so manual grading is disabled.</div>
      </div>

      <div className="flex items-center gap-3">
        <Link className="link" href={`/admin/exams/${examId}/results`}>
          Results
        </Link>
        <Link className="link" href={`/admin/exams/${examId}/questions`}>
          Questions
        </Link>
        <Link className="link" href="/admin/exams">
          Back
        </Link>
      </div>
    </div>
  );
}
