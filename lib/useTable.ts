"use client";

import { useCallback, useEffect, useState } from "react";
import { listRows, subscribeTable } from "./db";
import type { TableName } from "./types";

// 테이블 데이터를 불러오고, 변경(실시간/로컬)이 생기면 자동으로 다시 불러오는 훅
export function useTable<T extends { id: string; created_at: string }>(
  table: TableName,
  ascending = false
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setRows(await listRows<T>(table, ascending));
      setError(null);
    } catch (e) {
      console.error(`${table} 불러오기 실패`, e);
      const detail =
        (e as { message?: string })?.message || JSON.stringify(e) || String(e);
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, [table, ascending]);

  useEffect(() => {
    reload();
    return subscribeTable(table, reload);
  }, [table, reload]);

  return { rows, loading, error, reload };
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
