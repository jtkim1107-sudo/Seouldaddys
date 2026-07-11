"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getCurrentUser,
  setCurrentUser,
  subscribeUser,
  ensureMember,
  isSharedMode,
  configError,
  type CurrentUser,
} from "@/lib/db";

function ConfigErrorBanner() {
  if (!configError) return null;
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-700">
      ⚠️ {configError}
    </div>
  );
}

const NAV = [
  { href: "/", label: "대시보드", icon: "📊" },
  { href: "/products", label: "상품마스터", icon: "📦" },
  { href: "/files", label: "자료실", icon: "📁" },
  { href: "/calendar", label: "일정", icon: "📅" },
  { href: "/todos", label: "할 일", icon: "📋" },
  { href: "/chat", label: "팀 채팅", icon: "💬" },
  { href: "/notices", label: "공지사항", icon: "📢" },
];

const EMOJIS = ["👨", "🧔", "👨‍🦱", "😎", "🐯", "🦁", "🐻", "⚡"];

// 배포 확인용 버전 (업데이트 때마다 올림)
export const APP_VERSION = "v2.0";

function LoginScreen() {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  function enter() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCurrentUser({ name: trimmed, emoji });
    ensureMember(trimmed, emoji); // 팀원 명단에 자동 등록
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-brand-50 via-[#faf8f5] to-[#faf8f5]">
      <div className="card w-full max-w-sm p-8 shadow-lift">
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-amber-500 text-3xl shadow-lg shadow-brand-500/30 mb-3">
            👨‍👧‍👦
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">서울아빠들</h1>
          <p className="text-sm text-stone-500 mt-1">
            팀 업무 공간에 오신 걸 환영합니다 <span className="text-stone-300">{APP_VERSION}</span>
          </p>
        </div>
        <label className="label">이름 (팀원들에게 보이는 이름)</label>
        <input
          className="input mb-4"
          placeholder="예: 김아빠"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enter()}
        />
        <label className="label">내 아이콘</label>
        <div className="flex flex-wrap gap-2 mb-6">
          {EMOJIS.map((em) => (
            <button
              key={em}
              onClick={() => setEmoji(em)}
              className={`text-2xl rounded-xl p-1.5 border-2 transition-all ${
                emoji === em
                  ? "border-brand-500 bg-brand-50 scale-110"
                  : "border-transparent hover:bg-stone-100"
              }`}
            >
              {em}
            </button>
          ))}
        </div>
        <button onClick={enter} className="btn-primary w-full justify-center py-2.5">
          입장하기
        </button>
        {!isSharedMode && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mt-4">
            ⚠️ 지금은 <b>체험 모드</b>입니다. 데이터가 이 브라우저에만 저장돼요. 3명이 함께 쓰려면
            README의 Supabase 연결 안내를 따라주세요.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
    return subscribeUser(() => setUser(getCurrentUser()));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!ready) return null;
  if (!user)
    return (
      <>
        <ConfigErrorBanner />
        <LoginScreen />
      </>
    );

  return (
    <div className="min-h-screen md:flex">
      {/* 모바일 상단바 */}
      <div className="md:hidden sticky top-0 z-20 bg-ink-950 text-white flex items-center justify-between px-4 py-3">
        <div className="font-bold flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-amber-500 text-sm">
            👨‍👧‍👦
          </span>
          서울아빠들 <span className="text-xs font-normal text-stone-500">{APP_VERSION}</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-xl">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* 사이드바 */}
      <aside
        className={`${
          menuOpen ? "block" : "hidden"
        } md:flex md:flex-col w-full md:w-64 bg-ink-950 text-stone-300 md:min-h-screen md:sticky md:top-0 md:h-screen flex-shrink-0`}
      >
        <div className="hidden md:flex items-center gap-3 px-5 py-6">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-amber-500 text-xl shadow-lg shadow-brand-500/20">
            👨‍👧‍👦
          </span>
          <div>
            <div className="text-lg font-extrabold text-white tracking-tight">서울아빠들</div>
            <div className="text-[11px] text-stone-500">
              {isSharedMode ? "팀 공유 모드" : "체험 모드 (내 기기만)"} · {APP_VERSION}
            </div>
          </div>
        </div>
        <nav className="px-3 pb-4 md:pb-0 space-y-0.5 md:flex-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25"
                    : "text-stone-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-2xl">{user.emoji}</span>
              <span className="font-semibold text-white">{user.name}</span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="text-xs text-stone-500 hover:text-white transition-colors"
            >
              변경
            </button>
          </div>
        </div>
      </aside>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <ConfigErrorBanner />
        <main className="p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
