-- Migration: planejador de injetáveis (mapa facial de pontos de aplicação)
-- Data: 2026-07-15

create table if not exists gisele_aplicacoes_faciais (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references gisele_patients(id) on delete cascade,
  pos_x numeric not null check (pos_x >= 0 and pos_x <= 100),
  pos_y numeric not null check (pos_y >= 0 and pos_y <= 100),
  regiao text,
  produto text not null,
  quantidade numeric not null,
  unidade text not null default 'UI',
  data_aplicacao date not null default current_date,
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gisele_aplicacoes_faciais_patient on gisele_aplicacoes_faciais(patient_id, data_aplicacao desc);

alter table gisele_aplicacoes_faciais enable row level security;

create policy auth_gisele_aplicacoes_faciais_all
  on gisele_aplicacoes_faciais for all to authenticated
  using (true) with check (true);

create policy only_admins_delete_gisele_aplicacoes_faciais
  on gisele_aplicacoes_faciais for delete to authenticated
  using (exists (select 1 from gisele_users g where g.user_id = auth.uid() and g.role = 'admin'));

comment on table gisele_aplicacoes_faciais is 'Pontos de aplicacao de injetaveis no mapa facial do paciente. Nao e escopado por ciclo/pacote - historico e sempre vitalicio do paciente, propositalmente, para a Dra. Gisele ver o que ja foi feito independente de pacote.';
comment on column gisele_aplicacoes_faciais.pos_x is 'Posicao horizontal no mapa facial, 0-100 (percentual da largura da imagem)';
comment on column gisele_aplicacoes_faciais.pos_y is 'Posicao vertical no mapa facial, 0-100 (percentual da altura da imagem)';
