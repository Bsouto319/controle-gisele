import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AplicacaoFacial } from '../types'

const PRODUTOS = ['Botox', 'Preenchimento', 'Bioestimulador', 'Fios', 'Outro'] as const

const CORES: Record<string, string> = {
  Botox: '#3b82f6',
  Preenchimento: '#ec4899',
  Bioestimulador: '#8b5cf6',
  Fios: '#f59e0b',
  Outro: '#6b7280',
}

function corProduto(produto: string) {
  return CORES[produto] ?? CORES.Outro
}

interface Props {
  patientId: string
  aplicacoes: AplicacaoFacial[]
  onAdd: (novo: Omit<AplicacaoFacial, 'id' | 'created_at'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  canDelete: boolean
}

export default function MapaFacial({ patientId, aplicacoes, onAdd, onDelete, canDelete }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [pontoNovo, setPontoNovo] = useState<{ x: number; y: number } | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [form, setForm] = useState({ produto: 'Botox', quantidade: '', unidade: 'UI', data_aplicacao: new Date().toISOString().split('T')[0], observacoes: '' })
  const [saving, setSaving] = useState(false)

  function handleFaceClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setSelecionado(null)
    setPontoNovo({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
    setForm({ produto: 'Botox', quantidade: '', unidade: 'UI', data_aplicacao: new Date().toISOString().split('T')[0], observacoes: '' })
  }

  async function salvarPonto() {
    if (!pontoNovo || !form.quantidade) return
    setSaving(true)
    await onAdd({
      patient_id: patientId,
      pos_x: pontoNovo.x,
      pos_y: pontoNovo.y,
      regiao: null,
      produto: form.produto,
      quantidade: Number(form.quantidade),
      unidade: form.unidade,
      data_aplicacao: form.data_aplicacao,
      observacoes: form.observacoes || null,
    })
    setSaving(false)
    setPontoNovo(null)
  }

  const historico = [...aplicacoes].sort((a, b) => (a.data_aplicacao < b.data_aplicacao ? 1 : -1))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden select-none" style={{ aspectRatio: '3/4' }}>
          <svg
            ref={svgRef}
            viewBox="0 0 100 133"
            className="w-full h-full cursor-crosshair"
            onClick={handleFaceClick}
          >
            {/* Rosto — contorno esquemático simples, visão frontal */}
            <ellipse cx="50" cy="60" rx="32" ry="42" fill="#fdf4ec" stroke="#d9c2ac" strokeWidth="1" />
            {/* Testa (linha de referência) */}
            <path d="M 22 40 Q 50 30 78 40" fill="none" stroke="#e5d3c0" strokeWidth="0.7" />
            {/* Sobrancelhas */}
            <path d="M 30 48 Q 37 44 44 47" fill="none" stroke="#c9ad8f" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 56 47 Q 63 44 70 48" fill="none" stroke="#c9ad8f" strokeWidth="1.2" strokeLinecap="round" />
            {/* Olhos */}
            <ellipse cx="38" cy="55" rx="5" ry="2.6" fill="none" stroke="#c9ad8f" strokeWidth="1" />
            <ellipse cx="62" cy="55" rx="5" ry="2.6" fill="none" stroke="#c9ad8f" strokeWidth="1" />
            {/* Nariz */}
            <path d="M 50 52 L 47 72 Q 50 75 53 72 Z" fill="none" stroke="#e5d3c0" strokeWidth="0.8" />
            {/* Sulco nasolabial */}
            <path d="M 42 76 Q 40 85 44 92" fill="none" stroke="#e5d3c0" strokeWidth="0.7" />
            <path d="M 58 76 Q 60 85 56 92" fill="none" stroke="#e5d3c0" strokeWidth="0.7" />
            {/* Boca */}
            <path d="M 40 92 Q 50 97 60 92" fill="none" stroke="#c9ad8f" strokeWidth="1.2" strokeLinecap="round" />
            {/* Linhas de marionete */}
            <path d="M 40 95 Q 38 102 40 108" fill="none" stroke="#e5d3c0" strokeWidth="0.6" />
            <path d="M 60 95 Q 62 102 60 108" fill="none" stroke="#e5d3c0" strokeWidth="0.6" />
            {/* Queixo / mandíbula */}
            <path d="M 25 75 Q 22 100 50 112 Q 78 100 75 75" fill="none" stroke="#e5d3c0" strokeWidth="0.7" />
            {/* Pescoço */}
            <path d="M 38 98 L 36 130 M 62 98 L 64 130" fill="none" stroke="#e5d3c0" strokeWidth="0.7" />

            {/* Pontos já aplicados */}
            {aplicacoes.map((a) => (
              <circle
                key={a.id}
                cx={a.pos_x}
                cy={a.pos_y * 1.33}
                r={selecionado === a.id ? 2.6 : 2}
                fill={corProduto(a.produto)}
                stroke="#fff"
                strokeWidth="0.6"
                opacity={0.88}
                onClick={(e) => { e.stopPropagation(); setPontoNovo(null); setSelecionado(s => s === a.id ? null : a.id) }}
                style={{ cursor: 'pointer' }}
              />
            ))}

            {/* Ponto novo sendo posicionado */}
            {pontoNovo && (
              <circle cx={pontoNovo.x} cy={pontoNovo.y * 1.33} r="2.6" fill="#22c55e" stroke="#fff" strokeWidth="0.6" />
            )}
          </svg>
        </div>
        <p className="text-xs text-gray-400 mt-2">Clique em qualquer ponto do rosto pra registrar uma aplicação. Clique num ponto já marcado pra ver os detalhes.</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {PRODUTOS.map(p => (
            <span key={p} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: corProduto(p) }} />
              {p}
            </span>
          ))}
        </div>

