"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Repeat } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
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
  const [endDate, setEndDate] = useState(""); // 종료일 (여러 날 일정)
  const [editing, setEditing] = useState<CalEvent | null>(null); // 수정 중인 일정
  const [startDate, setStartDate] = useState(""); // 수정 시 시작일

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

  function resetForm() {
    setTitle("");
    setTime("");
    setMemo("");
    setRepeat("");
    setEndDate("");
    setStartDate("");
    setEditing(null);
  }

  function openEdit(e: CalEvent) {
    setEditing(e);
    setTitle(e.title);
    setTime(e.time);
    setMemo(e.memo);
    setRepeat(e.repeat || "");
    setEndDate(e.end_date || "");
    setStartDate(e.date);
  }

  async function save() {
    if (!title.trim()) return;
    const start = editing ? startDate : selected;
    if (endDate && endDate < start) {
      alert("종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }
    const isRange = Boolean(endDate && endDate > start);
    const data = {
      title: title.trim(),
      date: start,
      end_date: isRange ? endDate : "",
      time,
      memo: memo.trim(),
      repeat: isRange ? ("" as EventRepeat) : repeat, // 기간 일정은 반복 없음
    };
    if (editing) {
      await updateRow<CalEvent>(TABLES.events, editing.id, data);
      logActivity(`일정 "${data.title}" 수정`);
    } else {
      const user = getCurrentUser();
      await insertRow<CalEvent>(TABLES.events, { ...data, author: user?.name || "" });
      logActivity(
        `일정 "${data.title}" 등록 (${start}${isRange ? `~${endDate}` : ""}${
          repeat === "weekly" ? " · 매주" : repeat === "monthly" ? " · 매월" : ""
        })`
      );
    }
    resetForm();
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
            <div className="flex items-center gap-2">
              <h2 className="num section-title text-base">
                {year}년 {month + 1}월
              </h2>
              {(year !== now.getFullYear() || month !== now.getMonth() || selected !== today) && (
                <button
                  onClick={() => {
                    const n = new Date();
                    setYear(n.getFullYear());
                    setMonth(n.getMonth());
                    setSelected(today);
                  }}
                  className="rounded-full border px-2.5 h-6 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                  style={{ borderColor: "#bfdcc6" }}
                >
                  오늘
                </button>
              )}
            </div>
            <button onClick={() => move(1)} className="btn-ghost w-9 px-0" aria-label="다음 달">
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-stone-500 mb-2">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={"e" + i} />;
              const date = ymd(year, month, d);
              const dayEvents = byDate(date);
              const isToday = date === today;
              const isSelected = date === selected;
              const weekday = i % 7;
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`min-h-[46px] md:min-h-[64px] rounded-lg p-0.5 md:p-1.5 border text-sm transition-colors ${
                    isSelected
                      ? "border-brand-500 bg-brand-50"
                      : "border-transparent hover:bg-stone-50"
                  }`}
                >
                  {/* 날짜 숫자: 모바일 가운데, PC 왼쪽 — 줄이 항상 맞도록 높이 고정 */}
                  <div className="flex justify-center md:justify-start">
                    <span
                      className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-brand-500 text-white"
                          : weekday === 0
                          ? "text-red-500"
                          : weekday === 6
                          ? "text-blue-500"
                          : ""
                      }`}
                    >
                      {d}
                    </span>
                  </div>
                  {/* 모바일: 일정을 점으로 표시 */}
                  <div className="flex h-2 items-center justify-center gap-0.5 md:hidden">
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <span key={e.id + j} className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    ))}
                  </div>
                  {/* PC: 일정 제목 표시 */}
                  <div className="hidden md:block space-y-0.5 mt-0.5 text-left">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="truncate rounded bg-brand-100 px-1 text-[10px] text-brand-700">
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-stone-400">+{dayEvents.length - 2}</div>
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
            <p className="text-sm text-stone-400 py-3">일정이 없습니다.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {selectedEvents.map((e) => (
                <li key={e.id} className="rounded-lg bg-stone-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1.5 flex-wrap">
                      {e.title}
                      {(e.repeat === "weekly" || e.repeat === "monthly") && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                          <Repeat size={10} strokeWidth={2} />
                          {e.repeat === "weekly" ? "매주" : "매월"}
                        </span>
                      )}
                      {e.end_date && e.end_date > e.date && (
                        <span className="num inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                          {e.date.slice(5).replace("-", "/")}~{e.end_date.slice(5).replace("-", "/")}
                        </span>
                      )}
                    </span>
                    <span className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-xs font-medium text-stone-400 hover:text-brand-600 transition-colors"
                      >
                        수정
                      </button>
                      {isAdmin && (
                        <button onClick={() => remove(e)} className="text-xs text-stone-300 hover:text-red-500">
                          삭제
                        </button>
                      )}
                    </span>
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
                  {e.memo && <p className="text-xs text-stone-500 mt-1">{e.memo}</p>}
                </li>
              ))}
            </ul>
          )}

          <div
            className="border-t pt-4 space-y-2 rounded-b-xl"
            style={{ borderColor: "var(--border-soft)", background: editing ? "#f7faf7" : undefined }}
          >
            <label className="label">
              {editing ? `"${editing.title}" 일정 수정` : "새 일정 추가"}
            </label>
            <input
              className="input"
              placeholder="일정 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            {editing && (
              <div>
                <label className="label">시작일</label>
                <input
                  className="input num"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            )}
            <input className="input num" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <div>
              <label className="label">종료일 (전시회처럼 여러 날이면 선택)</label>
              <input
                className="input num"
                type="date"
                min={editing ? startDate : selected}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as EventRepeat)}
              disabled={Boolean(endDate && endDate > (editing ? startDate : selected))}
            >
              <option value="">반복 안 함</option>
              <option value="weekly">매주 (같은 요일)</option>
              <option value="monthly">매월 (같은 날짜)</option>
            </select>
            <input className="input" placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1 justify-center">
                {editing ? "수정 저장" : "추가"}
              </button>
              {editing && (
                <button onClick={resetForm} className="btn-ghost">
                  취소
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
