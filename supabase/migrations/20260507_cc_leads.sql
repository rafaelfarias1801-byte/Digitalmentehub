-- Tabela de leads do Carlos Cavalheiro
create table if not exists public.cc_leads (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('livro', 'mentoria')),
  nome        text not null,
  email       text not null,
  cargo       text,
  mensagem    text,
  status      text not null default 'novo' check (status in ('novo', 'contatado', 'convertido')),
  created_at  timestamptz not null default now()
);

-- RLS: apenas admin e o próprio Carlos podem ler/escrever
alter table public.cc_leads enable row level security;

-- Leitura: admin ou Carlos (substitua o UUID abaixo pelo user_id real do Carlos)
create policy "cc_leads_select" on public.cc_leads
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (role = 'admin' or id = '004a0191-3e94-4552-84b0-ae499ffde54d')
    )
  );

-- Update (alterar status): admin ou Carlos
create policy "cc_leads_update" on public.cc_leads
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (role = 'admin' or id = '004a0191-3e94-4552-84b0-ae499ffde54d')
    )
  );

-- Insert: público (formulário externo da landing page)
create policy "cc_leads_insert" on public.cc_leads
  for insert with check (true);
