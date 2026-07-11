"use client";

import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useTable } from "@/lib/useTable";
import { insertRow, updateRow, deleteRow, logActivity, isSharedMode, getCurrentUser } from "@/lib/db";
import { TABLES, type Setting, type Member } from "@/lib/types";

export default function SettingsPage() {
  const { rows: settings, loading } = useTable<Setting>(TABLES.settings);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const [pw, setPw] = useState("");
  const [adminPick, setAdminPick] = useState("");

  const pwRow = settings.find((s) => s.key === "team_password");
  const adminRow = settings.find((s) => s.key === "admin_name");
  const me = getCurrentUser();
  // 관리자가 지정돼 있으면 그 사람만 설정을 바꿀 수 있다
  const canManage = !adminRow || adminRow.value === me?.name;

  const memberNames = Array.from(
    new Set([...members.map((m) => m.name), me?.name || ""])
  ).filter(Boolean);

  async function saveAdmin() {
    if (!adminPick) {
      alert("관리자로 지정할 팀원을 선택해주세요.");
      return;
    }
    if (adminRow) await updateRow<Setting>(TABLES.settings, adminRow.id, { value: adminPick });
    else await insertRow<Setting>(TABLES.settings, { key: "admin_name", value: adminPick });
    logActivity(`관리자를 "${adminPick}"(으)로 지정`);
    setAdminPick("");
  }

  async function removeAdmin() {
    if (!adminRow) return;
    if (!confirm("관리자 지정을 해제할까요? 해제하면 다시 모두가 삭제할 수 있게 됩니다.")) return;
    await deleteRow(TABLES.settings, adminRow.id);
    logActivity("관리자 지정 해제");
  }

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
        <p className="text-sm text-stone-500 mt-1">팀 공간의 관리자와 잠금을 관리합니다.</p>
      </div>

      {/* 관리자 지정 */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <ShieldCheck size={16} strokeWidth={1.75} className="text-stone-500" />
          관리자
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          관리자를 지정하면 상품·거래처·공지 등의 <b>삭제 버튼이 관리자에게만</b> 보입니다.
          설정 변경도 관리자만 할 수 있어요.
        </p>
        {loading ? (
          <p className="text-sm text-stone-400">불러오는 중...</p>
        ) : (
          <>
            <div className="mb-3 text-sm">
              현재 관리자:{" "}
              {adminRow ? (
                <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                  {adminRow.value}
                </span>
              ) : (
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">
                  지정 안 됨 (모두 삭제 가능)
                </span>
              )}
            </div>
            {canManage ? (
              <div className="flex gap-2">
                <select className="input flex-1" value={adminPick} onChange={(e) => setAdminPick(e.target.value)}>
                  <option value="">관리자로 지정할 팀원 선택</option>
                  {memberNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button onClick={saveAdmin} className="btn-primary flex-shrink-0">
                  지정
                </button>
                {adminRow && (
                  <button onClick={removeAdmin} className="btn-danger flex-shrink-0">
                    해제
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-400">
                관리자({adminRow?.value})만 변경할 수 있습니다.
              </p>
            )}
          </>
        )}
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
            {canManage ? (
              <>
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
            ) : (
              <p className="text-xs text-stone-400">관리자({adminRow?.value})만 변경할 수 있습니다.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