        {pontoNovo && (
          <div className="mt-4 bg-white border border-green-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Nova aplicação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Produto</label>
                <select
                  value={form.produto}
                  onChange={e => setForm(f => ({ ...f, produto: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Quantidade</label>
                  <input type="number" step="0.1" value={form.quantidade}
                    onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    placeholder="20" />
                </div>
                <div className="w-20">
                  <label className="text-xs text-gray-500 block mb-1">Unidade</label>
                  <input value={form.unidade}
                    onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data</label>
                <input type="date" value={form.data_aplicacao}
                  onChange={e => setForm(f => ({ ...f, data_aplicacao: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Observações</label>
              <input value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Reação, técnica usada..." />
            </div>
            <div className="flex gap-2">
              <button
                onClick={salvarPonto}
                disabled={saving || !form.quantidade}
                className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar aplicação'}
              </button>
              <button onClick={() => setPontoNovo(null)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selecionado && (() => {
          const a = aplicacoes.find(x => x.id === selecionado)
          if (!a) return null
          return (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: corProduto(a.produto) }} />
                  {a.produto} — {a.quantidade} {a.unidade}
                </span>
                {canDelete && (
                  <button onClick={() => { onDelete(a.id); setSelecionado(null) }} className="text-xs text-red-500 hover:underline">Apagar</button>
                )}
              </div>
              <p className="text-gray-500 text-xs">{format(new Date(a.data_aplicacao + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</p>
              {a.observacoes && <p className="text-gray-500 text-xs">{a.observacoes}</p>}
            </div>
          )
        })()}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico de aplicações</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma aplicação registrada ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {historico.map(a => (
              <div
                key={a.id}
                onClick={() => setSelecionado(a.id)}
                className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors ${selecionado === a.id ? 'border-brand bg-brand/5' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: corProduto(a.produto) }} />
                  <div>
                    <p className="font-medium text-gray-700">{a.produto} — {a.quantidade} {a.unidade}</p>
                    {a.observacoes && <p className="text-gray-400">{a.observacoes}</p>}
                  </div>
                </div>
                <span className="text-gray-400 flex-shrink-0">{format(new Date(a.data_aplicacao + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
