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
  type CurrentUser,
} from "@/lib/db";

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
export const APP_VERSION = "v1.4";

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👨‍👧‍👦</div>
          <h1 className="text-2xl font-bold">서울아빠들</h1>
          <p className="text-sm text-slate-500 mt-1">
            팀 업무 공간에 오신 걸 환영합니다 <span className="text-slate-300">{APP_VERSION}</span>
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
              className={`text-2xl rounded-lg p-1.5 border-2 ${
                emoji === em ? "border-brand-500 bg-brand-50" : "border-transparent hover:bg-slate-100"
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
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen md:flex">
      {/* 모바일 상단바 */}
      <div className="md:hidden sticky top-0 z-20 bg-slate-900 text-white flex items-center justify-between px-4 py-3">
        <div className="font-bold">
          👨‍👧‍👦 서울아빠들 <span className="text-xs font-normal text-slate-400">{APP_VERSION}</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-xl">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* 사이드바 */}
      <aside
        className={`${
          menuOpen ? "block" : "hidden"
        } md:block w-full md:w-60 bg-slate-900 text-slate-200 md:min-h-screen md:sticky md:top-0 md:h-screen flex-shrink-0`}
      >
        <div className="hidden md:block px-5 py-6">
          <div className="text-xl font-bold text-white">👨‍👧‍👦 서울아빠들</div>
          <div className="text-xs text-slate-400 mt-1">
            {isSharedMode ? "팀 공유 모드" : "체험 모드 (내 기기만)"} · {APP_VERSION}
          </div>
        </div>
        <nav className="px-3 pb-4 md:pb-0 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-brand-500 text-white" : "hover:bg-slate-800"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 md:absolute md:bottom-0 md:w-60 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xl">{user.emoji}</span>
              <span className="font-medium text-white">{user.name}</span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              변경
            </button>
          </div>
        </div>
      </aside>

      {/* 본문 */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
