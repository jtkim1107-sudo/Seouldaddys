"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { getCurrentUser, logActivity } from "@/lib/db";
import { useAdmin } from "@/lib/useAdmin";
import { addMove, removeMove, won, SALE_CHANNELS } from "@/lib/stock";
import { TABLES, type Product, type StockMove } from "@/lib/types";

export default function SalesPage() {
  const { rows: products } = useTable<Product>(TABLES.products);
  const { rows: moves, loading } = useTable<StockMove>(TABLES.stock_moves);
  const { isAdmin } = useAdmin();
  const [date, setDate] = useState(todayStr());
  const [channel, setChannel] = useState(SALE_CHANNELS[0]);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(todayStr().slice(0, 7));

  const me = getCurrentUser();
  const saleMoves = useMemo(() => moves.filter((m) => m.type === "sale"), [moves]);
  // 마감 입력 목록은 이름순으로 고정 (매일 같은 순서로 입력하도록)
  const productList = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name, "ko")), [products]);

  // 이번 마감 예상 합계
  const lines = products
    .map((p) => ({ p, qty: Number((qtys[p.id] || "").replace(/[^\d]/g, "")) || 0 }))
    .filter((l) => l.qty > 0);
  const previewTotal = lines.reduce((s, l) => s + l.qty * l.p.price, 0);

  async function closeDay() {
    if (lines.length === 0) {
      alert("판매 수량을 입력해주세요.");
      return;
    }
    const over = lines.filter((l) => l.qty > (l.p.stock || 0));
    if (
      over.length &&
      !confirm(
        `재고보다 많이 판매된 상품이 있습니다:\n` +
          over.map((l) => `- ${l.p.name}: 재고 ${l.p.stock} / 판매 ${l.qty}`).join("\n") +
          `\n그래도 저장할까요? (재고가 마이너스로 기록됩니다)`
      )
    )
      return;
    const dup = saleMoves.some((m) => m.date === date && m.channel === channel);
    if (dup && !confirm(`${date} · ${channel} 마감 기록이 이미 있습니다. 추가로 저장할까요?`))
      return;
    setSaving(true);
    try {
      for (const { p, qty } of lines) {
        await addMove(
          {
            date,
            type: "sale",
            product_id: p.id,
            product_name: p.name,
            qty,
            unit_price: p.price,
            unit_cost: p.cost,
            amount: qty * p.price,
            channel,
            partner: "",
            memo: "",
            author: me?.name || "",
          },
          products
        );
      }
      logActivity(`판매 마감 저장 (${date} · ${channel} · ${won(previewTotal)})`);
      setQtys({});
      alert(`마감 저장 완료! 매출 ${won(previewTotal)} · 재고가 자동 차감됐습니다.`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: StockMove) {
    if (!confirm(`${m.date} "${m.product_name}" ${m.qty}개 판매 기록을 삭제할까요?\n재고가 ${m.qty}개 복구됩니다.`))
      return;
    await removeMove(m, products);
    logActivity(`판매 기록 삭제 (${m.date} · ${m.product_name} ${m.qty}개)`);
  }

  // 월별 요약 (판매 기준)
  const monthly = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; qty: number }>();
    for (const m of saleMoves) {
      const key = m.date.slice(0, 7);
      const cur = map.get(key) || { revenue: 0, profit: 0, qty: 0 };
      cur.revenue += m.amount;
      cur.profit += (m.unit_price - m.unit_cost) * m.qty;
      cur.qty += m.qty;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  }, [saleMoves]);

  const monthSales = saleMoves
    .filter((m) => m.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  const mTotal = monthSales.reduce((s, m) => s + m.amount, 0);
  const mProfit = monthSales.reduce((s, m) => s + (m.unit_price - m.unit_cost) * m.qty, 0);

  const byChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of monthSales) map.set(m.channel || "기타", (map.get(m.channel || "기타") || 0) + m.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthSales]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">판매 마감</h1>
        <p className="text-sm text-stone-500 mt-1">
          하루 판매 수량을 입력하면 매출·이익 집계와 재고 차감이 자동으로 됩니다.
        </p>
      </div>

      {/* 마감 입력 */}
      <div className="card p-5">
        <h2 className="section-title mb-3">마감 입력</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <input className="input w-auto num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {SALE_CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {products.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">
            먼저 상품마스터에서 상품을 등록해주세요.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {productList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-[10px] border px-3 py-2"
                  style={{ borderColor: "var(--border-soft)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="num text-[11px] text-stone-400">
                      재고 {p.stock} · 단가 {won(p.price)}
                    </div>
                  </div>
                  <input
                    className="input num w-24 text-right"
                    inputMode="numeric"
                    placeholder="0"
                    value={qtys[p.id] || ""}
                    onChange={(e) =>
                      setQtys({ ...qtys, [p.id]: e.target.value.replace(/[^\d]/g, "") })
                    }
                  />
                  <span className="text-xs text-stone-400 w-6">개</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="num text-sm font-bold text-brand-600">
                {previewTotal > 0 ? `예상 매출 ${won(previewTotal)}` : ""}
              </span>
              <button onClick={closeDay} disabled={saving} className="btn-primary">
                <CheckCircle2 size={16} strokeWidth={1.75} />
                {saving ? "저장 중..." : "마감 저장"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 월별 요약 */}
        <div className="card p-5 min-w-0">
          <h2 className="section-title mb-3">월별 요약</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">아직 판매 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {monthly.map(([m, s]) => (
                <li key={m}>
                  <button
                    onClick={() => setMonth(m)}
                    className={`w-full rounded-[10px] px-3 py-2 text-left transition-colors duration-[120ms] ${
                      month === m ? "bg-brand-50" : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="num flex items-center justify-between text-sm font-bold">
                      <span>{m.replace("-", "년 ")}월</span>
                      <span>{won(s.revenue)}</span>
                    </div>
                    <div className="num text-[11px] text-stone-500">
                      이익 {won(s.profit)} · {s.qty}개 판매
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 선택한 달 상세 */}
        <div className="card p-5 lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="section-title">
              <span className="num">{month.replace("-", "년 ")}월</span> 판매 내역
            </h2>
            <span className="num text-sm font-bold text-brand-600">
              매출 {won(mTotal)} · 이익 {won(mProfit)}
            </span>
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
            <p className="text-sm text-stone-400 py-6 text-center">이 달의 판매 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b text-left text-xs text-stone-500" style={{ borderColor: "var(--border-1)" }}>
                    <th className="py-2 pr-3">날짜</th>
                    <th className="py-2 pr-3">상품</th>
                    <th className="py-2 pr-3 text-right">수량</th>
                    <th className="py-2 pr-3 text-right">금액</th>
                    <th className="py-2 pr-3">채널</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {monthSales.map((m) => (
                    <tr key={m.id} className="border-b" style={{ borderColor: "var(--border-soft)" }}>
                      <td className="num py-2.5 pr-3">{m.date.slice(5)}</td>
                      <td className="py-2.5 pr-3 font-medium">{m.product_name}</td>
                      <td className="num py-2.5 pr-3 text-right">{m.qty}</td>
                      <td className="num py-2.5 pr-3 text-right font-semibold">{won(m.amount)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
                          {m.channel}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {isAdmin && (
                          <button onClick={() => remove(m)} className="text-xs text-stone-300 hover:text-red-500 transition-colors">
                            삭제
                          </button>
                        )}
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
