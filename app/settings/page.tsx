"use client";

import { useEffect, useState } from "react";
import { Bell, Download, Lock, Pencil, ShieldCheck, UserMinus, UserRound, Users } from "lucide-react";
import { useTable } from "@/lib/useTable";
import {
  insertRow,
  updateRow,
  deleteRow,
  listRows,
  logActivity,
  isSharedMode,
  getCurrentUser,
} from "@/lib/db";
import { pushSupported, getSubscription, enablePush, disablePush, syncPush } from "@/lib/push";
import { setCurrentUser } from "@/lib/db";
import { initialOf } from "@/components/Shell";
import {
  TABLES,
  type Setting,
  type Member,
  type Todo,
  type Message,
  type Activity,
  type TableName,
} from "@/lib/types";

// 이름 변경 시 함께 바꿔야 하는 기록들
const RENAME_TARGETS: { table: TableName; fields: string[] }[] = [
  { table: TABLES.todos, fields: ["assignee"] },
  { table: TABLES.events, fields: ["author"] },
  { table: TABLES.notices, fields: ["author"] },
  { table: TABLES.messages, fields: ["author"] },
  { table: TABLES.activities, fields: ["user"] },
  { table: TABLES.partners, fields: ["updated_by"] },
  { table: TABLES.minutes, fields: ["author", "updated_by"] },
  { table: TABLES.stock_moves, fields: ["author"] },
  { table: TABLES.expenses, fields: ["payer", "author"] },
  { table: TABLES.push_subs, fields: ["name"] },
];

type AnyRow = { id: string; created_at: string; [k: string]: unknown };

