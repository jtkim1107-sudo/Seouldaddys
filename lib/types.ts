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

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 없으면 ""
  memo: string;
  author: string;
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

export const TABLES = {
  members: "members",
  todos: "todos",
  messages: "messages",
  events: "events",
  notices: "notices",
  products: "products",
  files: "files",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
