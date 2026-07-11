"use client";

import { useMemo, useState } from "react";
import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { useTable, todayStr } from "@/lib/useTable";
import { getCurrentUser, logActivity } from "@/lib/db";
import { useAdmin } from "@/lib/useAdmin";
import { addMove, removeMove, won, MOVE_BADGE } from "@/lib/stock";
import { TABLES, type Product, type Partner, type StockMove } from "@/lib/types";

const LOW_STOCK = 5; // 이 수량 이하면 재입고 경고

export default function StockPage() {
  const { rows: products, loading } = useTable<Product>(TABLES.products);
  const { rows: partners } = useTable<Partner>(TABLES.partners);
  const { rows: moves } = useTable<StockMove>(TABLES.stock_moves);
  const { isAdmin } = useAdmin();
  const me = getCurrentUser();

  // 입고 입력
  const [inDate, setInDate] = useState(todayStr());
  const [inProduct, setInProduct] = useState("");
  const [inQty, setInQty] = useState("");
  const [inCost, setInCost] = useState("");
  const [inPartner, setInPartner] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...products].sort((a, b) => (a.stock || 0) - (b.stock || 0)), [products]);
  const history = useMemo(
    () =>
      [...moves].sort(
        (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
      ).slice(0, 50),
    [moves]
  );

  async function saveIn() {
    const p = products.find((x) => x.id === inProduct);
    const qty = Number(inQty.replace(/[^\d]/g, "")) || 0;
    if (!p || qty <= 0) {
      alert("상품과 입고 수량을 입력해주세요.");
      return;
    }
    const cost = Number(inCost.replace(/[^\d]/g, "")) || p.cost;
    setSaving(true);
    try {
      await addMove(
        {
          date: inDate,
          type: "in",
          product_id: p.id,
          product_name: p.name,
          qty,
          unit_price: cost,
          unit_cost: cost,
          amount: qty * cost,
          channel: "",
          partner: inPartner,
          memo: "",
          author: me?.name || "",
        },
        products
      );
      logActivity(`입고: ${p.name} ${qty}개 (${inPartner || "공급처 미지정"})`);
      setInQty("");
      setInCost("");
      alert(`입고 완료! ${p.name} 재고가 ${qty}개 늘었습니다.`);
    } finally {
      setSaving(false);
    }
  }

  // 실사 보정: 실제 수량을 입력하면 차이만큼 보정 기록
  async function adjust(p: Product) {
    const input = prompt(`"${p.name}" 실제 재고 수량을 입력해주세요.\n(현재 기록: ${p.stock}개)`);
    if (input === null) return;
    const actual = Number(input.replace(/[^\d-]/g, ""));
    if (isNaN(actual)) {
      alert("숫자를 입력해주세요.");
      return;
    }
    const delta = actual - (p.stock || 0);
    if (delta === 0) {
      alert("현재 기록과 같아서 보정할 것이 없습니다.");
      return;
    }
    await addMove(
      {
        date: todayStr(),
        type: "adjust",
        product_id: p.id,
        product_name: p.name,
        qty: delta,
        unit_price: 0,
        unit_cost: 0,
        amount: 0,
        channel: "",
        partner: "",
        memo: `실사 보정 (${p.stock} → ${actual})`,
        author: me?.name || "",
      },
      products
    );
    logActivity(`재고 보정: ${p.name} ${p.stock} → ${actual}`);
  }

  async function remove(m: StockMove) {
    const revert = m.type === "sale" ? `재고 ${m.qty}개 복구` : `재고 ${m.qty}개 차감`;
    if (!confirm(`${m.date} "${m.product_name}" ${MOVE_BADGE[m.type].label} 기록을 삭제할까요?\n(${revert})`))
      return;
    await removeMove(m, products);
    logActivity(`${MOVE_BADGE[m.type].label} 기록 삭제 (${m.date} · ${m.product_name})`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">재고 / 입고</h1>
        <p className="text-sm text-stone-500 mt-1">
          입고를 기록하면 재고가 늘고, 판매 마감을 하면 자동으로 줄어듭니다.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 재고 현황 */}
        <div className="card p-5 min-w-0">
          <h2 className="section-title mb-3">재고 현황</h2>
          {loading ? (
            <p className="text-center text-stone-400 py-6">불러오는 중...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">
              먼저 상품마스터에서 상품을 등록해주세요.
            </p>
          ) : (
            <div className="space-y-1.5">
              {sorted.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-[10px] border px-3 py-2"
                  style={{ borderColor: "var(--border-soft)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    {p.code && <div className="num text-[11px] text-stone-400">{p.code}</div>}
                  </div>
                  {(p.stock || 0) <= LOW_STOCK && (
                    <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">
                      재입고 필요
                    </span>
                  )}
                  <span className={`num text-base font-extrabold w-14 text-right ${(p.stock || 0) <= LOW_STOCK ? "text-red-600" : ""}`}>
                    {p.stock || 0}개
                  </span>
                  <button
                    onClick={() => adjust(p)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-brand-600 transition-colors"
                    title="실사 보정"
                  >
                    <SlidersHorizontal size={13} strokeWidth={1.75} />
                    보정
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 입고 입력 */}
        <div className="card p-5 min-w-0">
          <h2 className="section-title mb-3">입고 입력</h2>
          <div className="space-y-2.5">
            <div>
              <label className="label">날짜</label>
              <input className="input num" type="date" value={inDate} onChange={(e) => setInDate(e.target.value)} />
            </div>
            <div>
              <label className="label">상품</label>
              <select className="input" value={inProduct} onChange={(e) => setInProduct(e.target.value)}>
                <option value="">상품 선택</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (현재 {p.stock || 0}개)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">입고 수량</label>
                <input
                  className="input num"
                  inputMode="numeric"
                  placeholder="0"
                  value={inQty}
                  onChange={(e) => setInQty(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div>
                <label className="label">입고 단가 (비우면 원가)</label>
                <input
                  className="input num"
                  inputMode="numeric"
                  placeholder="원가 적용"
                  value={inCost}
                  onChange={(e) => {
                    const d = e.target.value.replace(/[^\d]/g, "");
                    setInCost(d ? Number(d).toLocaleString("ko-KR") : "");
                  }}
                />
              </div>
            </div>
            <div>
              <label className="label">공급처</label>
              <input className="input" list="in-partners" placeholder="예: 우진무역" value={inPartner} onChange={(e) => setInPartner(e.target.value)} />
              <datalist id="in-partners">
                {partners.map((pt) => (
                  <option key={pt.id} value={pt.name} />
                ))}
              </datalist>
            </div>
            <button onClick={saveIn} disabled={saving} className="btn-primary w-full justify-center">
              <PackagePlus size={16} strokeWidth={1.75} />
              {saving ? "저장 중..." : "입고 저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 입출고 이력 */}
      <div className="card p-5 min-w-0">
        <h2 className="section-title mb-3">입출고 이력 (최근 50건)</h2>
        {history.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">아직 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b text-left text-xs text-stone-500" style={{ borderColor: "var(--border-1)" }}>
                  <th className="py-2 pr-3">날짜</th>
                  <th className="py-2 pr-3">구분</th>
                  <th className="py-2 pr-3">상품</th>
                  <th className="py-2 pr-3 text-right">수량</th>
                  <th className="py-2 pr-3">채널/공급처</th>
                  <th className="py-2 pr-3">기록자</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-b" style={{ borderColor: "var(--border-soft)" }}>
                    <td className="num py-2.5 pr-3">{m.date.slice(5)}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${MOVE_BADGE[m.type].cls}`}>
                        {MOVE_BADGE[m.type].label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{m.product_name}</td>
                    <td className={`num py-2.5 pr-3 text-right font-semibold ${m.type === "sale" ? "text-red-600" : "text-blue-600"}`}>
                      {m.type === "sale" ? "-" : m.qty >= 0 ? "+" : ""}
                      {m.qty}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-stone-500">{m.channel || m.partner || m.memo || "-"}</td>
                    <td className="py-2.5 pr-3 text-xs text-stone-500">{m.author}</td>
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
  );
}
