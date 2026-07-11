"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { insertRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { TABLES, type Sale } from "@/lib/types";

const DEFAULT_CHANNELS = ["스마트스토어", "쿠팡", "자사몰", "오프라인", "기타"];

function won(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

export default function SalesPage() {
  const { rows: sales, loading } = useTable<Sale>(TABLES.sales);
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState(DEFAULT_CHANNELS[0]);
  const [memo, setMemo] = useState("");
  const [month, setMonth] = useState(todayStr().slice(0, 7)); // YYYY-MM

  const channels = useMemo(() => {
    const used = sales.map((s) => s.channel).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CHANNELS, ...used]));
  }, [sales]);

  // 월별 합계 (최근 6개월)
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      const m = s.date.slice(0, 7);
      map.set(m, (map.get(m) || 0) + s.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [sales]);

  const monthSales = sales
    .filter((s) => s.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthTotal = monthSales.reduce((sum, s) => sum + s.amount, 0);

  // 이 달의 채널별 합계
  const byChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of monthSales) {
      const c = s.channel || "기타";
      map.set(c, (map.get(c) || 0) + s.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthSales]);

  async function add() {
    const n = Number(amount.replace(/[^\d.-]/g, ""));
    if (!date || !n) {
      alert("날짜와 금액을 입력해주세요.");
      return;
    }
    const user = getCurrentUser();
    await insertRow<Sale>(TABLES.sales, {
      date,
      amount: n,
      channel,
      memo: memo.trim(),
      author: user?.name || "",
    });
    logActivity(`매출 ${won(n)} 기록 (${date} · ${channel})`);
    setAmount("");
    setMemo("");
  }

  async function remove(s: Sale) {
    if (!confirm(`${s.date} ${won(s.amount)} 기록을 삭제할까요?`)) return;
    await deleteRow(TABLES.sales, s.id);
    logActivity(`매출 기록 삭제 (${s.date} · ${won(s.amount)})`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">매출 기록</h1>
        <p className="text-sm text-stone-500 mt-1">하루 매출을 기록하면 월별로 자동 정리됩니다.</p>
      </div>

      {/* 입력 */}
      <div className="card p-3.5 flex flex-wrap gap-2">
        <input className="input w-auto num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          className="input w-36 num"
          inputMode="numeric"
          placeholder="금액(원)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {channels.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="input flex-1 min-w-[140px]"
          placeholder="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <button onClick={add} className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          기록
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 월별 합계 */}
        <div className="card p-5">
          <h2 className="section-title mb-3">월별 합계</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">아직 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {monthly.map(([m, total]) => (
                <li key={m}>
                  <button
                    onClick={() => setMonth(m)}
                    className={`num w-full flex items-center justify-between rounded-[10px] px-3 py-2 text-sm transition-colors duration-[120ms] ${
                      month === m ? "bg-brand-50 font-bold text-brand-700" : "hover:bg-stone-50"
                    }`}
                  >
                    <span>{m.replace("-", "년 ")}월</span>
                    <span>{won(total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 선택한 달 상세 */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">
              <span className="num">{month.replace("-", "년 ")}월</span> 상세
            </h2>
            <span className="num text-sm font-bold text-brand-600">합계 {won(monthTotal)}</span>
          </div>

          {byChannel.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {byChannel.map(([c, total]) => (
                <span key={c} className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                  {c} <span className="num font-bold">{won(total)}</span>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-center text-stone-400 py-6">불러오는 중...</p>
          ) : monthSales.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">이 달의 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b text-left text-xs text-stone-500" style={{ borderColor: "var(--border-1)" }}>
                    <th className="py-2 pr-3">날짜</th>
                    <th className="py-2 pr-3">채널</th>
                    <th className="py-2 pr-3 text-right">금액</th>
                    <th className="py-2 pr-3">메모</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {monthSales.map((s) => (
                    <tr key={s.id} className="border-b" style={{ borderColor: "var(--border-soft)" }}>
                      <td className="num py-2.5 pr-3">{s.date.slice(5)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
                          {s.channel}
                        </span>
                      </td>
                      <td className="num py-2.5 pr-3 text-right font-semibold">{won(s.amount)}</td>
                      <td className="py-2.5 pr-3 text-stone-500 text-xs">{s.memo || "-"}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => remove(s)} className="text-xs text-stone-300 hover:text-red-500 transition-colors">
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
