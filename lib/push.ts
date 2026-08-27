"use client";

// 폰 푸시 알림 구독 관리 (홈 화면에 설치한 앱에서 동작)
import { getCurrentUser } from "./db";

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

// 구독을 서버에 저장 (같은 기기의 이전 기록은 서버가 정리)
async function saveToServer(sub: PushSubscription, oldEndpoint?: string): Promise<void> {
  const user = getCurrentUser();
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: user?.name || "", sub: sub.toJSON(), oldEndpoint }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || "구독 저장에 실패했습니다.");
  }
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
  await saveToServer(sub);
}

// 알림 끄기: 구독 해제 + 서버에서 제거
export async function disablePush(): Promise<void> {
  const sub = await getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await fetch("/api/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}

// 앱을 열 때마다 구독 상태를 서버와 다시 맞춘다 (자동 복구)
// - 브라우저가 구독 주소를 바꿨거나(iOS에서 흔함) 서버 기록이 사라졌어도
//   권한이 이미 허용돼 있으면 조용히 다시 구독하고 저장한다
export async function syncPush(): Promise<void> {
  try {
    if (!pushSupported()) return;
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // 권한은 있는데 구독이 사라진 상태 → 다시 구독 (권한 팝업 없이 됨)
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    await saveToServer(sub);
  } catch (e) {
    // 자동 복구는 실패해도 앱 사용에 지장 없도록 조용히 넘어간다
    console.error("푸시 구독 동기화 실패", e);
  }
}
