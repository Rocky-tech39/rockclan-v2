-- RockClan Records v2 — 의견 게시판·결과 제출용 테이블
-- Supabase 대시보드 → SQL Editor → New query → 전체 붙여넣고 Run

create table if not exists feedback_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null check (char_length(author) between 1 and 40),
  screen text not null default '',
  category text not null default '의견',
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default '접수'
);

create table if not exists feedback_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references feedback_posts(id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1000)
);

create table if not exists feedback_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references feedback_posts(id) on delete cascade,
  voter text not null,
  unique (post_id, voter)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  match_date date not null,
  kind text not null check (kind in ('solo','team','pro')),
  team1 text[] not null default '{}',
  team2 text[] not null default '{}',
  sets jsonb not null,
  submitter text not null,
  confirmer text,
  status text not null default 'pending' check (status in ('pending','confirmed','disputed','canceled')),
  confirmed_by text,
  confirmed_at timestamptz,
  dispute_reason text
);

alter table feedback_posts enable row level security;
alter table feedback_comments enable row level security;
alter table feedback_votes enable row level security;
alter table submissions enable row level security;

-- 누구나 읽기·쓰기 (클랜 내부 시안용). 게시글 수정/삭제와 상태 변경은 대시보드에서 운영진만.
create policy "read posts" on feedback_posts for select using (true);
create policy "write posts" on feedback_posts for insert with check (status = '접수');
create policy "read comments" on feedback_comments for select using (true);
create policy "write comments" on feedback_comments for insert with check (true);
create policy "read votes" on feedback_votes for select using (true);
create policy "write votes" on feedback_votes for insert with check (true);
create policy "unvote" on feedback_votes for delete using (true);
create policy "read subs" on submissions for select using (true);
create policy "write subs" on submissions for insert with check (status = 'pending');
-- 대기 중인 제출만 확인/이의/취소로 바꿀 수 있음
create policy "confirm subs" on submissions for update using (status = 'pending') with check (status in ('confirmed','disputed','canceled'));
