-- Dra. Gisele quer poder adicionar novos procedimentos ela mesma (ex: Mesoterapia
-- Capilar), sem depender de mudança de código. Lista deixa de ser fixa no front.
create table if not exists gisele_procedimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cor text not null default '#3b82f6',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into gisele_procedimentos (nome, cor) values
  ('Toxina Botulínica', '#3b82f6'),
  ('Preenchimento', '#e0546b'),
  ('Bioestimulador de Colágeno', '#8b5cf6'),
  ('Biorremodelador', '#d4a418'),
  ('Fios de PDO', '#22a06b'),
  ('Mesoterapia Capilar', '#0891b2')
on conflict (nome) do nothing;

alter table gisele_procedimentos enable row level security;

-- Lição do bug do pronutro_pagamentos: RESTRICTIVE sem PERMISSIVE bloqueia todo
-- mundo. Aqui: leitura permissiva pra qualquer autenticado, escrita permissiva
-- só pra admin (nao restrictive sozinha).
drop policy if exists "authenticated_read_procedimentos" on gisele_procedimentos;
create policy "authenticated_read_procedimentos"
  on gisele_procedimentos
  for select
  to authenticated
  using (true);

drop policy if exists "only_admins_write_procedimentos" on gisele_procedimentos;
create policy "only_admins_write_procedimentos"
  on gisele_procedimentos
  for insert
  to authenticated
  with check (exists (select 1 from gisele_users g where g.user_id = auth.uid() and g.role = 'admin'));

drop policy if exists "only_admins_update_procedimentos" on gisele_procedimentos;
create policy "only_admins_update_procedimentos"
  on gisele_procedimentos
  for update
  to authenticated
  using (exists (select 1 from gisele_users g where g.user_id = auth.uid() and g.role = 'admin'))
  with check (exists (select 1 from gisele_users g where g.user_id = auth.uid() and g.role = 'admin'));
