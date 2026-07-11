"use client";

import { useState } from "react";
import { useTable, formatDateTime } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser } from "@/lib/db";
import { TABLES, type Notice } from "@/lib/types";

export default function NoticesPage() {
  const { rows: notices, loading } = useTable<Notice>(TABLES.notices);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const sorted = [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  async function add() {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }
    const user = getCurrentUser();
    await insertRow<Notice>(TABLES.notices, {
      title: title.trim(),
      content: content.trim(),
      pinned: false,
      author: user?.name || "",
    });
    setTitle("");
    setContent("");
    setShowForm(false);
  }

  async function togglePin(n: Notice) {
    await updateRow<Notice>(TABLES.notices, n.id, { pinned: !n.pinned });
  }

  async function remove(n: Notice) {
    if (confirm(`"${n.title}" 공지를 삭제할까요?`)) await deleteRow(TABLES.notices, n.id);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📢 공지사항</h1>
          <p className="text-sm text-slate-500 mt-1">중요한 공지는 📌 고정해두세요</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + 공지 작성
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-brand-500 border-2 space-y-3">
          <input
            className="input"
            placeholder="공지 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[100px]"
            placeholder="내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={add} className="btn-primary">등록</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-400 py-10">불러오는 중...</p>
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          등록된 공지가 없습니다. 첫 공지를 작성해보세요!
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((n) => (
            <div key={n.id} className={`card p-5 ${n.pinned ? "border-amber-300 bg-amber-50/50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold">
                  {n.pinned && <span className="mr-1">📌</span>}
                  {n.title}
                </h2>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => togglePin(n)} className="text-xs text-slate-400 hover:text-amber-500">
                    {n.pinned ? "고정 해제" : "📌 고정"}
                  </button>
                  <button onClick={() => remove(n)} className="text-xs text-slate-400 hover:text-red-500">
                    삭제
                  </button>
                </div>
              </div>
              {n.content && (
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{n.content}</p>
              )}
              <div className="text-xs text-slate-400 mt-3">
                {n.author} · {formatDateTime(n.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
