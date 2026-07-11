"use client";

import Link from "next/link";
import { Bell, Calendar, Flame, ListTodo, Package } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { getCurrentUser } from "@/lib/db";
import { upcomingOccurrences } from "@/lib/events";
import { TABLES, type Todo, type CalEvent, type Notice, type Product } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  todo: { label: "대기", cls: "bg-stone-100 text-stone-500" },
  doing: { label: "진행 중", cls: "bg-amber-100 text-amber-700" },
};

export default function Dashboard() {
  const user = getCurrentUser();
  const { rows: todos } = useTable<Todo>(TABLES.todos);
  const { rows: events } = useTable<CalEvent>(TABLES.events);
  const { rows: notices } = useTable<Notice>(TABLES.notices);
  const { rows: products } = useTable<Product>(TABLES.products);

  const today = todayStr();
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;

  const upcoming = upcomingOccurrences(events, today, 14).slice(0, 5);
  const myTodos = todos.filter((t) => t.status !== "done" && t.assignee === user?.name);
  const openTodos = todos.filter((t) => t.status !== "done");
  const pinnedNotices = [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 3);

  // 알림: 지연된 내 할 일, 오늘 마감, 최근 48시간 내 새 공지
  const overdue = myTodos.filter((t) => t.due && t.due < today);
  const dueToday = myTodos.filter((t) => t.due === today);
  const recentNotices = notices.filter(
    (n) => Date.now() - new Date(n.created_at).getTime() < 48 * 3600 * 1000 && n.author !== user?.name
  );
  const lowStock = products.filter((p) => (p.stock || 0) <= 5);
  const alerts: { tone: "red" | "amber" | "blue"; text: string; href: string }[] = [
    ...overdue.map((t) => ({ tone: "red" as const, text: `기한이 지났어요: ${t.title} (~${t.due.slice(5)})`, href: "/todos" })),
    ...dueToday.map((t) => ({ tone: "amber" as const, text: `오늘 마감: ${t.title}`, href: "/todos" })),
    ...lowStock.map((p) => ({ tone: "amber" as const, text: `재입고 필요: ${p.name} (${p.stock || 0}개 남음)`, href: "/stock" })),
    ...recentNotices.map((n) => ({ tone: "blue" as const, text: `새 공지: ${n.title} (${n.author})`, href: "/notices" })),
  ];
  const ALERT_TONE = {
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };

  const stats = [
    { href: "/todos", Icon: ListTodo, chip: "bg-brand-50 text-brand-600", value: myTodos.length, label: "내 할 일 (미완료)" },
    { href: "/calendar", Icon: Calendar, chip: "bg-blue-50 text-blue-600", value: events.filter((e) => e.date === today).length, label: "오늘 일정" },
    { href: "/products", Icon: Package, chip: "bg-amber-50 text-amber-600", value: products.length, label: "등록 상품" },
    { href: "/todos", Icon: Flame, chip: "bg-rose-50 text-rose-600", value: openTodos.length, label: "팀 전체 할 일" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">{user?.name}님, 안녕하세요.</h1>
        <p className="text-sm text-stone-500 mt-1">{dateLabel}</p>
      </div>

      {/* 알림 */}
      {alerts.length > 0 && (
        <div className="card p-4">
          <h2 className="section-title flex items-center gap-1.5 mb-2.5">
            <Bell size={15} strokeWidth={1.75} className="text-brand-500" />
            알림 <span className="num text-xs font-semibold text-stone-400">{alerts.length}</span>
          </h2>
          <div className="space-y-1.5">
            {alerts.slice(0, 5).map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className={`block rounded-[10px] px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 ${ALERT_TONE[a.tone]}`}
              >
                {a.text}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((c, i) => (
          <Link
            key={i}
            href={c.href}
            className="card p-4 transition-colors duration-[120ms] hover:bg-[var(--bg-hover)]"
          >
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] ${c.chip}`}>
              <c.Icon size={18} strokeWidth={1.75} />
            </div>
            <div className="num text-[26px] font-extrabold mt-2 tracking-[-0.5px]">{c.value}</div>
            <div className="text-xs font-medium text-stone-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 다가오는 일정 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">다가오는 일정</h2>
            <Link href="/calendar" className="text-xs font-medium text-brand-600 hover:underline">
              전체 보기
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">예정된 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(({ event: e, date }, i) => (
                <li key={e.id + date + i} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`num rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      date === today ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700"
                    }`}
                  >
                    {date === today ? "오늘" : date.slice(5).replace("-", "/")}
                  </span>
                  {e.time && <span className="num text-xs text-stone-400">{e.time}</span>}
                  <span className="flex-1 truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 공지 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">공지사항</h2>
            <Link href="/notices" className="text-xs font-medium text-brand-600 hover:underline">
              전체 보기
            </Link>
          </div>
          {pinnedNotices.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">등록된 공지가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {pinnedNotices.map((n) => (
                <li key={n.id} className="text-sm flex items-center gap-2">
                  {n.pinned && (
                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                      고정
                    </span>
                  )}
                  <span className="flex-1 truncate font-medium">{n.title}</span>
                  <span className="text-xs text-stone-400">{n.author}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 내 할 일 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">내 할 일</h2>
          <Link href="/todos" className="text-xs font-medium text-brand-600 hover:underline">
            보드로 이동
          </Link>
        </div>
        {myTodos.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">미완료 할 일이 없습니다. 수고하셨어요.</p>
        ) : (
          <ul className="space-y-2">
            {myTodos.slice(0, 6).map((t) => {
              const badge = STATUS_BADGE[t.status] || STATUS_BADGE.todo;
              return (
                <li key={t.id} className="flex items-center gap-2.5 text-sm">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.due && <span className="num text-xs text-stone-400">~{t.due.slice(5)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
