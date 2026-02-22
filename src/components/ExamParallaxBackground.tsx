"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(Boolean(mq.matches));
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function ExamParallaxBackground({
  variant,
}: {
  variant: "admin" | "student";
}) {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const palette = useMemo(() => {
    if (variant === "admin") {
      return {
        a: "rgba(99, 102, 241, 0.22)",
        b: "rgba(168, 85, 247, 0.16)",
        c: "rgba(14, 165, 233, 0.12)",
      };
    }

    return {
      a: "rgba(16, 185, 129, 0.18)",
      b: "rgba(14, 165, 233, 0.15)",
      c: "rgba(99, 102, 241, 0.12)",
    };
  }, [variant]);

  const styleVars = useMemo(() => {
    return { "--mx": 0, "--my": 0 } as CSSProperties & Record<string, number>;
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (reducedMotion) return;

    let tx = 0;
    let ty = 0;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      tx = (x - 0.5) * 2;
      ty = (y - 0.5) * 2;

      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        el.style.setProperty("--mx", String(tx));
        el.style.setProperty("--my", String(ty));
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [reducedMotion]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"
      style={styleVars}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-zinc-50" />

      <div
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${palette.a}, rgba(255,255,255,0) 60%)`,
          transform: reducedMotion
            ? undefined
            : "translate3d(calc(var(--mx) * 10px), calc(var(--my) * 8px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      />
      <div
        className="absolute -right-24 top-10 h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${palette.b}, rgba(255,255,255,0) 65%)`,
          transform: reducedMotion
            ? undefined
            : "translate3d(calc(var(--mx) * -12px), calc(var(--my) * 10px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      />
      <div
        className="absolute left-1/2 top-2/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${palette.c}, rgba(255,255,255,0) 70%)`,
          transform: reducedMotion
            ? undefined
            : "translate3d(calc(var(--mx) * 8px), calc(var(--my) * -12px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(24,24,27,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          transform: reducedMotion
            ? undefined
            : "translate3d(calc(var(--mx) * -4px), calc(var(--my) * -3px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      />

      <div
        className="absolute left-8 top-10 h-40 w-56 rounded-2xl border border-zinc-200/70 bg-white/55 shadow-sm backdrop-blur"
        style={{
          transform: reducedMotion
            ? undefined
            : "perspective(900px) rotateX(5deg) rotateY(-9deg) translate3d(calc(var(--mx) * 6px), calc(var(--my) * 8px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      >
        <div className="p-4">
          <div className="h-2 w-28 rounded bg-emerald-900/10" />
          <div className="mt-3 h-2 w-40 rounded bg-emerald-900/10" />
          <div className="mt-2 h-2 w-36 rounded bg-emerald-900/10" />
          <div className="mt-5 flex gap-2">
            <div className="h-7 w-16 rounded-lg bg-emerald-900/10" />
            <div className="h-7 w-12 rounded-lg bg-emerald-900/10" />
          </div>
        </div>
      </div>

      <div
        className="absolute right-10 top-28 h-44 w-60 rounded-2xl border border-zinc-200/70 bg-white/55 shadow-sm backdrop-blur"
        style={{
          transform: reducedMotion
            ? undefined
            : "perspective(900px) rotateX(-4deg) rotateY(10deg) translate3d(calc(var(--mx) * -8px), calc(var(--my) * 7px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="h-2 w-24 rounded bg-emerald-900/10" />
            <div className="h-6 w-6 rounded-full bg-emerald-900/10" />
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-6 rounded-lg bg-emerald-900/10" />
            ))}
          </div>
        </div>
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-36 w-52 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200/70 bg-white/55 shadow-sm backdrop-blur"
        style={{
          transform: reducedMotion
            ? undefined
            : "perspective(900px) rotateX(7deg) rotateY(2deg) translate3d(calc(var(--mx) * 5px), calc(var(--my) * -10px), 0)",
          transition: reducedMotion ? undefined : "transform 160ms ease-out",
        }}
      >
        <div className="p-4">
          <div className="h-2 w-32 rounded bg-emerald-900/10" />
          <div className="mt-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-900/10" />
            <div className="h-2 w-24 rounded bg-emerald-900/10" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-900/10" />
            <div className="h-2 w-28 rounded bg-emerald-900/10" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-900/10" />
            <div className="h-2 w-20 rounded bg-emerald-900/10" />
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 h-32 w-full"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))",
        }}
      />
    </div>
  );
}
