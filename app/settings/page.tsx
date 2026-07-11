"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, logActivity, isSharedMode } from "@/lib/db";
import { TABLES, type Setting } from "@/lib/types";

export default function SettingsPage() {
  const { rows: settings, loading } = useTable<Setting>(TABLES.settings);
  const [pw, setPw] = useState("");

  const pwRow = settings.find((s) => s.key === "team_password");

  async function savePassword() {
    const value = pw.trim();
    if (value.length < 4) {
      alert("비밀번호는 4자 이상으로 해주세요.");
      return;
    }
    if (pwRow) await updateRow<Setting>(TABLES.settings, pwRow.id, { value });
    else await insertRow<Setting>(TABLES.settings, { key: "team_password", value });
    logActivity("팀 비밀번호 " + (pwRow ? "변경" : "설정"));
    setPw("");
    alert("저장했습니다. 다음 입장부터 비밀번호를 물어봅니다.");
  }

  async function removePassword() {
    if (!pwRow) return;
    if (!confirm("비밀번호 잠금을 해제할까요?")) return;
    await deleteRow(TABLES.settings, pwRow.id);
    logActivity("팀 비밀번호 해제");
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="page-title">설정</h1>
        <p className="text-sm text-stone-500 mt-1">팀 공간의 잠금을 관리합니다.</p>
      </div>

      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <Lock size={16} strokeWidth={1.75} className="text-stone-500" />
          비밀번호 잠금
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          설정하면 입장할 때 비밀번호를 물어봅니다. 주소가 외부에 알려졌을 때를 대비한 간단한
          잠금이에요.
        </p>

        {loading ? (
          <p className="text-sm text-stone-400">불러오는 중...</p>
        ) : (
          <>
            <div className="mb-3 text-sm">
              현재 상태:{" "}
              {pwRow ? (
                <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">
                  잠금 사용 중
                </span>
              ) : (
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">
                  잠금 없음
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                type="text"
                placeholder={pwRow ? "새 비밀번호 (변경)" : "비밀번호 (4자 이상)"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && savePassword()}
              />
              <button onClick={savePassword} className="btn-primary flex-shrink-0">
                저장
              </button>
              {pwRow && (
                <button onClick={removePassword} className="btn-danger flex-shrink-0">
                  잠금 해제
                </button>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-3">
              팀원 모두 같은 비밀번호를 씁니다. 설정 후 카톡 등으로 알려주세요.
              {!isSharedMode && " (체험 모드에서는 이 기기에만 적용됩니다.)"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
