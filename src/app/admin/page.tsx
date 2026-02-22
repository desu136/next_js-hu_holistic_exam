import { ExamParallaxBackground } from "@/components/ExamParallaxBackground";

export default async function AdminPage() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/65 p-6 shadow-sm backdrop-blur md:p-10">
      <ExamParallaxBackground variant="admin" />

      <div className="relative">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <div className="mt-1 text-sm text-zinc-700">Manage students, exams, and results.</div>
            <div className="mt-3 grid gap-3 text-sm text-zinc-700">
              <div>
                <span className="font-medium text-zinc-900">Exams</span>
                <div className="mt-1">
                  Create exams, set passwords, add questions, assign students, and control whether exams are active.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">Live proctoring (Active sessions)</span>
                <div className="mt-1">
                  Open an exam and use <span className="font-mono">Active sessions</span> to view students currently
                  taking the exam. From there you can:
                </div>
                <div className="mt-2 grid gap-1">
                  <div>
                    <span className="font-medium text-zinc-900">Unlock</span> a session so a student can continue from
                    another device.
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900">Terminate</span> to lock an in-progress attempt.
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900">Reset attempt</span> to allow starting over.
                  </div>
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">Results</span>
                <div className="mt-1">
                  Generate results and publish/hide them. Students can only see results after you publish.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
