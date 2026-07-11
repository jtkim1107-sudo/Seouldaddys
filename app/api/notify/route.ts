// 푸시 알림 발송 API
// - Vercel Cron이 매일 아침(KST 08:00) 호출 → 오늘의 일정 브리핑 발송
// - 설정 페이지의 "테스트 알림" 버튼도 이 API를 호출
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { occursOn } from "@/lib/events";
import type { CalEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const VAPID_PUBLIC =
  "BA-F-DLuod-AM8VzICAQ1FKjzlybTogQ_LJRcM3P4Q4MQvtRxKtB9hoF2KHAPR2zuypJhp75fO6Yu0JZkRP7j70";

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase 설정이 없습니다." }, { status: 500 });
  }
  if (!vapidPrivate) {
    return NextResponse.json(
      { error: "VAPID_PRIVATE_KEY 환경변수가 없습니다. Vercel 설정에 추가해주세요." },
      { status: 500 }
    );
  }

  // 크론 호출 검증 (CRON_SECRET 설정 시) — 테스트 호출(?test=1)은 허용
  const isTest = req.nextUrl.searchParams.get("test") === "1";
  const secret = process.env.CRON_SECRET;
  if (!isTest && secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  webpush.setVapidDetails("mailto:team@seouldaddys.app", VAPID_PUBLIC, vapidPrivate);
  const db = createClient(url, key);

  // 오늘의 일정 수집 (반복·기간 일정 포함)
  const today = kstToday();
  const { data: events, error: evErr } = await db.from("events").select("*");
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });
  const todays = ((events || []) as CalEvent[])
    .filter((e) => occursOn(e, today))
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));

  let body: string;
  if (isTest) {
    body =
      "알림이 잘 연결됐습니다. 매일 아침 8시에 오늘의 일정을 보내드릴게요." +
      (todays.length ? `\n오늘 일정 ${todays.length}건 있음` : "");
  } else if (todays.length === 0) {
    // 일정 없는 날은 조용히 넘어감
    return NextResponse.json({ ok: true, sent: 0, reason: "오늘 일정 없음" });
  } else {
    body = todays
      .map((e) => `${e.time ? e.time + " " : ""}${e.title}`)
      .join("\n")
      .slice(0, 500);
  }

  const payload = JSON.stringify({
    title: isTest ? "서울아빠들 · 알림 테스트" : `오늘의 일정 ${todays.length}건`,
    body,
    url: "/calendar",
  });

  // 모든 구독 기기에 발송 (만료된 구독은 정리)
  const { data: subs, error: subErr } = await db.from("push_subs").select("*");
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  let sent = 0;
  const results = await Promise.allSettled(
    (subs || []).map(async (row: { id: string; sub: webpush.PushSubscription }) => {
      try {
        await webpush.sendNotification(row.sub, payload);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subs").delete().eq("id", row.id);
        }
        throw e;
      }
    })
  );
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, sent, failed, events: todays.length });
}
