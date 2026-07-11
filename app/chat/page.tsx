"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useTable, formatDateTime } from "@/lib/useTable";
import { insertRow, getCurrentUser, isSharedMode, supabaseAddress } from "@/lib/db";
import { TABLES, type Message } from "@/lib/types";
import { initialOf } from "@/components/Shell";

export default function ChatPage() {
  const { rows: messages, loading, error } = useTable<Message>(TABLES.messages, true);
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
    try {
      await insertRow<Message>(TABLES.messages, {
        author: user.name,
        emoji: "",
        content,
      });
    } catch (e) {
      console.error("메시지 전송 실패", e);
      setText(content); // 입력 내용 복구
      const detail =
        (e as { message?: string })?.message || JSON.stringify(e) || String(e);
      alert(
        "메시지 전송에 실패했습니다.\n인터넷 연결을 확인하고 다시 시도해주세요.\n(계속 실패하면 이 메시지를 관리자에게 알려주세요: " +
          detail +
          ")"
      );
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="page-title">팀 채팅</h1>
        <p className="text-sm text-stone-500 mt-1">
          {isSharedMode ? "실시간으로 팀원들과 대화하세요." : "체험 모드에서는 이 기기에서만 보입니다."}
        </p>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {error && (
            <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              메시지를 불러오지 못했습니다.
              <div className="text-xs mt-1 break-all">원인: {error}</div>
              {isSharedMode && (
                <div className="text-xs mt-1 break-all text-red-400">접속 주소: {supabaseAddress}</div>
              )}
              <div className="text-xs mt-1 text-red-400">이 화면을 캡처해서 관리자에게 보내주세요.</div>
            </div>
          )}
          {loading ? (
            <p className="text-center text-stone-400 text-sm py-10">불러오는 중...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-stone-400 text-sm py-10">첫 메시지를 보내보세요.</p>
          ) : (
            messages.map((m) => {
              const mine = m.author === user?.name;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && <span className="avatar h-7 w-7 text-xs mt-4">{initialOf(m.author)}</span>}
                  <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                    <div className="text-[11px] font-medium text-stone-400 mb-0.5">
                      {mine ? (
                        <span className="num">{formatDateTime(m.created_at)}</span>
                      ) : (
                        <>
                          {m.author} · <span className="num">{formatDateTime(m.created_at)}</span>
                        </>
                      )}
                    </div>
                    <div
                      className={`inline-block px-3.5 py-2 text-sm whitespace-pre-wrap break-words text-left ${
                        mine
                          ? "bg-brand-500 text-white rounded-xl rounded-br-[4px]"
                          : "bg-white border rounded-xl rounded-bl-[4px]"
                      }`}
                      style={mine ? undefined : { borderColor: "var(--border-soft)", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}
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

        <div className="border-t p-3 flex gap-2" style={{ borderColor: "var(--border-soft)" }}>
          <input
            className="input flex-1"
            placeholder="메시지 입력..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
            }}
          />
          <button onClick={send} className="btn-primary px-4" aria-label="전송">
            <Send size={16} strokeWidth={1.75} />
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
