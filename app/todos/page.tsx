"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { TABLES, type Todo, type TodoStatus, type Member } from "@/lib/types";
import { initialOf } from "@/components/Shell";

const COLUMNS: { status: TodoStatus; label: string; color: string }[] = [
  { status: "todo", label: "할 일", color: "bg-stone-400" },
  { status: "doing", label: "진행 중", color: "bg-amber-500" },
  { status: "done", label: "완료", color: "bg-green-500" },
];

const STATUS_BADGE: Record<TodoStatus, { label: string; cls: string }> = {
  todo: { label: "대기", cls: "bg-stone-100 text-stone-500" },
  doing: { label: "진행 중", cls: "bg-amber-100 text-amber-700" },
  done: { label: "완료", cls: "bg-green-100 text-green-700" },
};

type ViewMode = "member" | "status";
const VIEW_KEY = "seouldaddys_todo_view";

export default function TodosPage() {
  const { rows: todos } = useTable<Todo>(TABLES.todos);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
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

  // 팀원 명단: 등록된 멤버 + 미완료 할 일의 담당자 + 나
  // (내보낸 팀원은 완료된 할 일만 남아 있으면 보드에 나타나지 않는다)
  const names = Array.from(
    new Set([
      ...members.filter((m) => m.approved !== false).map((m) => m.name),
      ...todos.filter((t) => t.status !== "done").map((t) => t.assignee).filter(Boolean),
      me?.name || "",
    ])
  ).filter(Boolean);

  async function add() {
    if (!title.trim()) return;
    const who = assignee || me?.name || "";
    await insertRow<Todo>(TABLES.todos, {
      title: title.trim(),
      status: "todo",
      assignee: who,
      due,
      memo: desc.trim(),
    });
    logActivity(`할 일 "${title.trim()}" 등록 (담당: ${who || "미지정"})`);
    setTitle("");
    setDesc("");
    setDue("");
  }

  // 설명 수정 (간단 입력창)
  async function editMemo(t: Todo) {
    const v = prompt(`"${t.title}" 설명을 입력해주세요.`, t.memo || "");
    if (v === null) return;
    await updateRow<Todo>(TABLES.todos, t.id, { memo: v.trim() });
  }

  async function moveTo(t: Todo, status: TodoStatus) {
    await updateRow<Todo>(TABLES.todos, t.id, { status });
  }

  async function toggleDone(t: Todo) {
    const done = t.status !== "done";
    await updateRow<Todo>(TABLES.todos, t.id, { status: done ? "done" : "todo" });
    if (done) logActivity(`할 일 "${t.title}" 완료`);
  }

  async function remove(t: Todo) {
    if (confirm(`"${t.title}" 할 일을 삭제할까요?`)) await deleteRow(TABLES.todos, t.id);
  }

  function sortForList(list: Todo[]): Todo[] {
    // 미완료 먼저: 진행 중 → 대기, 완료는 맨 아래
    const order: Record<TodoStatus, number> = { doing: 0, todo: 1, done: 2 };
    return [...list].sort((a, b) => order[a.status] - order[b.status]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">할 일 보드</h1>
          <p className="text-sm text-stone-500 mt-1">
            {view === "member"
              ? "각자의 투두리스트가 한 화면에 모여 보입니다."
              : "화살표 버튼으로 단계를 옮길 수 있어요."}
          </p>
        </div>
        {/* 보기 전환 */}
        <div className="flex rounded-[10px] bg-stone-200/80 p-0.5 text-sm">
          {(
            [
              { key: "member", label: "팀원별" },
              { key: "status", label: "상태별" },
            ] as { key: ViewMode; label: string }[]
          ).map((v) => (
            <button
              key={v.key}
              onClick={() => changeView(v.key)}
              className={`rounded-lg px-3 h-8 font-semibold transition-colors duration-[120ms] ${
                view === v.key ? "bg-white shadow-sm" : "text-stone-500"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 추가 폼 */}
      <div className="card p-3.5 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="새 할 일 입력"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <select className="input w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">담당: 나</option>
            {names
              .filter((n) => n !== me?.name)
              .map((n) => (
                <option key={n} value={n}>
                  담당: {n}
                </option>
              ))}
          </select>
          <input className="input w-auto num" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <button onClick={add} className="btn-primary">
            <Plus size={16} strokeWidth={2} />
            추가
          </button>
        </div>
        <input
          className="input"
          placeholder="설명 (선택) — 상세 내용, 참고 링크 등"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
      </div>

      {view === "member" ? (
        /* ---------- 팀원별 보기 ---------- */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {names.map((name) => {
            const list = sortForList(todos.filter((t) => t.assignee === name));
            const open = list.filter((t) => t.status !== "done").length;
            const mine = name === me?.name;
            return (
              <div key={name} className="card p-4" style={mine ? { borderColor: "#bfdcc6" } : undefined}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`avatar h-7 w-7 text-xs ${mine ? "bg-brand-50 text-brand-700" : ""}`}>
                    {initialOf(name)}
                  </span>
                  <h2 className="text-sm font-bold">
                    {name}
                    {mine && <span className="ml-1 text-xs font-semibold text-brand-600">나</span>}
                  </h2>
                  <span className="num ml-auto text-xs text-stone-400">
                    미완료 {open} / 전체 {list.length}
                  </span>
                </div>
                <div className="space-y-1.5 min-h-[60px]">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      className="group flex items-start gap-2.5 rounded-[10px] border p-2.5 transition-colors duration-[120ms]"
                      style={{
                        borderColor: "var(--border-soft)",
                        background: t.status === "done" ? "var(--bg-hover)" : "var(--bg-card)",
                      }}
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
                            t.status === "done" ? "line-through text-stone-400" : "font-medium"
                          }`}
                        >
                          {t.title}
                        </div>
                        {t.memo && (
                          <div className="text-xs text-stone-400 mt-0.5 whitespace-pre-wrap break-words">
                            {t.memo}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[t.status].cls}`}
                          >
                            {STATUS_BADGE[t.status].label}
                          </span>
                          {t.status !== "done" && (
                            <button
                              onClick={() => moveTo(t, t.status === "todo" ? "doing" : "todo")}
                              className="text-[11px] font-medium text-stone-400 hover:text-amber-600 transition-colors"
                            >
                              {t.status === "todo" ? "진행 시작" : "대기로"}
                            </button>
                          )}
                          <button
                            onClick={() => editMemo(t)}
                            className="text-[11px] font-medium text-stone-400 hover:text-brand-600 transition-colors"
                          >
                            {t.memo ? "설명 수정" : "설명 추가"}
                          </button>
                          {t.due && <span className="num text-[11px] text-stone-400">~{t.due.slice(5)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(t)}
                        className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-xs text-stone-300 text-center py-5">할 일 없음</p>
                  )}
                </div>
              </div>
            );
          })}
          {/* 담당자 미지정 */}
          {(() => {
            const unassigned = sortForList(
              todos.filter(
                (t) => (!t.assignee || !names.includes(t.assignee)) && t.status !== "done"
              )
            );
            if (unassigned.length === 0) return null;
            return (
              <div className="card p-4 border-dashed">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-stone-500">담당자 미지정</h2>
                </div>
                <div className="space-y-1.5">
                  {unassigned.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-[10px] border p-2.5"
                      style={{ borderColor: "var(--border-soft)" }}
                    >
                      <span className="flex-1 text-sm">{t.title}</span>
                      <select
                        className="text-xs border rounded-md px-1 py-0.5"
                        style={{ borderColor: "var(--border-1)" }}
                        value=""
                        onChange={(e) =>
                          e.target.value && updateRow<Todo>(TABLES.todos, t.id, { assignee: e.target.value })
                        }
                      >
                        <option value="">담당 지정</option>
                        {names.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => remove(t)} className="text-stone-300 hover:text-red-500" aria-label="삭제">
                        <X size={14} />
                      </button>
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
                  <span className={`h-2 w-2 rounded-full ${col.color}`} />
                  <h2 className="text-sm font-bold">{col.label}</h2>
                  <span className="num text-xs text-stone-400">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-[10px] border p-3"
                      style={{ borderColor: "var(--border-soft)", background: "var(--bg-hover)" }}
                    >
                      <div
                        className={`text-sm font-medium ${
                          t.status === "done" ? "line-through text-stone-400" : ""
                        }`}
                      >
                        {t.title}
                      </div>
                      {t.memo && (
                        <div className="text-xs text-stone-400 mt-0.5 whitespace-pre-wrap break-words">
                          {t.memo}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                          {t.assignee && (
                            <>
                              <span className="avatar h-5 w-5 text-[10px]">{initialOf(t.assignee)}</span>
                              <span>{t.assignee}</span>
                            </>
                          )}
                          {t.due && <span className="num">~{t.due.slice(5)}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {ci > 0 && (
                            <button
                              onClick={() => moveTo(t, COLUMNS[ci - 1].status)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white border text-stone-500 hover:bg-stone-50"
                              style={{ borderColor: "var(--border-1)" }}
                              title="이전 단계로"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}
                          {ci < COLUMNS.length - 1 && (
                            <button
                              onClick={() => moveTo(t, COLUMNS[ci + 1].status)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white border text-stone-500 hover:bg-stone-50"
                              style={{ borderColor: "var(--border-1)" }}
                              title="다음 단계로"
                            >
                              <ChevronRight size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => remove(t)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-stone-300 hover:text-red-500"
                            aria-label="삭제"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-stone-300 text-center py-6">비어 있음</p>
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
