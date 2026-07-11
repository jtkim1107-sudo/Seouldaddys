export interface Member {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export type TodoStatus = "todo" | "doing" | "done";

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  assignee: string; // 멤버 이름
  due: string; // YYYY-MM-DD, 없으면 ""
  created_at: string;
}

export interface Message {
  id: string;
  author: string;
  emoji: string;
  content: string;
  created_at: string;
}

export type EventRepeat = "" | "weekly" | "monthly";

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (시작일)
  end_date?: string; // 종료일 (여러 날 일정, 없으면 하루)
  time: string; // HH:MM, 없으면 ""
  memo: string;
  author: string;
  repeat?: EventRepeat; // 예전 데이터에는 없을 수 있음
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  author: string;
  created_at: string;
}

export interface Product {
  id: string;
  code: string; // 상품코드
  name: string; // 상품명
  category: string;
  price: number; // 판매가
  cost: number; // 원가
  stock: number; // 재고
  supplier: string; // 공급처
  drive_url: string; // 구글드라이브 링크
  memo: string;
  created_at: string;
}

export interface FileLink {
  id: string;
  title: string;
  url: string;
  category: string;
  memo: string;
  author: string;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string; // 거래처명
  contact_name: string; // 담당자
  phone: string;
  email: string;
  category: string; // 공급처/물류/기타 등
  terms: string; // 거래 조건
  memo: string;
  site_url: string; // 사이트 주소 (발주 사이트 등)
  login_id: string; // 사이트 아이디
  login_pw: string; // 사이트 비밀번호
  updated_by: string; // 마지막 수정자
  created_at: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[]; // 선택지
  votes: Record<string, number>; // 이름 -> 선택지 번호
  closed: boolean;
  author: string;
  created_at: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string; // 예: 상품 "티셔츠" 등록
  created_at: string;
}

// 재고 수불 기록 (판매/입고/보정) — 저장 시 상품 정보를 스냅샷으로 보관
export interface StockMove {
  id: string;
  date: string; // YYYY-MM-DD
  type: "sale" | "in" | "adjust";
  product_id: string;
  product_name: string;
  qty: number; // 판매·입고는 양수, 보정은 증감(+/-)
  unit_price: number; // 판매가 또는 입고 단가
  unit_cost: number; // 당시 원가 (이익 계산용)
  amount: number; // qty * unit_price
  channel: string; // 판매 채널
  partner: string; // 입고 공급처
  memo: string;
  author: string;
  created_at: string;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // 매출액(원)
  channel: string; // 판매 채널 (스마트스토어 등)
  memo: string;
  author: string;
  created_at: string;
}

export interface PushSub {
  id: string;
  name: string; // 구독한 팀원 이름
  sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
}

export const TABLES = {
  members: "members",
  todos: "todos",
  messages: "messages",
  events: "events",
  notices: "notices",
  products: "products",
  files: "files",
  partners: "partners",
  polls: "polls",
  activities: "activities",
  sales: "sales",
  stock_moves: "stock_moves",
  settings: "settings",
  push_subs: "push_subs",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
