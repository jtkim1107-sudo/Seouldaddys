"use client";

// 데이터 저장소 추상화 계층.
// - Supabase 환경변수가 설정되어 있으면 → 팀 공유 모드 (3명이 실시간 공유)
// - 없으면 → 체험 모드 (브라우저 localStorage, 이 기기에서만 보임)
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { TableName } from "./types";

// 복사-붙여넣기 중 섞여 들어간 공백·보이지 않는 문자·비ASCII 문자를 제거
// (HTTP 헤더에 그런 문자가 들어가면 모든 요청이 실패한다)
function cleanEnv(v: string): string {
  return v.replace(/[^\x21-\x7E]/g, "");
}

const RAW_URL = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .replace(/\/rest\/v1\/?$/, "") // 실수로 API 경로까지 붙여넣은 경우 제거
  .replace(/\/+$/, "");
const SUPABASE_KEY = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

// 설정값 검증 — 잘못된 값이 있어도 앱이 죽지 않고 화면에 원인을 표시한다
export let configError: string | null = null;

let SUPABASE_URL = "";
if (RAW_URL) {
  try {
    const parsed = new URL(RAW_URL.startsWith("http") ? RAW_URL : "https://" + RAW_URL);
    SUPABASE_URL = parsed.origin;
    // 프로젝트 API 주소(xxxx.supabase.co)가 아니면 안내
    // (대시보드 주소 supabase.com/... 를 잘못 넣는 실수가 흔하다)
    if (!/\.supabase\.(co|in|red)$/.test(parsed.hostname)) {
      configError =
        "설정 오류: NEXT_PUBLIC_SUPABASE_URL 값이 프로젝트 API 주소가 아닙니다. " +
        "Supabase의 Settings → API에 있는 Project URL(https://내프로젝트.supabase.co 형식)을 넣어야 합니다. " +
        "(현재 값: " + SUPABASE_URL + ")";
    }
  } catch {
    configError =
      "설정 오류: NEXT_PUBLIC_SUPABASE_URL 값이 인터넷 주소 형식이 아닙니다. " +
      "Vercel의 Environment Variables에서 값을 확인해주세요. (현재 값: " +
      RAW_URL.slice(0, 60) +
      ")";
  }
}

// 오류 화면에 표시할 진단용 서버 주소
export const supabaseAddress = SUPABASE_URL || "(설정 안 됨)";
if (!configError && SUPABASE_URL && SUPABASE_KEY) {
  // 유효한 키 형식: JWT(anon public, eyJ...로 시작·점 2개 포함) 또는 새 형식(sb_publishable_...)
  const looksJwt = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(SUPABASE_KEY);
  const looksPublishable = /^sb_publishable_[\w-]+$/.test(SUPABASE_KEY);
  if (SUPABASE_KEY.startsWith("sb_secret_")) {
    configError =
      "설정 오류: secret 키가 들어가 있습니다. 이 키는 외부에 노출되면 안 되니 지금 넣은 키를 지우고, " +
      "Supabase의 Settings → API Keys에서 'publishable' 키(sb_publishable_...)를 복사해 넣어주세요.";
  } else if (!looksJwt && !looksPublishable) {
    configError =
      "설정 오류: NEXT_PUBLIC_SUPABASE_ANON_KEY 값이 완전한 키가 아닙니다 (일부만 붙여넣어진 것 같습니다). " +
      "Supabase의 Settings → API에서 anon public 키(eyJ로 시작하는 긴 문자열) 또는 " +
      "publishable 키(sb_publishable_로 시작)를 Copy 버튼으로 복사해 다시 넣어주세요. " +
      "(현재 저장된 값 앞부분: " + SUPABASE_KEY.slice(0, 12) + "...)";
  }
}

export const isSharedMode = Boolean(!configError && SUPABASE_URL && SUPABASE_KEY);

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

// ---------- 활동 기록 ----------

// 주요 작업을 활동 기록에 남긴다 (실패해도 원래 작업에는 영향 없음)
type ActivityRow = { id: string; user: string; action: string; created_at: string };

export function logActivity(action: string): void {
  const user = getCurrentUser();
  insertRow<ActivityRow>("activities", { user: user?.name || "", action }).catch((e) =>
    console.error("활동 기록 실패", e)
  );
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
