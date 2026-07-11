"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useTable, formatDateTime } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { TABLES, type Poll } from "@/lib/types";

export default function PollsPage() {
  const { rows: polls, loading } = useTable<Poll>(TABLES.polls);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const me = getCurrentUser();

  async function create() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      alert("질문과 선택지를 2개 이상 입력해주세요.");
      return;
    }
    await insertRow<Poll>(TABLES.polls, {
      question: q,
      options: opts,
      votes: {},
      closed: false,
      author: me?.name || "",
    });
    logActivity(`투표 "${q}" 시작`);
    setQuestion("");
    setOptions(["", ""]);
    setShowForm(false);
  }

  async function vote(p: Poll, idx: number) {
    if (p.closed || !me) return;
    const votes = { ...(p.votes || {}), [me.name]: idx };
    await updateRow<Poll>(TABLES.polls, p.id, { votes });
  }

  async function toggleClose(p: Poll) {
    await updateRow<Poll>(TABLES.polls, p.id, { closed: !p.closed });
    if (!p.closed) logActivity(`투표 "${p.question}" 마감`);
  }

  async function remove(p: Poll) {
    if (!confirm(`"${p.question}" 투표를 삭제할까요?`)) return;
    await deleteRow(TABLES.polls, p.id);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">투표</h1>
          <p className="text-sm text-stone-500 mt-1">팀 의견이 필요할 때 간단하게 정해보세요.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          투표 만들기
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3" style={{ borderColor: "#ffab78" }}>
          <div>
            <label className="label">질문</label>
            <input
              className="input"
              placeholder="예: 다음 신상품 뭐로 할까요?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="label">선택지</label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input"
                    placeholder={`선택지 ${i + 1}`}
                    value={o}
                    onChange={(e) => setOptions(options.map((v, j) => (j === i ? e.target.value : v)))}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="btn-ghost w-9 px-0 flex-shrink-0"
                      aria-label="선택지 삭제"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button onClick={() => setOptions([...options, ""])} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
                선택지 추가
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn-primary">시작</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-stone-400 py-10">불러오는 중...</p>
      ) : polls.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          진행 중인 투표가 없습니다. 첫 투표를 만들어보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((p) => {
            const votes = p.votes || {};
            const total = Object.keys(votes).length;
            const myVote = me ? votes[me.name] : undefined;
            const counts = p.options.map((_, i) => Object.values(votes).filter((v) => v === i).length);
            return (
              <div key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="section-title">{p.question}</h2>
                    <div className="text-xs text-stone-400 mt-1">
                      {p.author} · <span className="num">{formatDateTime(p.created_at)}</span> ·{" "}
                      <span className="num">{total}</span>명 참여
                      {p.closed && (
                        <span className="ml-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">
                          마감됨
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2.5 flex-shrink-0 text-xs font-medium">
                    <button onClick={() => toggleClose(p)} className="text-stone-400 hover:text-brand-600 transition-colors">
                      {p.closed ? "다시 열기" : "마감"}
                    </button>
                    <button onClick={() => remove(p)} className="text-stone-400 hover:text-red-500 transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {p.options.map((opt, i) => {
                    const pct = total ? Math.round((counts[i] / total) * 100) : 0;
                    const chosen = myVote === i;
                    return (
                      <button
                        key={i}
                        onClick={() => vote(p, i)}
                        disabled={p.closed}
                        className="relative w-full overflow-hidden rounded-[10px] border p-0 text-left transition-colors duration-[120ms] disabled:cursor-default"
                        style={{ borderColor: chosen ? "#f4691f" : "var(--border-1)" }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-brand-50"
                          style={{ width: `${pct}%`, transition: "width 200ms var(--ease-out)" }}
                        />
                        <div className="relative flex items-center justify-between px-3.5 py-2.5 text-sm">
                          <span className="flex items-center gap-2 font-medium">
                            {chosen && <Check size={15} strokeWidth={2.5} className="text-brand-600" />}
                            {opt}
                          </span>
                          <span className="num text-xs text-stone-500">
                            {counts[i]}표 · {pct}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!p.closed && (
                  <p className="text-xs text-stone-400 mt-2">
                    선택지를 누르면 투표됩니다. 다시 누르면 변경돼요.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
