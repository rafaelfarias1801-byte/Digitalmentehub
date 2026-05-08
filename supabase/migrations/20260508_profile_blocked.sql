-- Adiciona coluna is_blocked na tabela profiles
alter table public.profiles
  add column if not exists is_blocked boolean not null default false;
