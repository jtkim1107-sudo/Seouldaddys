"use client";

import { useTable, formatDateTime } from "@/lib/useTable";
import { TABLES, type Activity } from "@/lib/types";
import { initialOf } from "@/components/Shell";

export default function ActivityPage() {
  const { rows: activities, loading } = useTable<Activity>(TABLES.activities);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="page-title">활동 기록</h1>
        <p className="text-sm text-stone-500 mt-1">누가 언제 무엇을 했는지 최근 순서로 보여줍니다.</p>
      </div>

      {loading ? (
        <p className="text-center text-stone-400 py-10">불러오는 중...</p>
      ) : activities.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          아직 기록이 없습니다. 상품·할 일·일정 등을 등록하면 자동으로 쌓입니다.
        </div>
      ) : (
        <div className="card divide-y" style={{ borderColor: "var(--border-soft)" }}>
          {activities.slice(0, 100).map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--border-soft)" }}>
              <span className="avatar h-7 w-7 text-xs">{initialOf(a.user)}</span>
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-semibold">{a.user}</span>
                <span className="text-stone-600"> — {a.action}</span>
              </div>
              <span className="num text-xs text-stone-400 flex-shrink-0">{formatDateTime(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
