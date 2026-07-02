import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GiseleLogo from '../components/GiseleLogo'

export default function NovoPaciente() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    pacote_contratado: '',
    procedimento_contratado: '',
    data_inicial: '',
    data_final: '',
    prazo_dias: '',
    observacoes: '',
  })

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const formatPhone = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 11)
    if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: patient, error: pErr } = await supabase
      .from('gisele_patients')
      .insert({
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        pacote_contratado: form.pacote_contratado,
        procedimento_contratado: form.procedimento_contratado || null,
        data_inicial: form.data_inicial || null,
        data_final: form.data_final || null,
        prazo_dias: form.prazo_dias ? Number(form.prazo_dias) : null,
        observacoes: form.observacoes || null,
      })
      .select()
      .single()

    if (pErr || !patient) {
      setError('Erro ao cadastrar cliente. Tente novamente.')
      setLoading(false)
      return
    }

    navigate(`/paciente/${patient.id}`)
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 bg-white transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header card */}
      <div className="bg-gradient-to-r from-brand to-brand-dark rounded-2xl p-5 mb-6 text-white shadow-md">
        <GiseleLogo width={220} textColor="#ffffff" />
        <p className="text-rose-light text-sm mt-3">Novo cliente — passaporte de tratamento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <span className="w-5 h-5 bg-brand/10 rounded-full flex items-center justify-center text-brand text-xs font-bold">1</span>
            Dados Pessoais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome completo *</label>
              <input
                required
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                className={inputCls}
                placeholder="Nome completo do cliente"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputCls}
                placeholder="email@cliente.com"
              />
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input
                value={form.telefone}
                onChange={(e) => set('telefone', formatPhone(e.target.value))}
                className={inputCls}
                placeholder="(61) 99999-9999"
              />
            </div>
          </div>
        </div>

        {/* Dados do pacote */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <span className="w-5 h-5 bg-brand/10 rounded-full flex items-center justify-center text-brand text-xs font-bold">2</span>
            Dados do Pacote
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Pacote aderido / contratado *</label>
              <input
                required
                value={form.pacote_contratado}
                onChange={(e) => set('pacote_contratado', e.target.value)}
                className={inputCls}
                placeholder="Ex: Pacote 10 sessões drenagem"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Procedimento contratado</label>
              <input
                value={form.procedimento_contratado}
                onChange={(e) => set('procedimento_contratado', e.target.value)}
                className={inputCls}
                placeholder="Ex: Drenagem linfática, botox, etc."
              />
            </div>
            <div>
              <label className={labelCls}>Data inicial</label>
              <input
                type="date"
                value={form.data_inicial}
                onChange={(e) => set('data_inicial', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Data final</label>
              <input
                type="date"
                value={form.data_final}
                onChange={(e) => set('data_final', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Prazo (dias)</label>
              <input
                type="number"
                min="0"
                value={form.prazo_dias}
                onChange={(e) => set('prazo_dias', e.target.value)}
                className={inputCls}
                placeholder="Ex: 90"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações</label>
              <textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                className={inputCls + ' resize-none'}
                placeholder="Alergias, contraindicações, observações importantes..."
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-3 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium bg-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-brand text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-dark transition-colors disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                Cadastrando...
              </>
            ) : (
              '✓ Cadastrar Cliente'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
