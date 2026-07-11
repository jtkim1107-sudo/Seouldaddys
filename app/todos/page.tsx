"use client";

import { useState } from "react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser } from "@/lib/db";
import { TABLES, type Todo, type TodoStatus, type Member } from "@/lib/types";

const COLUMNS: { status: TodoStatus; label: string; color: string }[] = [
  { status: "todo", label: "📥 할 일", color: "bg-slate-400" },
  { status: "doing", label: "🔨 진행 중", color: "bg-amber-400" },
  { status: "done", label: "✅ 완료", color: "bg-green-500" },
];

export default function TodosPage() {
  const { rows: todos } = useTable<Todo>(TABLES.todos);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");

  const names = Array.from(
    new Set([
      ...members.map((m) => m.name),
      ...todos.map((t) => t.assignee).filter(Boolean),
      getCurrentUser()?.name || "",
    ])
  ).filter(Boolean);

  async function add() {
    if (!title.trim()) return;
    await insertRow<Todo>(TABLES.todos, {
      title: title.trim(),
      status: "todo",
      assignee: assignee || getCurrentUser()?.name || "",
      due,
    });
    setTitle("");
    setDue("");
  }

  async function moveTo(t: Todo, status: TodoStatus) {
    await updateRow<Todo>(TABLES.todos, t.id, { status });
  }

  async function remove(t: Todo) {
    if (confirm(`"${t.title}" 할 일을 삭제할까요?`)) await deleteRow(TABLES.todos, t.id);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📋 할 일 보드</h1>
        <p className="text-sm text-slate-500 mt-1">화살표 버튼으로 단계를 옮길 수 있어요</p>
      </div>

      {/* 추가 폼 */}
      <div className="card p-4 flex flex-wrap gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="새 할 일 입력"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <select className="input w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">담당: 나</option>
          {names.map((n) => (
            <option key={n} value={n}>
              담당: {n}
            </option>
          ))}
        </select>
        <input className="input w-auto" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button onClick={add} className="btn-primary">
          추가
        </button>
      </div>

      {/* 칸반 보드 */}
      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col, ci) => {
          const items = todos.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <h2 className="font-bold text-sm">{col.label}</h2>
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {items.map((t) => (
                  <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-slate-400" : ""}`}>
                      {t.title}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-slate-500">
                        {t.assignee && <span className="mr-2">👤 {t.assignee}</span>}
                        {t.due && <span>~{t.due.slice(5)}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {ci > 0 && (
                          <button
                            onClick={() => moveTo(t, COLUMNS[ci - 1].status)}
                            className="rounded bg-white border border-slate-200 px-1.5 text-xs hover:bg-slate-100"
                            title="이전 단계로"
                          >
                            ◀
                          </button>
                        )}
                        {ci < COLUMNS.length - 1 && (
                          <button
                            onClick={() => moveTo(t, COLUMNS[ci + 1].status)}
                            className="rounded bg-white border border-slate-200 px-1.5 text-xs hover:bg-slate-100"
                            title="다음 단계로"
                          >
                            ▶
                          </button>
                        )}
                        <button
                          onClick={() => remove(t)}
                          className="rounded px-1 text-xs text-slate-300 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-slate-300 text-center py-6">비어 있음</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
