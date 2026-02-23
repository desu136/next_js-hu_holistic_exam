"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StudentRow = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  studentId: string | null;
  createdAt?: string;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<
    | {
        username: string;
        initialPassword: string;
      }
    | null
  >(null);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<
    | {
        total: number;
        createdCount: number;
        failedCount: number;
        created: Array<{ username: string; studentId: string; initialPassword: string }>;
        failed: Array<{ row: number; error: string }>;
      }
    | null
  >(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      if (!res.ok) {
        setError("FAILED_TO_LOAD");
        return;
      }
      const data = (await res.json()) as { students: StudentRow[] };
      setStudents(data.students);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setCreatedPassword(null);
    setError(null);
    setResetResult(null);

    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName: lastName || null,
        studentId,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "FAILED_TO_CREATE");
      return;
    }

    const data = (await res.json()) as {
      student: StudentRow;
      initialPassword: string;
    };

    setCreatedPassword(data.initialPassword);
    setFirstName("");
    setLastName("");
    setStudentId("");

    await load();
  }

  async function resetPassword(studentUserId: string) {
    setResetResult(null);
    setError(null);
    setResettingId(studentUserId);
    try {
      const res = await fetch("/api/admin/students/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: studentUserId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "RESET_FAILED");
        return;
      }

      const data = (await res.json()) as {
        username: string;
        initialPassword: string;
      };
      setResetResult({ username: data.username, initialPassword: data.initialPassword });
    } finally {
      setResettingId(null);
    }
  }

  async function uploadCsv(e: React.FormEvent) {
    e.preventDefault();
    setBulkError(null);
    setBulkResult(null);

    if (!bulkFile) {
      setBulkError("MISSING_FILE");
      return;
    }

    setBulkUploading(true);
    try {
      const form = new FormData();
      form.set("file", bulkFile);

      const res = await fetch("/api/admin/students/bulk", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setBulkError(data?.error ?? "UPLOAD_FAILED");
        return;
      }

      const data = (await res.json()) as {
        total: number;
        createdCount: number;
        failedCount: number;
        created: Array<{ username: string; studentId: string; initialPassword: string }>;
        failed: Array<{ row: number; error: string }>;
      };

      setBulkResult(data);
      setBulkFile(null);
      await load();
    } finally {
      setBulkUploading(false);
    }
  }

  const rows = useMemo(() => students, [students]);

  async function saveEdit() {
    if (!editing) return;
    setError(null);
    setSavingId(editing.id);
    try {
      const res = await fetch(`/api/admin/students/${editing.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName: editing.firstName,
            lastName: editing.lastName.trim().length === 0 ? null : editing.lastName,
            studentId: editing.studentId.trim().length === 0 ? null : editing.studentId,
          }),
        },
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED_TO_UPDATE");
        return;
      }

      setEditing(null);
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteStudent(studentIdToDelete: string) {
    const ok = window.confirm("Delete this student? This cannot be undone.");
    if (!ok) return;
    setError(null);
    setDeletingId(studentIdToDelete);
    try {
      const res = await fetch(`/api/admin/students/${studentIdToDelete}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "FAILED_TO_DELETE");
        return;
      }
      if (editing?.id === studentIdToDelete) setEditing(null);
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Student Management</h1>
          <div className="mt-1 text-sm text-zinc-700">Create students one-by-one or bulk upload via CSV.</div>
        </div>
        <Link className="link" href="/admin">
          Back to dashboard
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
            <h2 className="font-medium">Add Student</h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={createStudent}>
              <input
                className="input"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              {error ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}
              {createdPassword ? (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  Initial password: <span className="font-mono">{createdPassword}</span>
                </div>
              ) : null}
              {resetResult ? (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  Password reset for <span className="font-mono">{resetResult.username}</span>. New password:{" "}
                  <span className="font-mono">{resetResult.initialPassword}</span>
                </div>
              ) : null}
              <button className="btn-primary h-11" type="submit">
                Create
              </button>
            </form>
        </div>

        <div className="card p-5">
            <h2 className="font-medium">Bulk Upload (CSV)</h2>
            <div className="mt-1 text-sm text-zinc-700">
              CSV headers supported: <span className="font-mono">firstName,lastName,studentId</span>
            </div>

            <form className="mt-4 flex flex-col gap-3" onSubmit={uploadCsv}>
              <input
                className="block w-full text-sm"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setBulkFile(f);
                }}
              />
              {bulkError ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{bulkError}</div>
              ) : null}
              <button className="btn-primary h-11" type="submit" disabled={bulkUploading}>
                {bulkUploading ? "Uploading..." : "Upload"}
              </button>
            </form>

            {bulkResult ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                <div className="text-sm text-zinc-700">
                  Total rows: <span className="font-mono">{bulkResult.total}</span>
                </div>
                <div className="text-sm text-zinc-700">
                  Created: <span className="font-mono">{bulkResult.createdCount}</span>
                </div>
                <div className="text-sm text-zinc-700">
                  Failed: <span className="font-mono">{bulkResult.failedCount}</span>
                </div>

                {bulkResult.created.length > 0 ? (
                  <div className="mt-3 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-zinc-600">
                          <th className="py-2">Username</th>
                          <th className="py-2">Student ID</th>
                          <th className="py-2">Initial Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResult.created.map((c) => (
                          <tr key={c.username} className="border-t">
                            <td className="py-2 font-mono">{c.username}</td>
                            <td className="py-2 font-mono">{c.studentId}</td>
                            <td className="py-2 font-mono">{c.initialPassword}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {bulkResult.failed.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium">Failed rows</div>
                    <div className="mt-2 overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-zinc-600">
                            <th className="py-2">Row</th>
                            <th className="py-2">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResult.failed.map((f) => (
                            <tr key={`${f.row}-${f.error}`} className="border-t">
                              <td className="py-2 font-mono">{f.row}</td>
                              <td className="py-2">{f.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Students</h2>
          <button className="btn-ghost px-3 py-1" onClick={() => void load()} type="button">
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
                  <th className="py-2">Username</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Student ID</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 font-mono">{s.username}</td>
                    <td className="py-2">
                      {editing?.id === s.id ? (
                        <div className="grid gap-2">
                          <input
                            className="input h-9"
                            value={editing.firstName}
                            onChange={(e) => setEditing({ ...editing, firstName: e.target.value })}
                          />
                          <input
                            className="input h-9"
                            value={editing.lastName}
                            onChange={(e) => setEditing({ ...editing, lastName: e.target.value })}
                            placeholder="Last name (optional)"
                          />
                        </div>
                      ) : (
                        (s.firstName ?? "") + (s.lastName ? ` ${s.lastName}` : "")
                      )}
                    </td>
                    <td className="py-2 font-mono">
                      {editing?.id === s.id ? (
                        <input
                          className="input h-9"
                          value={editing.studentId}
                          onChange={(e) => setEditing({ ...editing, studentId: e.target.value })}
                        />
                      ) : (
                        s.studentId
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {editing?.id === s.id ? (
                          <>
                            <button
                              className="btn-primary px-3 py-1 text-xs disabled:opacity-50"
                              disabled={savingId === s.id}
                              onClick={() => void saveEdit()}
                              type="button"
                            >
                              {savingId === s.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              className="btn-ghost px-3 py-1 text-xs"
                              disabled={savingId === s.id}
                              onClick={() => setEditing(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-ghost px-3 py-1 text-xs"
                              onClick={() =>
                                setEditing({
                                  id: s.id,
                                  firstName: s.firstName ?? "",
                                  lastName: s.lastName ?? "",
                                  studentId: s.studentId ?? "",
                                })
                              }
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="btn-ghost px-3 py-1 text-xs disabled:opacity-50"
                              disabled={resettingId === s.id || deletingId === s.id}
                              onClick={() => void resetPassword(s.id)}
                              type="button"
                            >
                              {resettingId === s.id ? "Resetting..." : "Reset password"}
                            </button>
                            <button
                              className="btn-ghost px-3 py-1 text-xs disabled:opacity-50"
                              disabled={deletingId === s.id || resettingId === s.id}
                              onClick={() => void deleteStudent(s.id)}
                              type="button"
                            >
                              {deletingId === s.id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
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
