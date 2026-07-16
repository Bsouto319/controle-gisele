-- Migration: ciclos de pacote (histórico ao concluir + novo pacote automático)
-- Data: 2026-07-15

alter table gisele_patients
  add column if not exists ciclo_atual integer not null default 1;

alter table gisele_sessoes
  add column if not exists ciclo integer not null default 1;

-- Troca a unicidade de (patient_id, numero_sessao) para (patient_id, ciclo, numero_sessao),
-- ja que um novo pacote reinicia a contagem de sessao em 1.
alter table gisele_sessoes
  drop constraint if exists gisele_sessoes_patient_id_numero_sessao_key;
alter table gisele_sessoes
  add constraint gisele_sessoes_patient_id_ciclo_numero_sessao_key unique (patient_id, ciclo, numero_sessao);

create index if not exists idx_gisele_sessoes_patient_ciclo on gisele_sessoes(patient_id, ciclo);

comment on column gisele_patients.ciclo_atual is 'Pacote em andamento. Ciclos < ciclo_atual sao historico (somente leitura na ficha).';
comment on column gisele_sessoes.ciclo is 'A qual ciclo/pacote esta sessao pertence.';
