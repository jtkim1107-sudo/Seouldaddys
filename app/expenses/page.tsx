"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { insertRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { useAdmin } from "@/lib/useAdmin";
import { won } from "@/lib/stock";
import { TABLES, type Expense, type Member, type StockMove } from "@/lib/types";

const DEFAULT_CATEGORIES = [
  "광고비",
  "택배/물류비",
  "재료/사입비",
  "판매 수수료",
  "식대/회식",
  "교통/출장",
  "사무/비품",
  "기타",
];

export default function ExpensesPage() {
  const { rows: expenses, loading } = useTable<Expense>(TABLES.expenses);
  const { rows: moves } = useTable<StockMove>(TABLES.stock_moves);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const { isAdmin } = useAdmin();
  const me = getCurrentUser();

  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [memo, setMemo] = useState("");
  const [month, setMonth] = useState(todayStr().slice(0, 7));

  // "결제: 나"가 본인을 뜻하므로 목록에서 본인 이름은 제외
  const memberNames = Array.from(new Set(members.map((m) => m.name)))
    .filter(Boolean)
    .filter((n) => n !== me?.name);
  const categories = useMemo(() => {
    const used = expenses.map((e) => e.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...used]));
  }, [expenses]);

  async function add() {
    const n = Number(amount.replace(/[^\d]/g, "")) || 0;
    if (!n) {
      alert("금액을 입력해주세요.");
      return;
    }
    await insertRow<Expense>(TABLES.expenses, {
      date,
      category,
      amount: n,
      payer: payer || me?.name || "",
      memo: memo.trim(),
      author: me?.name || "",
    });
    logActivity(`지출 ${won(n)} 기록 (${category})`);
    setAmount("");
    setMemo("");
  }

  async function remove(e: Expense) {
    if (!confirm(`${e.date} ${e.category} ${won(e.amount)} 지출을 삭제할까요?`)) return;
    await deleteRow(TABLES.expenses, e.id);
    logActivity(`지출 기록 삭제 (${e.date} · ${won(e.amount)})`);
  }

  // 월별 손익: 매출·원가(판매 마감에서) + 지출 → 순이익
  const monthly = useMemo(() => {
    const map = new Map<string, { revenue: number; cogs: number; expense: number }>();
    const get = (k: string) => {
      if (!map.has(k)) map.set(k, { revenue: 0, cogs: 0, expense: 0 });
      return map.get(k)!;
    };
    for (const m of moves) {
      if (m.type !== "sale") continue;
      const cur = get(m.date.slice(0, 7));
      cur.revenue += m.amount;
      cur.cogs += m.unit_cost * m.qty;
    }
    for (const e of expenses) get(e.date.slice(0, 7)).expense += e.amount;
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  }, [moves, expenses]);

  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  const mSummary = monthly.find(([k]) => k === month)?.[1] || { revenue: 0, cogs: 0, expense: 0 };
  const mProfit = mSummary.revenue - mSummary.cogs - mSummary.expense;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) map.set(e.category, (map.get(e.category) || 0) + e.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const byPayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) map.set(e.payer || "미지정", (map.get(e.payer || "미지정") || 0) + e.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">지출 / 손익</h1>
        <p className="text-sm text-stone-500 mt-1">
          지출만 기록하면 매출·원가는 판매 마감에서 자동으로 가져와 순이익을 계산합니다.
        </p>
      </div>

      {/* 지출 입력 */}
      <div className="card p-3.5 flex flex-wrap gap-2">
        <input className="input w-auto num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="input w-32 num"
          inputMode="numeric"
          placeholder="금액(원)"
          value={amount}
          onChange={(e) => {
            const d = e.target.value.replace(/[^\d]/g, "");
            setAmount(d ? Number(d).toLocaleString("ko-KR") : "");
          }}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <select className="input w-auto" value={payer} onChange={(e) => setPayer(e.target.value)}>
          <option value="">결제: 나</option>
          {memberNames.map((n) => (
            <option key={n} value={n}>
              결제: {n}
            </option>
          ))}
        </select>
        <input
          className="input flex-1 min-w-[120px]"
          placeholder="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add} className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          기록
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 월별 손익 */}
        <div className="card p-5 min-w-0">
          <h2 className="section-title mb-3">월별 손익</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">아직 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {monthly.map(([k, s]) => {
                const profit = s.revenue - s.cogs - s.expense;
                return (
                  <li key={k}>
                    <button
                      onClick={() => setMonth(k)}
                      className={`w-full rounded-[10px] px-3 py-2 text-left transition-colors duration-[120ms] ${
                        month === k ? "bg-brand-50" : "hover:bg-stone-50"
                      }`}
                    >
                      <div className="num flex items-center justify-between text-sm font-bold">
                        <span>{k.replace("-", "년 ")}월</span>
                        <span className={profit >= 0 ? "text-brand-700" : "text-red-600"}>
                          {profit >= 0 ? "+" : ""}
                          {won(profit)}
                        </span>
                      </div>
                      <div className="num text-[11px] text-stone-500">
                        매출 {won(s.revenue)} · 원가 {won(s.cogs)} · 지출 {won(s.expense)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 선택한 달 상세 */}
        <div className="card p-5 lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="section-title">
              <span className="num">{month.replace("-", "년 ")}월</span> 지출 내역
            </h2>
            <span className={`num text-sm font-bold ${mProfit >= 0 ? "text-brand-600" : "text-red-600"}`}>
              순이익 {mProfit >= 0 ? "+" : ""}
              {won(mProfit)}
            </span>
          </div>

          {(byCategory.length > 0 || byPayer.length > 0) && (
            <div className="space-y-1.5 mb-3">
              {byCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {byCategory.map(([c, total]) => (
                    <span key={c} className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                      {c} <span className="num font-bold">{won(total)}</span>
                    </span>
                  ))}
                </div>
              )}
              {byPayer.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {byPayer.map(([p, total]) => (
                    <span key={p} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                      {p} 결제 <span className="num font-bold">{won(total)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-center text-stone-400 py-6">불러오는 중...</p>
          ) : monthExpenses.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">이 달의 지출 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b text-left text-xs text-stone-500" style={{ borderColor: "var(--border-1)" }}>
                    <th className="py-2 pr-3">날짜</th>
                    <th className="py-2 pr-3">분류</th>
                    <th className="py-2 pr-3 text-right">금액</th>
                    <th className="py-2 pr-3">결제</th>
                    <th className="py-2 pr-3">메모</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {monthExpenses.map((e) => (
                    <tr key={e.id} className="border-b" style={{ borderColor: "var(--border-soft)" }}>
                      <td className="num py-2.5 pr-3">{e.date.slice(5)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
                          {e.category}
                        </span>
                      </td>
                      <td className="num py-2.5 pr-3 text-right font-semibold">{won(e.amount)}</td>
                      <td className="py-2.5 pr-3 text-xs text-stone-500">{e.payer}</td>
                      <td className="py-2.5 pr-3 text-xs text-stone-500">{e.memo || "-"}</td>
                      <td className="py-2.5 text-right">
                        {isAdmin && (
                          <button onClick={() => remove(e)} className="text-xs text-stone-300 hover:text-red-500 transition-colors">
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
