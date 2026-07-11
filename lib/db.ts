"use client";

// 데이터 저장소 추상화 계층.
// - Supabase 환경변수가 설정되어 있으면 → 팀 공유 모드 (3명이 실시간 공유)
// - 없으면 → 체험 모드 (브라우저 localStorage, 이 기기에서만 보임)
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { TableName } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSharedMode = Boolean(SUPABASE_URL && SUPABASE_KEY);

let supabase: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

// ---------- 체험 모드 (localStorage) ----------

const LS_PREFIX = "seouldaddys_";

function lsRead<T>(table: TableName): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + table) || "[]");
  } catch {
    return [];
  }
}

function notifyChange(table: TableName) {
  // 같은 브라우저의 다른 탭/컴포넌트에 변경 알림
  window.dispatchEvent(new CustomEvent(LS_PREFIX + "change", { detail: table }));
}

function lsWrite<T>(table: TableName, rows: T[]) {
  localStorage.setItem(LS_PREFIX + table, JSON.stringify(rows));
  notifyChange(table);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + Math.random().toString(36).slice(2);
}

// ---------- 공통 API ----------

type Row = { id: string; created_at: string };

export async function listRows<T extends Row>(table: TableName, ascending = false): Promise<T[]> {
  if (isSharedMode) {
    // 10초 안에 응답이 없으면 오류로 처리 (무한 "불러오는 중" 방지)
    const { data, error } = await sb()
      .from(table)
      .select("*")
      .order("created_at", { ascending })
      .abortSignal(AbortSignal.timeout(10000));
    if (error) throw error;
    return (data || []) as T[];
  }
  const rows = lsRead<T>(table);
  rows.sort((a, b) =>
    ascending
      ? a.created_at.localeCompare(b.created_at)
      : b.created_at.localeCompare(a.created_at)
  );
  return rows;
}

export async function insertRow<T extends Row>(
  table: TableName,
  row: Omit<T, "id" | "created_at">
): Promise<T> {
  if (isSharedMode) {
    const { data, error } = await sb()
      .from(table)
      .insert(row as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    notifyChange(table); // 실시간 연결이 느려도 내 화면은 즉시 갱신
    return data as T;
  }
  const full = { ...row, id: makeId(), created_at: new Date().toISOString() } as T;
  const rows = lsRead<T>(table);
  rows.push(full);
  lsWrite(table, rows);
  return full;
}

export async function updateRow<T extends Row>(
  table: TableName,
  id: string,
  patch: Partial<T>
): Promise<void> {
  if (isSharedMode) {
    const { error } = await sb()
      .from(table)
      .update(patch as Record<string, unknown>)
      .eq("id", id);
    if (error) throw error;
    notifyChange(table);
    return;
  }
  const rows = lsRead<T>(table);
  lsWrite(
    table,
    rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
  );
}

export async function deleteRow(table: TableName, id: string): Promise<void> {
  if (isSharedMode) {
    const { error } = await sb().from(table).delete().eq("id", id);
    if (error) throw error;
    notifyChange(table);
    return;
  }
  const rows = lsRead<Row>(table);
  lsWrite(
    table,
    rows.filter((r) => r.id !== id)
  );
}

// 테이블 변경 구독
// 공유 모드: Supabase Realtime + 주기적 폴링(실시간 연결이 막힌 환경 대비) + 창 복귀 시 갱신
// 체험 모드: 브라우저 이벤트
export function subscribeTable(table: TableName, onChange: () => void): () => void {
  const cleanups: (() => void)[] = [];

  // 같은 기기에서의 변경 즉시 반영 (양쪽 모드 공통)
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail === table) onChange();
  };
  window.addEventListener(LS_PREFIX + "change", handler);
  cleanups.push(() => window.removeEventListener(LS_PREFIX + "change", handler));

  if (isSharedMode) {
    const channel = sb()
      .channel("realtime:" + table)
      .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
      .subscribe();
    cleanups.push(() => {
      sb().removeChannel(channel);
    });

    // 실시간 연결이 안 되는 환경 대비: 채팅은 4초, 나머지는 15초마다 새로 불러오기
    const interval = setInterval(onChange, table === "messages" ? 4000 : 15000);
    cleanups.push(() => clearInterval(interval));

    // 앱/탭으로 돌아왔을 때 즉시 갱신
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onVisible);
    cleanups.push(() => {
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    });
  } else {
    // 다른 탭에서의 변경도 감지
    const storageHandler = (e: StorageEvent) => {
      if (e.key === LS_PREFIX + table) onChange();
    };
    window.addEventListener("storage", storageHandler);
    cleanups.push(() => window.removeEventListener("storage", storageHandler));
  }

  return () => cleanups.forEach((fn) => fn());
}

// ---------- 멤버 등록 ----------

type MemberRow = { id: string; name: string; emoji: string; created_at: string };

// 입장 시 멤버 명단에 자동 등록 (이미 있으면 아이콘만 갱신)
export async function ensureMember(name: string, emoji: string): Promise<void> {
  try {
    const members = await listRows<MemberRow>("members");
    const existing = members.find((m) => m.name === name);
    if (!existing) {
      await insertRow<MemberRow>("members", { name, emoji });
    } else if (existing.emoji !== emoji) {
      await updateRow<MemberRow>("members", existing.id, { emoji });
    }
  } catch (e) {
    console.error("멤버 등록 실패", e);
  }
}

// ---------- 현재 사용자 (기기별 저장) ----------

export interface CurrentUser {
  name: string;
  emoji: string;
}

const USER_KEY = LS_PREFIX + "current_user";

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(LS_PREFIX + "user"));
}

export function subscribeUser(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(LS_PREFIX + "user", handler);
  return () => window.removeEventListener(LS_PREFIX + "user", handler);
}
