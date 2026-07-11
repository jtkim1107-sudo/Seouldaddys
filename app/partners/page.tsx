"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Plus } from "lucide-react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, logActivity } from "@/lib/db";
import { useAdmin } from "@/lib/useAdmin";
import { TABLES, type Partner } from "@/lib/types";

type PartnerForm = Omit<Partner, "id" | "created_at">;

const EMPTY: PartnerForm = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  category: "공급처",
  terms: "",
  memo: "",
};

const DEFAULT_CATEGORIES = ["공급처", "물류/택배", "스튜디오", "기타"];

export default function PartnersPage() {
  const { rows: partners, loading } = useTable<Partner>(TABLES.partners);
  const { isAdmin } = useAdmin();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<PartnerForm>(EMPTY);

  const categories = useMemo(() => {
    const used = partners.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...used]));
  }, [partners]);

  const filtered = partners.filter((p) => {
    if (filter !== "전체" && p.category !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.contact_name, p.phone, p.memo].some((f) => f.toLowerCase().includes(q));
  });

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(p: Partner) {
    setEditing(p);
    const { id, created_at, ...rest } = p;
    setForm(rest);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) {
      alert("거래처명을 입력해주세요.");
      return;
    }
    if (editing) {
      await updateRow<Partner>(TABLES.partners, editing.id, form);
      logActivity(`거래처 "${form.name}" 수정`);
    } else {
      await insertRow<Partner>(TABLES.partners, form);
      logActivity(`거래처 "${form.name}" 등록`);
    }
    setShowForm(false);
  }

  async function remove(p: Partner) {
    if (!confirm(`"${p.name}" 거래처를 삭제할까요?`)) return;
    await deleteRow(TABLES.partners, p.id);
    logActivity(`거래처 "${p.name}" 삭제`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">거래처</h1>
          <p className="text-sm text-stone-500 mt-1">
            공급처·물류사 연락처와 거래 조건을 한 곳에 정리하세요.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          거래처 등록
        </button>
      </div>

      <div className="card p-3.5 flex flex-wrap gap-2">
        <input
          className="input md:max-w-xs"
          placeholder="거래처명·담당자·연락처 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>전체</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="card p-5" style={{ borderColor: "#8fbf9c" }}>
          <h2 className="section-title mb-4">{editing ? "거래처 수정" : "새 거래처 등록"}</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="label">거래처명 *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 우진무역" />
            </div>
            <div>
              <label className="label">분류</label>
              <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="partner-cats" />
              <datalist id="partner-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">담당자</label>
              <input className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <label className="label">전화번호</label>
              <input className="input num" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">이메일</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <label className="label">거래 조건 (단가·결제·배송 등)</label>
              <input className="input" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="예: 월말 정산, 택배비 별도" />
            </div>
            <div className="md:col-span-3">
              <label className="label">메모</label>
              <input className="input" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} className="btn-primary">{editing ? "수정 저장" : "등록"}</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-stone-400 py-10">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          {partners.length === 0 ? "등록된 거래처가 없습니다. 첫 거래처를 등록해보세요." : "검색 결과가 없습니다."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <span className="mt-1 inline-block rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
                    {p.category}
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0 text-xs font-medium">
                  <button onClick={() => openEdit(p)} className="text-stone-400 hover:text-brand-600 transition-colors">수정</button>
                  {isAdmin && (
                    <button onClick={() => remove(p)} className="text-stone-400 hover:text-red-500 transition-colors">삭제</button>
                  )}
                </div>
              </div>
              <div className="text-sm text-stone-600 space-y-1">
                {p.contact_name && <div>담당: {p.contact_name}</div>}
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="num flex items-center gap-1.5 text-brand-600 hover:underline">
                    <Phone size={13} strokeWidth={1.75} />
                    {p.phone}
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-brand-600 hover:underline break-all">
                    <Mail size={13} strokeWidth={1.75} />
                    {p.email}
                  </a>
                )}
              </div>
              {p.terms && <div className="text-xs text-stone-500 bg-stone-50 rounded-md px-2 py-1.5">{p.terms}</div>}
              {p.memo && <div className="text-xs text-stone-400">{p.memo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
