import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { GiselePatient, GiseleSessao } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ImportCSVModal from '../components/ImportCSVModal'

interface PatientWithSessoes extends GiselePatient {
  sessoes: GiseleSessao[]
}

type FilterTab = 'ativos' | 'inativos' | 'todos'

export default function Admin() {
  const [patients, setPatients] = useState<PatientWithSessoes[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('ativos')
  const [showImport, setShowImport] = useState(false)

  async function load() {
    setLoading(true)
    const { data: pts } = await supabase
      .from('gisele_patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (!pts) return setLoading(false)

    const { data: sessoes } = await supabase.from('gisele_sessoes').select('*')

    setPatients(pts.map((p) => ({ ...p, sessoes: sessoes?.filter((s) => s.patient_id === p.id) ?? [] })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function exportCSV() {
    const rows = [
      ['Nome', 'Email', 'Telefone', 'Pacote', 'Procedimento', 'Sessões contratadas', 'Data Inicial', 'Data Final', 'Prazo (dias)', 'Sessões realizadas', 'Cadastro'],
      ...patients.map((p) => [
        p.nome,
        p.email ?? '',
        p.telefone ?? '',
        p.pacote_contratado,
        p.procedimento_contratado ?? '',
        p.quantidade_sessoes ?? '',
        p.data_inicial ? format(new Date(p.data_inicial + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '',
        p.data_final ? format(new Date(p.data_final + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '',
        p.prazo_dias ?? '',
        p.sessoes.filter((s) => s.data_sessao).length,
        format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR }),
      ]),
    ]
    const csv = 'sep=;\n' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-gisele-${format(new Date(), 'dd-MM-yyyy')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ativos = patients.filter((p) => p.ativo !== false)
  const inativos = patients.filter((p) => p.ativo === false)

  const byTab = tab === 'ativos' ? ativos : tab === 'inativos' ? inativos : patients

  const filtered = byTab.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()))

  const totalConcluidos = ativos.filter((p) => {
    const total = p.quantidade_sessoes ?? p.sessoes.length
    const feitas = p.sessoes.filter((s) => s.data_sessao).length
    return total > 0 && feitas >= total
  }).length
  const totalEmAndamento = ativos.length - totalConcluidos

  return (
    <>
    {showImport && <ImportCSVModal onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); load() }} />}
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">{patients.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total</div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center shadow-sm">
          <div className="text-2xl sm:text-3xl font-bold text-green-700">{totalConcluidos}</div>
          <div className="text-xs text-green-600 mt-0.5">Pacotes concluídos</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 text-center shadow-sm">
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">{totalEmAndamento}</div>
          <div className="text-xs text-amber-600 mt-0.5">Em andamento</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {([['ativos', `Ativos (${ativos.length})`], ['inativos', `Inativos (${inativos.length})`], ['todos', 'Todos']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium bg-white"
          >
            ↑ <span className="hidden sm:inline">Importar</span> CSV
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium bg-white"
          >
            ↓ <span className="hidden sm:inline">Exportar</span> CSV
          </button>
          <Link
            to="/novo-paciente"
            className="flex items-center gap-1.5 bg-brand text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            + <span className="hidden sm:inline">Novo</span> Cliente
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"/>
            <span className="text-sm">Carregando clientes...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">💆‍♀️</div>
          <p className="text-gray-600 font-medium">Nenhum cliente encontrado</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            {search ? 'Tente buscar por outro nome.' : 'Comece cadastrando o primeiro cliente.'}
          </p>
          {!search && (
            <Link to="/novo-paciente" className="inline-flex items-center gap-1 text-brand underline text-sm font-medium">
              + Cadastrar primeiro cliente
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="sm:hidden space-y-2.5">
            {filtered.map((p) => {
              const feitas = p.sessoes.filter((s) => s.data_sessao).length
              return (
                <Link
                  key={p.id}
                  to={`/paciente/${p.id}`}
                  className={`block bg-white rounded-xl border p-4 hover:shadow-sm transition-all ${p.ativo === false ? 'border-gray-200 opacity-60' : 'border-gray-200 hover:border-brand/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold truncate ${p.ativo === false ? 'text-gray-400' : 'text-gray-800'}`}>{p.nome}</p>
                        {p.ativo === false && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">Inativo</span>}
                      </div>
                    </div>
                    <span className="text-brand text-sm font-semibold flex-shrink-0">Ver →</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs text-gray-400">{p.pacote_contratado}</span>
                    <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">{feitas}/{p.quantidade_sessoes ?? p.sessoes.length ?? '—'}</span>
                    <span className="text-xs text-gray-300 ml-auto">
                      {format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Table — desktop */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-brand to-brand-dark text-white">
                  <th className="text-left px-5 py-3 font-semibold text-sm">Cliente</th>
                  <th className="text-left px-5 py-3 font-semibold text-sm">Pacote</th>
                  <th className="text-left px-5 py-3 font-semibold text-sm">Sessões</th>
                  <th className="text-left px-5 py-3 font-semibold text-sm">Cadastro</th>
                  <th className="px-5 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const feitas = p.sessoes.filter((s) => s.data_sessao).length
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors group ${p.ativo === false ? 'opacity-50' : 'hover:bg-rose-light/40'}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          {p.nome}
                          {p.ativo === false && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Inativo</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{p.pacote_contratado}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">{feitas}/{p.sessoes.length || 10}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/paciente/${p.id}`}
                          className="text-brand font-semibold text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} {search ? 'encontrado' : 'cadastrado'}{filtered.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </>
  )
}
