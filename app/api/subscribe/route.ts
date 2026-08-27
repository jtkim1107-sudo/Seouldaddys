// 푸시 구독 저장/해제 API
// - 알림 켜기, 앱 열 때 자동 재동기화, 서비스 워커의 구독 갱신이 모두 이 API로 저장
// - 서버에서 직접 DB에 쓰기 때문에 어떤 모드에서도 구독이 서버에 확실히 저장된다
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type SubBody = {
  name?: string;
  sub?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  oldEndpoint?: string; // 구독이 갱신된 경우 이전 구독 주소 (정리용)
};

// 구독 저장 (같은 기기의 기존 행은 지우고 새로 저장 → 항상 최신 상태 유지)
export async function POST(req: NextRequest) {
  const client = db();
  if (!client) {
    return NextResponse.json({ error: "Supabase 설정이 없습니다." }, { status: 500 });
  }
  let body: SubBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const sub = body.sub;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }

  // 이전 구독(갱신 전 주소) 정리
  if (body.oldEndpoint && body.oldEndpoint !== sub.endpoint) {
    await client.from("push_subs").delete().eq("sub->>endpoint", body.oldEndpoint);
  }
  // 같은 기기 중복 행 제거 후 저장
  const { error: delErr } = await client
    .from("push_subs")
    .delete()
    .eq("sub->>endpoint", sub.endpoint);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  const { error: insErr } = await client
    .from("push_subs")
    .insert({ name: body.name || "", sub });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 구독 해제 (알림 끄기)
export async function DELETE(req: NextRequest) {
  const client = db();
  if (!client) {
    return NextResponse.json({ error: "Supabase 설정이 없습니다." }, { status: 500 });
  }
  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  }
  const { error } = await client.from("push_subs").delete().eq("sub->>endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
