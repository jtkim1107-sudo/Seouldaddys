"use client";

import { useEffect, useState } from "react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser } from "@/lib/db";
import { TABLES, type Todo, type TodoStatus, type Member } from "@/lib/types";

const COLUMNS: { status: TodoStatus; label: string; color: string }[] = [
  { status: "todo", label: "📥 할 일", color: "bg-slate-400" },
  { status: "doing", label: "🔨 진행 중", color: "bg-amber-400" },
  { status: "done", label: "✅ 완료", color: "bg-green-500" },
];

const STATUS_BADGE: Record<TodoStatus, { label: string; cls: string }> = {
  todo: { label: "할 일", cls: "bg-slate-100 text-slate-500" },
  doing: { label: "진행 중", cls: "bg-amber-50 text-amber-600" },
  done: { label: "완료", cls: "bg-green-50 text-green-600" },
};

type ViewMode = "member" | "status";
const VIEW_KEY = "seouldaddys_todo_view";

export default function TodosPage() {
  const { rows: todos } = useTable<Todo>(TABLES.todos);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [view, setView] = useState<ViewMode>("member");

  // 마지막으로 보던 보기 방식 기억
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "status" || saved === "member") setView(saved);
  }, []);
  function changeView(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  }

  const me = getCurrentUser();

  // 팀원 명단: 등록된 멤버 + 할 일에 담당자로 등장하는 이름 + 나
  const names = Array.from(
    new Set([
      ...members.map((m) => m.name),
      ...todos.map((t) => t.assignee).filter(Boolean),
      me?.name || "",
    ])
  ).filter(Boolean);

  const emojiOf = (name: string) =>
    members.find((m) => m.name === name)?.emoji || (name === me?.name ? me?.emoji : "👤");

  async function add() {
    if (!title.trim()) return;
    await insertRow<Todo>(TABLES.todos, {
      title: title.trim(),
      status: "todo",
      assignee: assignee || me?.name || "",
      due,
    });
    setTitle("");
    setDue("");
  }

  async function moveTo(t: Todo, status: TodoStatus) {
    await updateRow<Todo>(TABLES.todos, t.id, { status });
  }

  async function toggleDone(t: Todo) {
    await updateRow<Todo>(TABLES.todos, t.id, { status: t.status === "done" ? "todo" : "done" });
  }

  async function remove(t: Todo) {
    if (confirm(`"${t.title}" 할 일을 삭제할까요?`)) await deleteRow(TABLES.todos, t.id);
  }

  function sortForList(list: Todo[]): Todo[] {
    // 미완료 먼저, 그 안에서는 진행 중 → 할 일, 완료는 맨 아래
    const order: Record<TodoStatus, number> = { doing: 0, todo: 1, done: 2 };
    return [...list].sort((a, b) => order[a.status] - order[b.status]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📋 할 일 보드</h1>
          <p className="text-sm text-slate-500 mt-1">
            {view === "member"
              ? "각자의 투두리스트가 한 화면에 모여 보입니다"
              : "화살표 버튼으로 단계를 옮길 수 있어요"}
          </p>
        </div>
        {/* 보기 전환 */}
        <div className="flex rounded-lg bg-slate-200 p-1 text-sm">
          <button
            onClick={() => changeView("member")}
            className={`rounded-md px-3 py-1 font-medium ${
              view === "member" ? "bg-white shadow-sm" : "text-slate-500"
            }`}
          >
            👥 팀원별
          </button>
          <button
            onClick={() => changeView("status")}
            className={`rounded-md px-3 py-1 font-medium ${
              view === "status" ? "bg-white shadow-sm" : "text-slate-500"
            }`}
          >
            📊 상태별
          </button>
        </div>
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

      {view === "member" ? (
        /* ---------- 팀원별 보기: 각자 리스트가 나란히 ---------- */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {names.map((name) => {
            const list = sortForList(todos.filter((t) => t.assignee === name));
            const open = list.filter((t) => t.status !== "done").length;
            return (
              <div key={name} className={`card p-4 ${name === me?.name ? "ring-2 ring-brand-500/30" : ""}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{emojiOf(name)}</span>
                  <h2 className="font-bold text-sm">
                    {name}
                    {name === me?.name && <span className="ml-1 text-xs text-brand-500">(나)</span>}
                  </h2>
                  <span className="ml-auto text-xs text-slate-400">
                    미완료 {open} / 전체 {list.length}
                  </span>
                </div>
                <div className="space-y-1.5 min-h-[60px]">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      className={`group flex items-start gap-2 rounded-lg border p-2.5 ${
                        t.status === "done"
                          ? "border-slate-100 bg-slate-50/50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={t.status === "done"}
                        onChange={() => toggleDone(t)}
                        className="mt-0.5 h-4 w-4 accent-green-600 cursor-pointer"
                        title={t.status === "done" ? "다시 열기" : "완료로 표시"}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm ${
                            t.status === "done" ? "line-through text-slate-400" : "font-medium"
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[t.status].cls}`}>
                            {STATUS_BADGE[t.status].label}
                          </span>
                          {t.status !== "done" && (
                            <button
                              onClick={() => moveTo(t, t.status === "todo" ? "doing" : "todo")}
                              className="text-[10px] text-slate-400 hover:text-amber-600"
                            >
                              {t.status === "todo" ? "▶ 진행 시작" : "◀ 대기로"}
                            </button>
                          )}
                          {t.due && <span className="text-[10px] text-slate-400">~{t.due.slice(5)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(t)}
                        className="text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-xs text-slate-300 text-center py-5">할 일 없음</p>
                  )}
                </div>
              </div>
            );
          })}
          {/* 담당자 미지정 */}
          {(() => {
            const unassigned = sortForList(todos.filter((t) => !t.assignee || !names.includes(t.assignee)));
            if (unassigned.length === 0) return null;
            return (
              <div className="card p-4 border-dashed">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">❓</span>
                  <h2 className="font-bold text-sm text-slate-500">담당자 미지정</h2>
                </div>
                <div className="space-y-1.5">
                  {unassigned.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <span className="flex-1 text-sm">{t.title}</span>
                      <select
                        className="text-xs border border-slate-200 rounded px-1 py-0.5"
                        value=""
                        onChange={(e) => e.target.value && updateRow<Todo>(TABLES.todos, t.id, { assignee: e.target.value })}
                      >
                        <option value="">담당 지정</option>
                        {names.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button onClick={() => remove(t)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* ---------- 상태별 보기 (칸반) ---------- */
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
                          {t.assignee && (
                            <span className="mr-2">
                              {emojiOf(t.assignee)} {t.assignee}
                            </span>
                          )}
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
      )}
    </div>
  );
}