export default function SettingsPage() {
  const { rows: settings, loading } = useTable<Setting>(TABLES.settings);
  const { rows: members } = useTable<Member>(TABLES.members, true);
  const { rows: allTodos } = useTable<Todo>(TABLES.todos);
  const { rows: allMessages } = useTable<Message>(TABLES.messages);
  const { rows: allActivities } = useTable<Activity>(TABLES.activities);
  const [pw, setPw] = useState("");
  const [adminPick, setAdminPick] = useState("");
  // 알림 상태: null=확인 중, false=꺼짐, true=켜짐, "unsupported"=미지원
  const [pushState, setPushState] = useState<null | boolean | "unsupported">(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setPushState("unsupported");
      return;
    }
    // 서버 기록이 사라졌어도 다시 저장되도록 먼저 동기화한 뒤 상태 표시
    syncPush()
      .then(() => getSubscription())
      .then((s) => setPushState(Boolean(s)))
      .catch(() => setPushState(false));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushState === true) {
        await disablePush();
        setPushState(false);
      } else {
        await enablePush();
        setPushState(true);
        alert("알림이 켜졌습니다. '테스트 알림'으로 확인해보세요.");
      }
    } catch (e) {
      alert((e as Error)?.message || "알림 설정에 실패했습니다.");
    } finally {
      setPushBusy(false);
    }
  }

  const [backupBusy, setBackupBusy] = useState(false);

  // 전체 데이터를 JSON 파일로 다운로드 (백업)
  async function downloadBackup() {
    setBackupBusy(true);
    try {
      const tables = Object.values(TABLES);
      const data: Record<string, unknown> = {};
      for (const t of tables) {
        data[t] = await listRows(t);
      }
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob(
        [JSON.stringify({ app: "서울아빠들", exported_at: new Date().toISOString(), data }, null, 2)],
        { type: "application/json" }
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `서울아빠들-백업-${date}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      logActivity("데이터 백업 다운로드");
    } catch (e) {
      alert("백업 실패: " + ((e as Error)?.message || ""));
    } finally {
      setBackupBusy(false);
    }
  }

  async function sendTest() {
    setPushBusy(true);
    try {
      const res = await fetch("/api/notify?test=1");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "발송 실패");
      if (json.total === 0) {
        alert(
          "등록된 알림 기기가 없습니다. '이 기기 알림 끄기' 후 다시 '알림 켜기'를 눌러주세요."
        );
      } else if (json.sent === 0) {
        alert(
          `발송에 실패했습니다 (기기 ${json.total}개 중 0개 성공).\n` +
            (json.errors?.length
              ? json.errors.join("\n")
              : "기기의 알림 구독이 만료됐습니다. 앱을 다시 열면 자동으로 재연결됩니다.")
        );
      } else {
        alert(`테스트 알림을 ${json.sent}개 기기로 보냈습니다. 잠시 후 알림을 확인해보세요.`);
      }
    } catch (e) {
      alert("테스트 발송 실패: " + ((e as Error)?.message || ""));
    } finally {
      setPushBusy(false);
    }
  }

  const pwRow = settings.find((s) => s.key === "team_password");
  const adminRow = settings.find((s) => s.key === "admin_name");
  const me = getCurrentUser();
  // 관리자가 지정돼 있으면 그 사람만 설정을 바꿀 수 있다
  const canManage = !adminRow || adminRow.value === me?.name;

  const memberNames = Array.from(
    new Set([...members.filter((m) => m.approved !== false).map((m) => m.name), me?.name || ""])
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

  // 명단에는 없지만 기록(할 일·채팅·활동)에 등장하는 유령 이름
  const memberNameSet = new Set(members.map((m) => m.name));
  const ghostNames = Array.from(
    new Set([
      ...allTodos.map((t) => t.assignee),
      ...allMessages.map((m) => m.author),
      ...allActivities.map((a) => a.user),
    ])
  ).filter((n) => n && !memberNameSet.has(n));

  // 유령 이름 정리: 할 일 담당 해제 + 채팅·활동 기록 삭제 (흔적 완전 제거)
  async function cleanGhost(name: string) {
    const ghostTodos = allTodos.filter((t) => t.assignee === name);
    const ghostMsgs = allMessages.filter((m) => m.author === name);
    const ghostActs = allActivities.filter((a) => a.user === name);
    if (
      !confirm(
        `"${name}" 이름의 흔적을 모두 정리할까요?\n` +
          `- 할 일 ${ghostTodos.length}건 담당 해제\n` +
          `- 채팅 ${ghostMsgs.length}건 삭제\n` +
          `- 활동 기록 ${ghostActs.length}건 삭제\n` +
          `이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;
    for (const t of ghostTodos) {
      await updateRow<Todo>(TABLES.todos, t.id, { assignee: "" });
    }
    for (const m of ghostMsgs) {
      await deleteRow(TABLES.messages, m.id);
    }
    for (const a of ghostActs) {
      await deleteRow(TABLES.activities, a.id);
    }
    logActivity(`미등록 이름 "${name}" 기록 정리`);
  }

  // 내 이름 변경 — 모든 기록의 이름을 함께 변경
  const [newName, setNewName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  // 모든 기록에서 이름을 일괄 변경하는 공용 로직
  async function renameEverywhere(oldName: string, next: string) {
    // 1) 각 기록의 이름 필드 변경
    for (const { table, fields } of RENAME_TARGETS) {
      const rows = await listRows<AnyRow>(table);
      for (const r of rows) {
        const patch: Record<string, unknown> = {};
        for (const f of fields) if (r[f] === oldName) patch[f] = next;
        if (Object.keys(patch).length) await updateRow<AnyRow>(table, r.id, patch);
      }
    }
    // 2) 회의록 참석자 문자열 치환
    const mins = await listRows<AnyRow>(TABLES.minutes);
    for (const r of mins) {
      const at = String(r.attendees || "");
      if (at.includes(oldName)) {
        const replaced = at
          .split(",")
          .map((s) => (s.trim() === oldName ? next : s.trim()))
          .join(", ");
        await updateRow<AnyRow>(TABLES.minutes, r.id, { attendees: replaced });
      }
    }
    // 3) 관리자 지정 이름이면 함께 변경
    if (adminRow?.value === oldName) {
      await updateRow<Setting>(TABLES.settings, adminRow.id, { value: next });
    }
    // 4) 멤버 명단의 이름 변경
    const row = members.find((m) => m.name === oldName);
    if (row) await updateRow<Member>(TABLES.members, row.id, { name: next });
  }

  async function renameMe() {
    const oldName = me?.name || "";
    const next = newName.trim();
    if (!next || next === oldName) return;
    if (members.some((m) => m.name === next)) {
      alert("이미 있는 이름입니다. 다른 이름을 써주세요.");
      return;
    }
    if (
      !confirm(
        `이름을 "${oldName}" → "${next}"(으)로 바꿀까요?\n할 일·판매·지출 등 모든 기록의 이름이 함께 바뀝니다.`
      )
    )
      return;
    setRenameBusy(true);
    try {
      await renameEverywhere(oldName, next);
      setCurrentUser({ name: next, emoji: "" });
      logActivity(`이름 변경: ${oldName} → ${next}`);
      setNewName("");
      alert(`이름이 "${next}"(으)로 바뀌었습니다. 모든 기록도 함께 변경됐어요.`);
    } catch (e) {
      alert("이름 변경 중 오류가 발생했습니다: " + ((e as Error)?.message || ""));
    } finally {
      setRenameBusy(false);
    }
  }

  // 관리자가 다른 팀원 이름 변경
  async function renameOther(m: Member) {
    const input = prompt(`"${m.name}"님의 새 이름을 입력해주세요.`, m.name);
    if (input === null) return;
    const next = input.trim();
    if (!next || next === m.name) return;
    if (members.some((x) => x.name === next)) {
      alert("이미 있는 이름입니다. 다른 이름을 써주세요.");
      return;
    }
    if (
      !confirm(
        `"${m.name}" → "${next}"(으)로 바꿀까요?\n모든 기록의 이름이 함께 바뀝니다.\n\n변경 후 ${m.name}님 기기에서는 '변경'을 눌러 새 이름(${next})으로 다시 입장해야 합니다.`
      )
    )
      return;
    setRenameBusy(true);
    try {
      await renameEverywhere(m.name, next);
      logActivity(`팀원 이름 변경: ${m.name} → ${next}`);
      alert(
        `변경 완료!\n${next}님께 알려주세요: 앱에서 '변경' 버튼을 눌러 "${next}" 이름으로 다시 입장하면 됩니다.`
      );
    } catch (e) {
      alert("이름 변경 중 오류가 발생했습니다: " + ((e as Error)?.message || ""));
    } finally {
      setRenameBusy(false);
    }
  }

  // 가입 승인 / 거절
  async function approveMember(m: Member) {
    await updateRow<Member>(TABLES.members, m.id, { approved: true });
    logActivity(`팀원 "${m.name}" 가입 승인`);
  }

  async function rejectMember(m: Member) {
    if (!confirm(`"${m.name}"님의 입장 요청을 거절할까요?`)) return;
    await deleteRow(TABLES.members, m.id);
    logActivity(`"${m.name}" 입장 요청 거절`);
  }

  // 팀원 내보내기 (퇴사 등) — 미완료 할 일은 담당자 미지정으로 이동
  async function removeMember(m: Member) {
    if (adminRow && m.name === adminRow.value) {
      alert("관리자는 내보낼 수 없습니다. 먼저 다른 팀원에게 관리자를 넘겨주세요.");
      return;
    }
    if (m.name === me?.name) {
      alert("본인은 내보낼 수 없습니다.");
      return;
    }
    const open = allTodos.filter((t) => t.assignee === m.name && t.status !== "done");
    if (
      !confirm(
        `"${m.name}"님을 팀에서 내보낼까요?\n` +
          `미완료 할 일 ${open.length}건은 '담당자 미지정'으로 이동하고,\n` +
          `채팅·활동 기록 등 과거 기록은 그대로 남습니다.`
      )
    )
      return;
    for (const t of open) {
      await updateRow<Todo>(TABLES.todos, t.id, { assignee: "" });
    }
    await deleteRow(TABLES.members, m.id);
    logActivity(`팀원 "${m.name}" 내보내기`);
    alert(
      `내보냈습니다.\n같은 이름으로 다시 들어오는 걸 막으려면 아래 '비밀번호 잠금'에서 팀 비밀번호를 바꿔주세요.`
    );
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
    <div className="space-y-4 max-w-2xl mx-auto">
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

      {/* 내 정보 */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <UserRound size={16} strokeWidth={1.75} className="text-stone-500" />
          내 정보
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          현재 이름: <b>{me?.name}</b> — 이름을 바꾸면 할 일·판매·지출 등 모든 기록의 이름이 함께
          바뀝니다.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="새 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && renameMe()}
          />
          <button onClick={renameMe} disabled={renameBusy} className="btn-primary flex-shrink-0">
            {renameBusy ? "변경 중..." : "이름 변경"}
          </button>
        </div>
      </div>

      {/* 데이터 백업 */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <Download size={16} strokeWidth={1.75} className="text-stone-500" />
          데이터 백업
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          상품·거래처·매출·할 일 등 모든 데이터를 파일 하나로 저장합니다. 실수로 지웠거나 문제가
          생겼을 때를 대비해 <b>일주일에 한 번</b> 정도 받아두세요.
        </p>
        <button onClick={downloadBackup} disabled={backupBusy} className="btn-primary">
          <Download size={16} strokeWidth={1.75} />
          {backupBusy ? "만드는 중..." : "백업 파일 다운로드"}
        </button>
        <p className="text-xs text-stone-400 mt-3">
          복구가 필요하면 이 파일을 개발 담당(클로드)에게 전달하면 됩니다.
        </p>
      </div>

      {/* 알림 */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <Bell size={16} strokeWidth={1.75} className="text-stone-500" />
          아침 일정 알림
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          매일 아침 8시, 오늘 일정이 있는 날 폰으로 알림을 보내드립니다. 기기마다 한 번씩
          켜주세요. (아이폰은 홈 화면에 추가한 앱에서만 알림이 옵니다)
        </p>
        {pushState === "unsupported" ? (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-[10px] p-3">
            이 브라우저는 알림을 지원하지 않아요. 폰의 크롬(안드로이드) 또는 홈 화면에 추가한
            앱(아이폰)에서 열어주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={togglePush}
              disabled={pushState === null || pushBusy}
              className={pushState === true ? "btn-ghost" : "btn-primary"}
            >
              {pushState === null ? "확인 중..." : pushState === true ? "이 기기 알림 끄기" : "이 기기 알림 켜기"}
            </button>
            {pushState === true && (
              <button onClick={sendTest} disabled={pushBusy} className="btn-ghost">
                테스트 알림 보내기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 팀원 관리 */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <Users size={16} strokeWidth={1.75} className="text-stone-500" />
          팀원 관리
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          퇴사 등으로 나간 팀원을 내보낼 수 있습니다. 내보내면 그 사람의 미완료 할 일은
          &lsquo;담당자 미지정&rsquo;으로 이동합니다.
        </p>
        {members.length === 0 ? (
          <p className="text-sm text-stone-400">등록된 팀원이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => {
              const isAdminMember = adminRow?.value === m.name;
              const pending = m.approved === false;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2.5 rounded-[10px] border px-3 py-2"
                  style={pending ? { borderColor: "#fcd34d", background: "#fffbeb" } : { borderColor: "var(--border-soft)" }}
                >
                  <span className="avatar h-7 w-7 text-xs">{initialOf(m.name)}</span>
                  <span className="text-sm font-semibold">{m.name}</span>
                  {pending && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                      승인 대기
                    </span>
                  )}
                  {isAdminMember && (
                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                      관리자
                    </span>
                  )}
                  {m.name === me?.name && (
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">
                      나
                    </span>
                  )}
                  {pending && canManage ? (
                    <span className="ml-auto flex gap-2">
                      <button
                        onClick={() => approveMember(m)}
                        className="rounded-md bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-600 transition-colors"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => rejectMember(m)}
                        className="rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        거절
                      </button>
                    </span>
                  ) : (
                    canManage &&
                    m.name !== me?.name && (
                      <span className="ml-auto flex gap-2.5">
                        <button
                          onClick={() => renameOther(m)}
                          disabled={renameBusy}
                          className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-brand-600 transition-colors"
                        >
                          <Pencil size={12} strokeWidth={1.75} />
                          이름 변경
                        </button>
                        {!isAdminMember && (
                          <button
                            onClick={() => removeMember(m)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <UserMinus size={13} strokeWidth={1.75} />
                            내보내기
                          </button>
                        )}
                      </span>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!canManage && (
          <p className="text-xs text-stone-400 mt-3">내보내기는 관리자({adminRow?.value})만 할 수 있습니다.</p>
        )}

        {/* 명단에 없는 이름 (기록에만 등장) */}
        {ghostNames.length > 0 && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border-soft)" }}>
            <p className="text-xs font-semibold text-stone-500 mb-2">
              명단에 없는 이름 (기록에만 등장 — 잘못 입력했거나 예전에 들어왔던 이름)
            </p>
            <div className="space-y-1.5">
              {ghostNames.map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-2.5 rounded-[10px] border border-dashed px-3 py-2"
                  style={{ borderColor: "var(--border-1)" }}
                >
                  <span className="avatar h-7 w-7 text-xs">{initialOf(n)}</span>
                  <span className="text-sm font-semibold text-stone-500">{n}</span>
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                    미등록
                  </span>
                  {canManage && (
                    <button
                      onClick={() => cleanGhost(n)}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <UserMinus size={13} strokeWidth={1.75} />
                      정리
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
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
