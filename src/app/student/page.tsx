import { ExamParallaxBackground } from "@/components/ExamParallaxBackground";

export default async function StudentHome() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/65 p-6 shadow-sm backdrop-blur md:p-10">
      <ExamParallaxBackground variant="student" />

      <div className="relative">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Student Portal</h1>
            <div className="mt-1 text-sm text-zinc-700">Access your exams and results.</div>
            <div className="mt-3 text-sm text-zinc-700">
              Use the navigation on the left to open your exams, results, and settings.
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm font-medium">How exams work</div>
            <div className="mt-3 grid gap-2 text-sm text-zinc-700">
              <div>
                <span className="font-medium text-zinc-900">1) Get the exam password</span>
                <div className="mt-1">
                  You need an exam password that is released by the admin. Without it, you cannot start the exam.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">2) Navigate to your exam</span>
                <div className="mt-1">
                  Open <span className="font-mono">Exams</span> from the left navigation, choose your exam, then enter
                  the password.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">3) Timer & attempts</span>
                <div className="mt-1">
                  Your timer runs during the attempt. If you exit and re-enter, the attempt continues according to the
                  exam rules.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">4) Saving answers</span>
                <div className="mt-1">
                  Your answers are saved while you work. Keep your internet connection stable to avoid delays.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">5) Submit</span>
                <div className="mt-1">
                  When you finish, press <span className="font-medium">Submit</span>. After submission, you cannot
                  change your answers.
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm font-medium">Exam rules (anti-cheat)</div>
            <div className="mt-3 grid gap-3 text-sm text-zinc-700">
              <div>
                <span className="font-medium text-zinc-900">Tab switching / leaving the exam page</span>
                <div className="mt-1">
                  If you leave the exam page (switch tabs / minimize), you will receive a warning. Repeating this action
                  <span className="font-medium"> 5 times</span> will lock your attempt.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">Copy / Paste / Right click</span>
                <div className="mt-1">
                  These actions are blocked during the exam.
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-900">Locked attempt</span>
                <div className="mt-1">
                  If your attempt is locked, you cannot continue until the admin resets it.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
