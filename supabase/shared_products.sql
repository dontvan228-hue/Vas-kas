create table if not exists public.shared_products (
  barcode text primary key check (barcode ~ '^[0-9]{8,14}$'),
  name text not null check (char_length(name) between 2 and 80),
  kcal numeric not null check (kcal >= 0 and kcal <= 900),
  protein numeric not null default 0 check (protein >= 0 and protein <= 100),
  fat numeric not null default 0 check (fat >= 0 and fat <= 100),
  carbs numeric not null default 0 check (carbs >= 0 and carbs <= 100),
  fiber numeric not null default 0 check (fiber >= 0 and fiber <= 100),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.shared_products enable row level security;
create policy "read all" on public.shared_products
  for select to anon, authenticated using (true);
create policy "add own" on public.shared_products
  for insert to authenticated with check (auth.uid() = created_by);
