"use client";

import { useEffect, useRef, useState } from "react";
import { useTable, formatDateTime } from "@/lib/useTable";
import { insertRow, getCurrentUser, isSharedMode } from "@/lib/db";
import { TABLES, type Message } from "@/lib/types";

export default function ChatPage() {
  const { rows: messages, loading } = useTable<Message>(TABLES.messages, true);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || !user) return;
    setText("");
    await insertRow<Message>(TABLES.messages, {
      author: user.name,
      emoji: user.emoji,
      content,
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <div className="mb-3">
        <h1 className="text-2xl font-bold">💬 팀 채팅</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSharedMode ? "실시간으로 팀원들과 대화하세요" : "체험 모드에서는 이 기기에서만 보입니다"}
        </p>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-center text-slate-400 text-sm py-10">불러오는 중...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">
              첫 메시지를 보내보세요! 👋
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.author === user?.name;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className="text-2xl flex-shrink-0">{m.emoji}</div>
                  <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                    <div className="text-xs text-slate-400 mb-0.5">
                      {m.author} · {formatDateTime(m.created_at)}
                    </div>
                    <div
                      className={`inline-block rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words text-left ${
                        mine ? "bg-brand-500 text-white" : "bg-slate-100"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 p-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="메시지 입력..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
            }}
          />
          <button onClick={send} className="btn-primary px-5">
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
