"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  Calendar,
  History,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  PackageOpen,
  Settings,
  Vote,
  X,
} from "lucide-react";
import {
  getCurrentUser,
  setCurrentUser,
  subscribeUser,
  ensureMember,
  isSharedMode,
  configError,
  listRows,
  type CurrentUser,
} from "@/lib/db";
import { useTable } from "@/lib/useTable";
import { getLastRead, subscribeLastRead } from "@/lib/chatRead";
import { TABLES, type Setting, type Message } from "@/lib/types";

const NAV = [
  { href: "/", label: "대시보드", Icon: LayoutDashboard },
  { href: "/products", label: "상품마스터", Icon: Package },
  { href: "/sales", label: "판매 마감", Icon: Banknote },
  { href: "/stock", label: "재고 / 입고", Icon: PackageOpen },
  { href: "/partners", label: "거래처정보", Icon: Building2 },
  { href: "/calendar", label: "일정", Icon: Calendar },
  { href: "/todos", label: "할 일", Icon: ListTodo },
  { href: "/polls", label: "투표", Icon: Vote },
  { href: "/chat", label: "팀 채팅", Icon: MessageCircle },
  { href: "/notices", label: "공지사항", Icon: Megaphone },
  { href: "/activity", label: "활동 기록", Icon: History },
  { href: "/settings", label: "설정", Icon: Settings },
];

// 배포 확인용 버전 (업데이트 때마다 올림)
export const APP_VERSION = "v8.0";

export function initialOf(name: string): string {
  return (name || "?").trim().slice(0, 1);
}

function ConfigErrorBanner() {
  if (!configError) return null;
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-700">
      {configError}
    </div>
  );
}

function LoginScreen() {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [teamPw, setTeamPw] = useState<string | null>(null); // null = 확인 중

  useEffect(() => {
    listRows<Setting>("settings")
      .then((rows) => setTeamPw(rows.find((s) => s.key === "team_password")?.value || ""))
      .catch(() => setTeamPw("")); // 확인 실패 시 잠금 없이 진행
  }, []);

  function enter() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (teamPw && pw !== teamPw) {
      alert("비밀번호가 맞지 않습니다.");
      return;
    }
    setCurrentUser({ name: trimmed, emoji: "" });
    ensureMember(trimmed, ""); // 팀원 명단에 자동 등록
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8" style={{ boxShadow: "var(--shadow-pop)" }}>
        <div className="text-center mb-7">
          <h1 className="text-2xl font-extrabold tracking-[-0.4px]">서울아빠들</h1>
          <p className="text-sm text-stone-500 mt-1.5">
            팀 업무 공간에 오신 걸 환영합니다 <span className="text-stone-300">{APP_VERSION}</span>
          </p>
        </div>
        <label className="label">이름 (팀원들에게 보이는 이름)</label>
        <input
          className="input mb-4"
          placeholder="예: 김선우"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enter()}
        />
        {teamPw ? (
          <>
            <label className="label">팀 비밀번호</label>
            <input
              className="input mb-5"
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enter()}
            />
          </>
        ) : (
          <div className="mb-1" />
        )}
        <button onClick={enter} disabled={teamPw === null} className="btn-primary w-full h-[42px] disabled:opacity-60">
          {teamPw === null ? "확인 중..." : "입장하기"}
        </button>
        {!isSharedMode && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-[10px] p-3 mt-4 leading-relaxed">
            지금은 <b>체험 모드</b>입니다. 데이터가 이 브라우저에만 저장돼요. 3명이 함께 쓰려면
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
  const [lastRead, setLastReadState] = useState("");

  // 채팅 안 읽은 메시지 수
  const { rows: messages } = useTable<Message>(TABLES.messages, true);
  useEffect(() => {
    setLastReadState(getLastRead());
    return subscribeLastRead(() => setLastReadState(getLastRead()));
  }, []);
  const unread = user
    ? messages.filter((m) => m.author !== user.name && (!lastRead || m.created_at > lastRead)).length
    : 0;

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setReady(true);
    // 명단 등록이 누락된 경우 자동 복구 (앱을 열 때마다 확인)
    if (u) ensureMember(u.name, u.emoji || "");
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
      <div
        className="md:hidden sticky top-0 z-20 text-white flex items-center justify-between px-4 py-3"
        style={{ background: "var(--bg-sidebar)" }}
      >
        <div className="font-extrabold tracking-[-0.4px]">
          서울아빠들 <span className="text-[11px] font-medium text-stone-500">{APP_VERSION}</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴" className="relative">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          {unread > 0 && !menuOpen && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      {/* 사이드바 */}
      <aside
        className={`${
          menuOpen ? "block" : "hidden"
        } md:flex md:flex-col w-full md:w-56 md:min-h-screen md:sticky md:top-0 md:h-screen flex-shrink-0`}
        style={{ background: "var(--bg-sidebar)" }}
      >
        <div className="hidden md:block px-5 pt-6 pb-5">
          <div className="text-lg font-extrabold text-white tracking-[-0.4px]">서울아빠들</div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {isSharedMode ? "팀 공유 모드" : "체험 모드 (내 기기만)"} · {APP_VERSION}
          </div>
        </div>
        <nav className="px-3 pb-4 md:pb-0 space-y-0.5 md:flex-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-[10px] px-3 h-9 text-sm font-semibold transition-colors duration-[120ms]"
                style={
                  active
                    ? { background: "var(--bg-sidebar-active)", color: "#8fbf9c" }
                    : { color: "#d6d3d1" }
                }
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
                {href === "/chat" && unread > 0 && (
                  <span className="num ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="avatar h-7 w-7 text-xs" style={{ background: "#211d1a", color: "#d6d3d1" }}>
                {initialOf(user.name)}
              </span>
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
        <main className="p-4 pb-20 md:px-7 md:py-6 md:pb-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-soft)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {[
          { href: "/", label: "홈", Icon: LayoutDashboard },
          { href: "/todos", label: "할 일", Icon: ListTodo },
          { href: "/calendar", label: "일정", Icon: Calendar },
          { href: "/chat", label: "채팅", Icon: MessageCircle },
        ].map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${
                active ? "text-brand-600" : "text-stone-400"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.75} />
              {label}
              {href === "/chat" && unread > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => {
            setMenuOpen(true);
            window.scrollTo(0, 0);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold text-stone-400"
        >
          <Menu size={20} strokeWidth={1.75} />
          전체
        </button>
      </nav>
    </div>
  );
}
