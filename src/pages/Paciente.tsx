import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SignaturePad, { type SignaturePadHandle } from '../components/SignaturePad'
import type { GiselePatient, GiseleSessao } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Paciente() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<GiselePatient | null>(null)
  const [sessoes, setSessoes] = useState<GiseleSessao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [sessaoForm, setSessaoForm] = useState<Record<number, Partial<GiseleSessao>>>({})
  const [activeSig, setActiveSig] = useState<number | null>(null)
  const [numSessoes, setNumSessoes] = useState(10)

  // Edição de dados do cliente
  const [editingPatient, setEditingPatient] = useState(false)
  const [editForm, setEditForm] = useState<Partial<GiselePatient>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const sigRefs = useRef<Record<number, SignaturePadHandle | null>>({})

  async function loadData() {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('gisele_patients').select('*').eq('id', id).single(),
      supabase.from('gisele_sessoes').select('*').eq('patient_id', id).order('numero_sessao'),
    ])
    setPatient(p)
    setSessoes(s ?? [])

    const maxExisting = s && s.length > 0 ? Math.max(...(s as GiseleSessao[]).map(r => r.numero_sessao)) : 0
    const total = Math.max(10, maxExisting)
    setNumSessoes(total)

    const initial: Record<number, Partial<GiseleSessao>> = {}
    for (let n = 1; n <= total; n++) {
      const found = (s as GiseleSessao[])?.find(r => r.numero_sessao === n)
      initial[n] = found ?? { numero_sessao: n }
    }
    setSessaoForm(initial)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  const setField = (numero: number, field: string, value: string) =>
    setSessaoForm((f) => ({ ...f, [numero]: { ...f[numero], [field]: value } }))

  async function saveSessao(numero: number) {
    setSaving(numero)
    const data = sessaoForm[numero]
    const sig = sigRefs.current[numero]
    const sigData = sig && !sig.isEmpty() ? sig.toDataURL() : (data.assinatura_cliente ?? null)

    const payload = {
      patient_id: id!,
      numero_sessao: numero,
      servico_realizado: data.servico_realizado ?? null,
      data_sessao: data.data_sessao ?? null,
      assinatura_cliente: sigData,
    }

    const existing = sessoes.find((s) => s.numero_sessao === numero)
    if (existing) {
      await supabase.from('gisele_sessoes').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('gisele_sessoes').insert(payload)
    }

    const { data: updated } = await supabase.from('gisele_sessoes').select('*').eq('patient_id', id).order('numero_sessao')
    setSessoes(updated ?? [])
    setActiveSig(null)
    setSaving(null)
  }

  async function savePatientEdit() {
    if (!patient) return
    setSavingEdit(true)
    await supabase.from('gisele_patients').update(editForm).eq('id', patient.id)
    setPatient(p => p ? { ...p, ...editForm } : p)
    setEditingPatient(false)
    setSavingEdit(false)
  }

  async function toggleAtivo() {
    if (!patient) return
    const novoStatus = patient.ativo === false ? true : false
    const acao = novoStatus ? 'reativar' : 'inativar'
    if (!confirm(`Deseja ${acao} o cliente ${patient.nome}?`)) return
    setTogglingStatus(true)
    await supabase.from('gisele_patients').update({ ativo: novoStatus }).eq('id', patient.id)
    setPatient((p) => p ? { ...p, ativo: novoStatus } : p)
    setTogglingStatus(false)
  }

  async function deletarPaciente() {
    if (!patient) return
    if (!confirm(`ATENÇÃO: Isso apagará permanentemente o cliente ${patient.nome} e todos os seus dados. Confirma?`)) return
    if (!confirm(`Última confirmação — apagar ${patient.nome} definitivamente?`)) return
    await supabase.from('gisele_sessoes').delete().eq('patient_id', patient.id)
    await supabase.from('gisele_patients').delete().eq('id', patient.id)
    navigate('/')
  }

  function addSessao() {
    const next = numSessoes + 1
    setNumSessoes(next)
    setSessaoForm(f => ({ ...f, [next]: f[next] ?? { numero_sessao: next } }))
    setTimeout(() => {
      document.getElementById(`sessao-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>
  if (!patient) return <div className="py-12 text-center text-gray-400">Cliente não encontrado.</div>

  const concluidas = sessoes.filter(s => s.data_sessao).length

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-brand hover:underline">← Voltar</Link>

      {/* Dados do cliente */}
      <div className={`bg-white rounded-xl border p-6 ${patient.ativo === false ? 'border-gray-300 bg-gray-50' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">{patient.nome}</h1>
            {patient.ativo === false && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Inativo</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editingPatient && (
              <button
                onClick={() => {
                  setEditForm({
                    nome: patient.nome,
                    pacote_contratado: patient.pacote_contratado,
                    procedimento_contratado: patient.procedimento_contratado,
                    data_inicial: patient.data_inicial,
                    data_final: patient.data_final,
                    prazo_dias: patient.prazo_dias,
                    observacoes: patient.observacoes,
                  })
                  setEditingPatient(true)
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
              >
                ✏️ Editar
              </button>
            )}
            <button
              onClick={toggleAtivo}
              disabled={togglingStatus}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                patient.ativo === false
                  ? 'border-green-300 text-green-700 hover:bg-green-50'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {togglingStatus ? '...' : patient.ativo === false ? '✓ Reativar' : 'Inativar'}
            </button>
            <button
              onClick={deletarPaciente}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-colors"
            >
              Apagar
            </button>
          </div>
        </div>

        {editingPatient ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs text-gray-500 block mb-1">Nome completo</label>
                <input
                  value={editForm.nome ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs text-gray-500 block mb-1">Pacote aderido / contratado</label>
                <input
                  value={editForm.pacote_contratado ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, pacote_contratado: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs text-gray-500 block mb-1">Procedimento contratado</label>
                <input
                  value={editForm.procedimento_contratado ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, procedimento_contratado: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data inicial</label>
                <input
                  type="date"
                  value={editForm.data_inicial ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, data_inicial: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data final</label>
                <input
                  type="date"
                  value={editForm.data_final ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, data_final: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prazo (dias)</label>
                <input
                  type="number"
                  value={editForm.prazo_dias ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, prazo_dias: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Observações</label>
              <textarea
                rows={2}
                value={editForm.observacoes ?? ''}
                onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={savePatientEdit}
                disabled={savingEdit}
                className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {savingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                onClick={() => setEditingPatient(false)}
                className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-500">Pacote:</span><br /><span className="font-medium">{patient.pacote_contratado || '—'}</span></div>
              <div><span className="text-gray-500">Procedimento:</span><br /><span className="font-medium">{patient.procedimento_contratado || '—'}</span></div>
              <div><span className="text-gray-500">Prazo:</span><br /><span className="font-medium">{patient.prazo_dias ? `${patient.prazo_dias} dias` : '—'}</span></div>
              <div><span className="text-gray-500">Data inicial:</span><br /><span className="font-medium">{patient.data_inicial ? format(new Date(patient.data_inicial + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span></div>
              <div><span className="text-gray-500">Data final:</span><br /><span className="font-medium">{patient.data_final ? format(new Date(patient.data_final + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span></div>
              <div><span className="text-gray-500">Cadastro:</span><br /><span className="font-medium">{format(new Date(patient.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span></div>
            </div>
            {patient.observacoes && (
              <div className="mt-3 text-sm bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <span className="text-yellow-700 font-medium">Obs:</span> {patient.observacoes}
              </div>
            )}
          </>
        )}
      </div>

      {/* Regras do passaporte */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-xs text-gray-500 space-y-1.5">
        <h2 className="font-bold text-gray-800 text-sm mb-2">Regras do Passaporte de Tratamento</h2>
        <p>1. Em caso de não comparecimento no horário agendado, sem aviso prévio mínimo de 24 horas, o serviço constará como feito.</p>
        <p>2. O pacote é intransferível, não podendo ser colocado outra pessoa no lugar.</p>
        <p>3. O pacote deverá ser concluído no prazo de até {patient.prazo_dias ?? '___'} dias, contando da data da 1ª sessão.</p>
        <p>4. Os resultados do tratamento dependem da realização das sessões conforme o protocolo e do cumprimento das orientações de rotina home care.</p>
      </div>

      {/* Sessões */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-bold text-gray-800">Controle de Realização de Procedimentos</h2>
            <p className="text-xs text-gray-400 mt-0.5">{concluidas} de {numSessoes} sessões realizadas</p>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: numSessoes }, (_, i) => i + 1).map((numero) => {
            const saved = sessoes.find((s) => s.numero_sessao === numero)
            const form = sessaoForm[numero] ?? {}
            const isSaved = !!saved?.data_sessao

            return (
              <div
                key={numero}
                id={`sessao-${numero}`}
                className={`border rounded-xl p-4 transition-colors ${isSaved ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">
                    Sessão {numero}
                    {isSaved && <span className="ml-2 text-xs text-green-600 font-normal">✓ Realizada</span>}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Serviço realizado</label>
                    <input type="text"
                      value={form.servico_realizado ?? ''}
                      onChange={(e) => setField(numero, 'servico_realizado', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="Ex: Drenagem linfática" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Data</label>
                    <input type="date"
                      value={form.data_sessao ?? ''}
                      onChange={(e) => setField(numero, 'data_sessao', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand" />
                  </div>
                </div>

                {/* Assinatura */}
                <div className="mb-3">
                  {saved?.assinatura_cliente && activeSig !== numero ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Assinatura do cliente:</p>
                      <img src={saved.assinatura_cliente} alt="Assinatura" className="border border-gray-200 rounded max-h-16" />
                      <button onClick={() => setActiveSig(numero)} className="text-xs text-brand hover:underline mt-1 block">Refazer</button>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Assinatura do cliente</label>
                      <SignaturePad ref={(el) => { sigRefs.current[numero] = el }} />
                      <button onClick={() => sigRefs.current[numero]?.clear()} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Limpar</button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => saveSessao(numero)}
                  disabled={saving === numero}
                  className="w-full sm:w-auto bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
                >
                  {saving === numero ? 'Salvando...' : isSaved ? 'Atualizar' : 'Salvar Sessão'}
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={addSessao}
          className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-brand hover:text-brand font-medium transition-colors"
        >
          + Adicionar Sessão {numSessoes + 1}
        </button>
      </div>
    </div>
  )
}
