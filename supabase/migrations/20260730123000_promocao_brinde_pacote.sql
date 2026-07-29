-- Campo pra Dra. Gisele anotar o brinde/promocao prometido em cada pacote
-- vendido. E' por pacote (nao vitalicio do paciente) -- zera ao iniciar um novo.
alter table gisele_patients add column if not exists promocao_brinde text;
