create table if not exists public.photo_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.photo_usage enable row level security;
-- политик нет специально: читать и писать может только серверная функция
