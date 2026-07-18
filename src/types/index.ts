export interface GiselePatient {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  pacote_contratado: string
  data_inicial: string | null
  data_final: string | null
  prazo_dias: number | null
  procedimento_contratado: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  quantidade_sessoes: number | null
  pacote_travado_em: string | null
  pacote_concluido_notificado_em: string | null
  ciclo_atual: number
}

export interface GiseleSessao {
  id: string
  patient_id: string
  ciclo: number
  numero_sessao: number
  servico_realizado: string | null
  data_sessao: string | null
  data_retorno: string | null
  assinatura_cliente: string | null
  created_at: string
}

export interface AplicacaoFacial {
  id: string
  patient_id: string
  pos_x: number
  pos_y: number
  pos_x2: number | null
  pos_y2: number | null
  tipo: 'ponto' | 'risco'
  regiao: string | null
  produto: string
  quantidade: number
  unidade: string
  data_aplicacao: string
  observacoes: string | null
  created_at: string
}
