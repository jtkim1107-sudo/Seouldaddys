"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Repeat } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { insertRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { useAdmin } from "@/lib/useAdmin";
import { TABLES, type CalEvent, type EventRepeat } from "@/lib/types";
import { occursOn } from "@/lib/events";

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const { rows: events } = useTable<CalEvent>(TABLES.events);
  const { isAdmin } = useAdmin();
  const today = todayStr();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [selected, setSelected] = useState(today);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [memo, setMemo] = useState("");
  const [repeat, setRepeat] = useState<EventRepeat>("");

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function move(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const byDate = (date: string) =>
    events.filter((e) => occursOn(e, date)).sort((a, b) => a.time.localeCompare(b.time));

  const selectedEvents = byDate(selected);

  async function add() {
    if (!title.trim()) return;
    const user = getCurrentUser();
    await insertRow<CalEvent>(TABLES.events, {
      title: title.trim(),
      date: selected,
      time,
      memo: memo.trim(),
      author: user?.name || "",
      repeat,
    });
    logActivity(
      `일정 "${title.trim()}" 등록 (${selected}${repeat === "weekly" ? " · 매주" : repeat === "monthly" ? " · 매월" : ""})`
    );
    setTitle("");
    setTime("");
    setMemo("");
    setRepeat("");
  }

  async function remove(e: CalEvent) {
    const isRepeat = e.repeat === "weekly" || e.repeat === "monthly";
    const msg = isRepeat
      ? `"${e.title}" 반복 일정을 삭제할까요? 모든 반복 날짜에서 사라집니다.`
      : `"${e.title}" 일정을 삭제할까요?`;
    if (!confirm(msg)) return;
    await deleteRow(TABLES.events, e.id);
    logActivity(`일정 "${e.title}" 삭제`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">팀 일정</h1>
        <p className="text-sm text-stone-500 mt-1">날짜를 누르면 그날 일정을 보고 등록할 수 있어요.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 달력 */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => move(-1)} className="btn-ghost w-9 px-0" aria-label="이전 달">
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <h2 className="num section-title text-base">
              {year}년 {month + 1}월
            </h2>
            <button onClick={() => move(1)} className="btn-ghost w-9 px-0" aria-label="다음 달">
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={"e" + i} />;
              const date = ymd(year, month, d);
              const dayEvents = byDate(date);
              const isToday = date === today;
              const isSelected = date === selected;
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`min-h-[64px] rounded-lg p-1.5 text-left border text-sm transition-colors ${
                    isSelected
                      ? "border-brand-500 bg-brand-50"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday ? "bg-brand-500 text-white" : i % 7 === 0 ? "text-red-500" : ""
                    }`}
                  >
                    {d}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="truncate rounded bg-brand-100 px-1 text-[10px] text-brand-700">
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-slate-400">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택한 날짜 상세 */}
        <div className="card p-5">
          <h2 className="section-title mb-3">
            <span className="num">{selected.slice(5).replace("-", "월 ")}일</span> 일정
            {selected === today && (
              <span className="ml-2 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                오늘
              </span>
            )}
          </h2>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-3">일정이 없습니다</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {selectedEvents.map((e) => (
                <li key={e.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1.5">
                      {e.title}
                      {(e.repeat === "weekly" || e.repeat === "monthly") && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                          <Repeat size={10} strokeWidth={2} />
                          {e.repeat === "weekly" ? "매주" : "매월"}
                        </span>
                      )}
                    </span>
                    {isAdmin && (
                      <button onClick={() => remove(e)} className="text-xs text-stone-300 hover:text-red-500">
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                    {e.time && (
                      <span className="num inline-flex items-center gap-1">
                        <Clock size={12} strokeWidth={1.75} />
                        {e.time}
                      </span>
                    )}
                    <span>{e.author}</span>
                  </div>
                  {e.memo && <p className="text-xs text-slate-500 mt-1">{e.memo}</p>}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <label className="label">새 일정 추가</label>
            <input
              className="input"
              placeholder="일정 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <input className="input num" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <select className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as EventRepeat)}>
              <option value="">반복 안 함</option>
              <option value="weekly">매주 (같은 요일)</option>
              <option value="monthly">매월 (같은 날짜)</option>
            </select>
            <input className="input" placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />
            <button onClick={add} className="btn-primary w-full justify-center">
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
