"use client";

// 재고 수불 공용 로직: 기록을 남기면 상품 재고가 자동으로 증감한다
import { insertRow, updateRow, deleteRow } from "./db";
import { TABLES, type StockMove, type Product } from "./types";

export function won(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

// 수불 기록 추가 + 재고 반영 (판매: 감소, 입고/보정: 증가)
export async function addMove(
  data: Omit<StockMove, "id" | "created_at">,
  products: Product[]
): Promise<void> {
  await insertRow<StockMove>(TABLES.stock_moves, data);
  const p = products.find((x) => x.id === data.product_id);
  if (p) {
    const delta = data.type === "sale" ? -data.qty : data.qty;
    await updateRow<Product>(TABLES.products, p.id, { stock: (p.stock || 0) + delta });
  }
}

// 수불 기록 삭제 + 재고 되돌리기
export async function removeMove(m: StockMove, products: Product[]): Promise<void> {
  const p = products.find((x) => x.id === m.product_id);
  if (p) {
    const delta = m.type === "sale" ? m.qty : -m.qty;
    await updateRow<Product>(TABLES.products, p.id, { stock: (p.stock || 0) + delta });
  }
  await deleteRow(TABLES.stock_moves, m.id);
}

export const MOVE_BADGE: Record<StockMove["type"], { label: string; cls: string }> = {
  sale: { label: "판매", cls: "bg-brand-50 text-brand-700" },
  in: { label: "입고", cls: "bg-blue-50 text-blue-700" },
  adjust: { label: "보정", cls: "bg-amber-50 text-amber-700" },
};

export const SALE_CHANNELS = ["스마트스토어", "쿠팡", "자사몰", "오프라인", "기타"];
