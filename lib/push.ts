"use client";

// 폰 푸시 알림 구독 관리 (홈 화면에 설치한 앱에서 동작)
import { listRows, insertRow, deleteRow, getCurrentUser } from "./db";
import type { PushSub } from "./types";

// VAPID 공개 키 (비밀 아님 — 서버의 비밀 키와 짝을 이룸)
export const VAPID_PUBLIC_KEY =
  "BA-F-DLuod-AM8VzICAQ1FKjzlybTogQ_LJRcM3P4Q4MQvtRxKtB9hoF2KHAPR2zuypJhp75fO6Yu0JZkRP7j70";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// 이 기기의 알림 구독 상태 확인
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  return reg.pushManager.getSubscription();
}

// 알림 켜기: 권한 요청 → 구독 → 서버(DB)에 저장
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("이 브라우저는 알림을 지원하지 않습니다.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("알림 권한이 거부되었습니다.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
  const user = getCurrentUser();
  const json = sub.toJSON();
  // 같은 기기(endpoint) 중복 저장 방지
  const existing = await listRows<PushSub>("push_subs");
  if (!existing.some((s) => s.sub?.endpoint === json.endpoint)) {
    await insertRow<PushSub>("push_subs", {
      name: user?.name || "",
      sub: json as PushSub["sub"],
    });
  }
}

// 알림 끄기: 구독 해제 + DB에서 제거
export async function disablePush(): Promise<void> {
  const sub = await getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  const existing = await listRows<PushSub>("push_subs");
  for (const s of existing) {
    if (s.sub?.endpoint === endpoint) await deleteRow("push_subs", s.id);
  }
}
