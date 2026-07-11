"use client";

// 채팅 마지막 읽은 시각 (기기별 저장)
const KEY = "seouldaddys_chat_read";
const EVENT = "seouldaddys_chat_read_change";

export function getLastRead(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) || "";
}

export function setLastRead(iso: string) {
  localStorage.setItem(KEY, iso);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeLastRead(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
