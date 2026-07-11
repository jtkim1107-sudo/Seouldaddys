-- 서울아빠들 앱 데이터베이스 스키마
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.

create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '👨',
  created_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'todo', -- todo | doing | done
  assignee text not null default '',
  due text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  emoji text not null default '👨',
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text not null,
  time text not null default '',
  memo text not null default '',
  author text not null default '',
  repeat text not null default '', -- '' | weekly | monthly
  end_date text not null default '', -- 여러 날 일정의 종료일
  created_at timestamptz not null default now()
);
alter table events add column if not exists repeat text not null default '';
alter table events add column if not exists end_date text not null default '';

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  pinned boolean not null default false,
  author text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text not null default '',
  name text not null,
  category text not null default '',
  price numeric not null default 0,
  cost numeric not null default 0,
  stock numeric not null default 0,
  supplier text not null default '',
  drive_url text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text not null default '기타',
  memo text not null default '',
  author text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  category text not null default '공급처',
  terms text not null default '',
  memo text not null default '',
  site_url text not null default '',
  login_id text not null default '',
  login_pw text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now()
);
alter table partners add column if not exists site_url text not null default '';
alter table partners add column if not exists login_id text not null default '';
alter table partners add column if not exists login_pw text not null default '';
alter table partners add column if not exists updated_by text not null default '';

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]',
  votes jsonb not null default '{}',
  closed boolean not null default false,
  author text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  "user" text not null default '',
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  amount numeric not null default 0,
  channel text not null default '',
  memo text not null default '',
  author text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists push_subs (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  sub jsonb not null,
  created_at timestamptz not null default now()
);

-- 팀 내부용 앱: anon 키를 가진 사용자(= 앱 주소를 아는 팀원)에게 전체 권한 허용
-- 앱 주소와 키는 팀 밖으로 공유하지 마세요.
do $$
declare
  t text;
begin
  foreach t in array array['members','todos','messages','events','notices','products','files','partners','polls','activities','sales','settings','push_subs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "team_all" on %I', t);
    execute format('create policy "team_all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- 채팅 등 실시간 반영 활성화
do $$
declare
  t text;
begin
  foreach t in array array['members','todos','messages','events','notices','products','files','partners','polls','activities','sales','settings','push_subs']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when others then null;
    end;
  end loop;
end $$;
