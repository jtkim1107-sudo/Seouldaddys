"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { useAdmin } from "@/lib/useAdmin";
import { TABLES, type Minute, type Member } from "@/lib/types";

export default function MinutesPage() {
  const { rows: minutes, loading } = useTable<Minute>(TABLES.minutes);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const { isAdmin } = useAdmin();
  const me = getCurrentUser();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Minute | null>(null);
  const [openId, setOpenId] = useState<string | null>(null); // 펼쳐진 회의록
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [attendees, setAttendees] = useState("");
  const [content, setContent] = useState("");

  const sorted = [...minutes].sort((a, b) => b.date.localeCompare(a.date));
  const allNames = members.filter((m) => m.approved !== false).map((m) => m.name).join(", ");

  function openNew() {
    setEditing(null);
    setTitle("");
    setDate(todayStr());
    setAttendees(allNames || me?.name || "");
    setContent("");
    setShowForm(true);
  }

  function openEdit(m: Minute) {
    setEditing(m);
    setTitle(m.title);
    setDate(m.date);
    setAttendees(m.attendees);
    setContent(m.content);
    setShowForm(true);
  }

  async function save() {
    if (!title.trim()) {
      alert("회의 제목을 입력해주세요.");
      return;
    }
    const data = {
      title: title.trim(),
      date,
      attendees: attendees.trim(),
      content: content.trim(),
      updated_by: me?.name || "",
    };
    if (editing) {
      await updateRow<Minute>(TABLES.minutes, editing.id, data);
      logActivity(`회의록 "${data.title}" 수정`);
    } else {
      await insertRow<Minute>(TABLES.minutes, { ...data, author: me?.name || "" });
      logActivity(`회의록 "${data.title}" 작성`);
    }
    setShowForm(false);
  }

  async function remove(m: Minute) {
    if (!confirm(`"${m.title}" 회의록을 삭제할까요?`)) return;
    await deleteRow(TABLES.minutes, m.id);
    logActivity(`회의록 "${m.title}" 삭제`);
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">회의록</h1>
          <p className="text-sm text-stone-500 mt-1">회의 내용과 결정사항을 기록으로 남기세요.</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          회의록 작성
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3" style={{ borderColor: "#8fbf9c" }}>
          <h2 className="section-title">{editing ? "회의록 수정" : "새 회의록"}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">회의 제목 *</label>
              <input
                className="input"
                placeholder="예: 7월 2주차 주간회의"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">회의 날짜</label>
              <input className="input num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">참석자</label>
              <input
                className="input"
                placeholder="예: 김선우, 박정호, 이재민"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">내용 · 결정사항</label>
              <textarea
                className="input min-h-[200px] leading-relaxed"
                placeholder={"- 논의한 내용\n- 결정된 사항\n- 다음까지 할 일 (담당자)"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary">{editing ? "수정 저장" : "저장"}</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-stone-400 py-10">불러오는 중...</p>
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          아직 회의록이 없습니다. 첫 회의록을 작성해보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const open = openId === m.id;
            return (
              <div key={m.id} className="card">
                <button
                  onClick={() => setOpenId(open ? null : m.id)}
                  className="w-full flex items-center gap-3 p-5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="section-title truncate">{m.title}</div>
                    <div className="text-xs text-stone-400 mt-1">
                      <span className="num">{m.date}</span>
                      {m.attendees && <> · 참석: {m.attendees}</>}
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp size={18} strokeWidth={1.75} className="text-stone-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={18} strokeWidth={1.75} className="text-stone-400 flex-shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="px-5 pb-5 border-t pt-4" style={{ borderColor: "var(--border-soft)" }}>
                    {m.content ? (
                      <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      <p className="text-sm text-stone-400">내용이 없습니다.</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-stone-400">
                        작성: {m.author}
                        {m.updated_by && m.updated_by !== m.author && <> · 마지막 수정: {m.updated_by}</>}
                      </span>
                      <span className="flex gap-2.5 text-xs font-medium">
                        <button onClick={() => openEdit(m)} className="text-stone-400 hover:text-brand-600 transition-colors">
                          수정
                        </button>
                        {isAdmin && (
                          <button onClick={() => remove(m)} className="text-stone-400 hover:text-red-500 transition-colors">
                            삭제
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
