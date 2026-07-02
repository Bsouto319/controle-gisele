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
}

export interface GiseleSessao {
  id: string
  patient_id: string
  numero_sessao: number
  servico_realizado: string | null
  data_sessao: string | null
  data_retorno: string | null
  assinatura_cliente: string | null
  created_at: string
}
