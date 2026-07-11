"use client";

import Link from "next/link";
import { useTable, todayStr } from "@/lib/useTable";
import { getCurrentUser } from "@/lib/db";
import { TABLES, type Todo, type CalEvent, type Notice, type Product } from "@/lib/types";

export default function Dashboard() {
  const user = getCurrentUser();
  const { rows: todos } = useTable<Todo>(TABLES.todos);
  const { rows: events } = useTable<CalEvent>(TABLES.events);
  const { rows: notices } = useTable<Notice>(TABLES.notices);
  const { rows: products } = useTable<Product>(TABLES.products);

  const today = todayStr();
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);
  const myTodos = todos.filter((t) => t.status !== "done" && t.assignee === user?.name);
  const openTodos = todos.filter((t) => t.status !== "done");
  const pinnedNotices = [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {user?.emoji} {user?.name}님, 안녕하세요!
        </h1>
        <p className="text-sm text-stone-500 mt-1.5">오늘도 화이팅입니다 💪</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/todos", icon: "📋", chip: "bg-brand-50", value: myTodos.length, label: "내 할 일 (미완료)" },
          { href: "/calendar", icon: "📅", chip: "bg-sky-50", value: events.filter((e) => e.date === today).length, label: "오늘 일정" },
          { href: "/products", icon: "📦", chip: "bg-amber-50", value: products.length, label: "등록 상품" },
          { href: "/todos", icon: "🔥", chip: "bg-rose-50", value: openTodos.length, label: "팀 전체 할 일" },
        ].map((c, i) => (
          <Link key={i} href={c.href} className="card p-4 hover:shadow-lift hover:-translate-y-0.5 transition-all">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${c.chip}`}>
              {c.icon}
            </div>
            <div className="text-2xl font-extrabold mt-2 tracking-tight">{c.value}</div>
            <div className="text-xs text-stone-500 font-medium">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 다가오는 일정 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">📅 다가오는 일정</h2>
            <Link href="/calendar" className="text-xs text-brand-500 hover:underline">
              전체 보기
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">예정된 일정이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      e.date === today ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"
                    }`}
                  >
                    {e.date === today ? "오늘" : e.date.slice(5).replace("-", "/")}
                  </span>
                  {e.time && <span className="text-slate-400 text-xs">{e.time}</span>}
                  <span className="flex-1 truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 공지 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">📢 공지사항</h2>
            <Link href="/notices" className="text-xs text-brand-500 hover:underline">
              전체 보기
            </Link>
          </div>
          {pinnedNotices.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">등록된 공지가 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {pinnedNotices.map((n) => (
                <li key={n.id} className="text-sm flex items-center gap-2">
                  {n.pinned && <span className="text-xs">📌</span>}
                  <span className="flex-1 truncate font-medium">{n.title}</span>
                  <span className="text-xs text-slate-400">{n.author}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 내 할 일 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">📋 내 할 일</h2>
          <Link href="/todos" className="text-xs text-brand-500 hover:underline">
            보드로 이동
          </Link>
        </div>
        {myTodos.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            미완료 할 일이 없습니다. 수고하셨어요! 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {myTodos.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    t.status === "doing" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.status === "doing" ? "진행 중" : "할 일"}
                </span>
                <span className="flex-1 truncate">{t.title}</span>
                {t.due && <span className="text-xs text-slate-400">~{t.due.slice(5)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
