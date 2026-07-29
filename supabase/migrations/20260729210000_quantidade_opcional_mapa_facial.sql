-- Dra. Gisele: nem toda marcação no mapa facial precisa de dose/quantidade —
-- às vezes é só marcar o ponto onde foi feito, sem informar a quantidade exata.
alter table gisele_aplicacoes_faciais alter column quantidade drop not null;
alter table gisele_aplicacoes_faciais alter column unidade drop not null;
