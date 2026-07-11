"use client";

import { useTable } from "./useTable";
import { getCurrentUser } from "./db";
import { TABLES, type Setting } from "./types";

// 관리자 권한 확인
// - 설정에서 관리자가 지정되어 있으면: 그 사람만 삭제 등 관리 작업 가능
// - 지정되어 있지 않으면: 기존처럼 모두 가능
export function useAdmin() {
  const { rows: settings, loading } = useTable<Setting>(TABLES.settings);
  const adminName = settings.find((s) => s.key === "admin_name")?.value || "";
  const me = getCurrentUser();
  const isAdmin = !adminName || adminName === me?.name;
  return { adminName, isAdmin, loading };
}
