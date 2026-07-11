"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileSpreadsheet, FileText, Folder, Link as LinkIcon, Plus, Presentation } from "lucide-react";
import { useTable, formatDateTime } from "@/lib/useTable";
import { insertRow, deleteRow, getCurrentUser, logActivity } from "@/lib/db";
import { TABLES, type FileLink } from "@/lib/types";

const DEFAULT_CATEGORIES = ["상품자료", "거래처", "정산/세금", "디자인", "기타"];

function IconFor({ url }: { url: string }) {
  const cls = "text-stone-500";
  if (url.includes("docs.google.com/spreadsheets"))
    return <FileSpreadsheet size={18} strokeWidth={1.75} className="text-green-600" />;
  if (url.includes("docs.google.com/document"))
    return <FileText size={18} strokeWidth={1.75} className="text-blue-600" />;
  if (url.includes("docs.google.com/presentation"))
    return <Presentation size={18} strokeWidth={1.75} className="text-amber-600" />;
  if (url.includes("drive.google.com"))
    return <Folder size={18} strokeWidth={1.75} className="text-brand-600" />;
  return <LinkIcon size={18} strokeWidth={1.75} className={cls} />;
}

export default function FilesPage() {
  const { rows: files, loading } = useTable<FileLink>(TABLES.files);
  const [filter, setFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [memo, setMemo] = useState("");

  const categories = useMemo(() => {
    const used = files.map((f) => f.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...used]));
  }, [files]);

  const filtered = filter === "전체" ? files : files.filter((f) => f.category === filter);

  async function add() {
    if (!title.trim() || !url.trim()) {
      alert("제목과 링크를 입력해주세요");
      return;
    }
    const user = getCurrentUser();
    await insertRow<FileLink>(TABLES.files, {
      title: title.trim(),
      url: url.trim(),
      category,
      memo: memo.trim(),
      author: user?.name || "",
    });
    logActivity(`자료 "${title.trim()}" 등록`);
    setTitle("");
    setUrl("");
    setMemo("");
    setShowForm(false);
  }

  async function remove(f: FileLink) {
    if (confirm(`"${f.title}" 자료를 삭제할까요?`)) await deleteRow(TABLES.files, f.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">자료실</h1>
          <p className="text-sm text-stone-500 mt-1">
            구글드라이브 폴더·시트·문서 링크를 팀이 함께 쓰도록 모아두는 곳
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          자료 등록
        </button>
      </div>

      {showForm && (
        <div className="card p-5" style={{ borderColor: "#ffab78" }}>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">제목 *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 상품 사진 폴더" />
            </div>
            <div>
              <label className="label">카테고리</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} list="file-cats" />
              <datalist id="file-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="label">링크 * (구글드라이브, 시트, 문서 등)</label>
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="md:col-span-2">
              <label className="label">메모</label>
              <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="어떤 자료인지 간단히" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={add} className="btn-primary">등록</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">취소</button>
          </div>
        </div>
      )}

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2">
        {["전체", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-3.5 h-8 text-sm font-medium transition-colors duration-[120ms] ${
              filter === c
                ? "bg-brand-500 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          {files.length === 0
            ? "등록된 자료가 없습니다. 자주 쓰는 구글드라이브 링크부터 등록해보세요!"
            : "이 카테고리에 자료가 없습니다"}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((f) => (
            <div key={f.id} className="card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:text-brand-600 flex items-center gap-2 transition-colors">
                  <IconFor url={f.url} />
                  <span className="break-all">{f.title}</span>
                </a>
                <button onClick={() => remove(f)} className="text-xs text-stone-300 hover:text-red-500 flex-shrink-0 transition-colors">
                  삭제
                </button>
              </div>
              {f.memo && <p className="text-xs text-stone-500">{f.memo}</p>}
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{f.category}</span>
                <span className="text-xs text-stone-400">
                  {f.author} · <span className="num">{formatDateTime(f.created_at)}</span>
                </span>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost justify-center text-brand-600 mt-1"
              >
                <ExternalLink size={15} strokeWidth={1.75} />
                열기
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
