"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Folder, Plus, Upload } from "lucide-react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, logActivity } from "@/lib/db";
import { TABLES, type Product } from "@/lib/types";

type ProductForm = Omit<Product, "id" | "created_at">;

const EMPTY: ProductForm = {
  code: "",
  name: "",
  category: "",
  price: 0,
  cost: 0,
  stock: 0,
  supplier: "",
  drive_url: "",
  memo: "",
};

function won(n: number): string {
  return n ? n.toLocaleString("ko-KR") + "원" : "-";
}

// 간단 CSV 파서 (따옴표 필드 지원)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export default function ProductsPage() {
  const { rows: products, loading } = useTable<Product>(TABLES.products);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => ["전체", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = products.filter((p) => {
    if (category !== "전체" && p.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.code, p.supplier, p.memo].some((f) => f.toLowerCase().includes(q));
  });

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    const { id, created_at, ...rest } = p;
    setForm(rest);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) {
      alert("상품명을 입력해주세요");
      return;
    }
    if (editing) {
      await updateRow<Product>(TABLES.products, editing.id, form);
      logActivity(`상품 "${form.name}" 수정`);
    } else {
      await insertRow<Product>(TABLES.products, form);
      logActivity(`상품 "${form.name}" 등록`);
    }
    setShowForm(false);
  }

  async function remove(p: Product) {
    if (!confirm(`"${p.name}" 상품을 삭제할까요?`)) return;
    await deleteRow(TABLES.products, p.id);
    logActivity(`상품 "${p.name}" 삭제`);
  }

  function exportCsv() {
    const header = ["상품코드", "상품명", "카테고리", "판매가", "원가", "재고", "공급처", "드라이브링크", "메모"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.map(esc).join(","),
      ...products.map((p) =>
        [p.code, p.name, p.category, p.price, p.cost, p.stock, p.supplier, p.drive_url, p.memo]
          .map(esc)
          .join(",")
      ),
    ];
    // 엑셀 한글 호환을 위한 BOM
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "상품마스터.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text.replace(/^﻿/, ""));
    if (rows.length < 2) {
      alert("데이터가 없는 파일입니다");
      return;
    }
    // 첫 줄은 헤더로 간주: 상품코드,상품명,카테고리,판매가,원가,재고,공급처,드라이브링크,메모
    const body = rows.slice(1).filter((r) => r[1]?.trim());
    if (!confirm(`${body.length}개 상품을 추가할까요? (기존 상품은 그대로 둡니다)`)) return;
    for (const r of body) {
      await insertRow<Product>(TABLES.products, {
        code: r[0]?.trim() || "",
        name: r[1]?.trim() || "",
        category: r[2]?.trim() || "",
        price: Number(String(r[3]).replace(/[^\d.-]/g, "")) || 0,
        cost: Number(String(r[4]).replace(/[^\d.-]/g, "")) || 0,
        stock: Number(String(r[5]).replace(/[^\d.-]/g, "")) || 0,
        supplier: r[6]?.trim() || "",
        drive_url: r[7]?.trim() || "",
        memo: r[8]?.trim() || "",
      });
    }
    logActivity(`상품 ${body.length}개 CSV 가져오기`);
    alert(`${body.length}개 상품을 가져왔습니다`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">상품마스터</h1>
          <p className="text-sm text-stone-500 mt-1">
            총 <span className="num">{products.length}</span>개 상품 · 구글드라이브 링크로 상세자료 연결
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-ghost">
            <Download size={16} strokeWidth={1.75} />
            CSV 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <Upload size={16} strokeWidth={1.75} />
            CSV 가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = "";
            }}
          />
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} strokeWidth={2} />
            상품 등록
          </button>
        </div>
      </div>

      {/* 검색 · 필터 */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input
          className="input md:max-w-xs"
          placeholder="상품명·코드·공급처 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input md:max-w-[160px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="card p-5" style={{ borderColor: "#ffab78" }}>
          <h2 className="section-title mb-4">{editing ? "상품 수정" : "새 상품 등록"}</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="label">상품코드</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="예: SD-001" />
            </div>
            <div className="md:col-span-2">
              <label className="label">상품명 *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 프리미엄 티셔츠" />
            </div>
            <div>
              <label className="label">카테고리</label>
              <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="예: 의류" list="category-list" />
              <datalist id="category-list">
                {categories.filter((c) => c !== "전체").map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">판매가 (원)</label>
              <input className="input" type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">원가 (원)</label>
              <input className="input" type="number" value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">재고</label>
              <input className="input" type="number" value={form.stock || ""} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">공급처</label>
              <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <label className="label">구글드라이브 링크 (상품 이미지·상세자료 폴더)</label>
              <input className="input" value={form.drive_url} onChange={(e) => setForm({ ...form, drive_url: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div className="md:col-span-3">
              <label className="label">메모</label>
              <input className="input" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} className="btn-primary">
              {editing ? "수정 저장" : "등록"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 상품 테이블 */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-3">코드</th>
              <th className="px-4 py-3">상품명</th>
              <th className="px-4 py-3">카테고리</th>
              <th className="px-4 py-3 text-right">판매가</th>
              <th className="px-4 py-3 text-right">원가</th>
              <th className="px-4 py-3 text-right">재고</th>
              <th className="px-4 py-3">공급처</th>
              <th className="px-4 py-3">자료</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                {products.length === 0 ? "등록된 상품이 없습니다. 첫 상품을 등록해보세요!" : "검색 결과가 없습니다"}
              </td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{p.code || "-"}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.name}
                    {p.memo && <div className="text-xs text-slate-400 font-normal">{p.memo}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {p.category && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{p.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{won(p.price)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{won(p.cost)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.stock <= 5 ? "text-red-500" : ""}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.supplier || "-"}</td>
                  <td className="px-4 py-3">
                    {p.drive_url ? (
                      <a
                        href={p.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline text-xs font-medium"
                      >
                        <Folder size={13} strokeWidth={1.75} />
                        드라이브
                      </a>
                    ) : (
                      <span className="text-stone-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button onClick={() => openEdit(p)} className="text-xs text-slate-500 hover:text-brand-500 mr-2">수정</button>
                    <button onClick={() => remove(p)} className="text-xs text-slate-400 hover:text-red-500">삭제</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
