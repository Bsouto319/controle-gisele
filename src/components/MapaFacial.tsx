import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AplicacaoFacial } from '../types'

const PRODUTOS = [
  { nome: 'Botox', cor: '#3b82f6' },
  { nome: 'Preenchimento', cor: '#ec4899' },
  { nome: 'Bioestimulador', cor: '#8b5cf6' },
  { nome: 'Fios', cor: '#f59e0b' },
  { nome: 'Outro', cor: '#6b7280' },
] as const

const DOSES_RAPIDAS = [1, 2, 2.5, 4, 5, 10]

function corProduto(produto: string) {
  return PRODUTOS.find(p => p.nome === produto)?.cor ?? '#6b7280'
}

interface Props {
  patientId: string
  aplicacoes: AplicacaoFacial[]
  onAdd: (novo: Omit<AplicacaoFacial, 'id' | 'created_at'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  canDelete: boolean
}

interface PontoNovo { x: number; y: number; side: 'left' | 'right'; vSide: 'top' | 'bottom' }

export default function MapaFacial({ patientId, aplicacoes, onAdd, onDelete, canDelete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pontoNovo, setPontoNovo] = useState<PontoNovo | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [produto, setProduto] = useState<string>('Botox')
  const [dose, setDose] = useState<number | null>(null)
  const [doseCustom, setDoseCustom] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  function handleFaceClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setSelecionado(null)
    setDose(null)
    setDoseCustom('')
    setMostrarNota(false)
    setNota('')
    setPontoNovo({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      side: x > 55 ? 'left' : 'right', // popover abre pro lado com mais espaço
      vSide: y > 55 ? 'top' : 'bottom',
    })
  }

  async function salvarPonto() {
    const quantidade = dose ?? Number(doseCustom)
    if (!pontoNovo || !quantidade) return
    setSaving(true)
    await onAdd({
      patient_id: patientId,
      pos_x: pontoNovo.x,
      pos_y: pontoNovo.y,
      regiao: null,
      produto,
      quantidade,
      unidade: produto === 'Preenchimento' ? 'ml' : 'UI',
      data_aplicacao: new Date().toISOString().split('T')[0],
      observacoes: nota || null,
    })
    setSaving(false)
    setPontoNovo(null)
  }

  const historico = [...aplicacoes].sort((a, b) => (a.data_aplicacao < b.data_aplicacao ? 1 : -1))
  const quantidadeSelecionada = dose ?? (doseCustom ? Number(doseCustom) : null)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div
          ref={containerRef}
          onClick={handleFaceClick}
          className="relative bg-[#fbf7f3] rounded-xl border border-gray-200 overflow-hidden select-none cursor-crosshair touch-manipulation"
          style={{ aspectRatio: '4/5' }}
        >
          <svg viewBox="0 0 200 240" className="w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
            <g fill="none" stroke="#b9a48f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {/* Pescoço e ombros */}
              <path d="M 82 196 L 76 236 M 118 196 L 124 236" />
              <path d="M 40 236 Q 60 210 76 200 M 160 236 Q 140 210 124 200" strokeWidth="1.4" />
              {/* Orelhas */}
              <path d="M 58 118 Q 47 116 46 128 Q 45 142 57 146" />
              <path d="M 142 118 Q 153 116 154 128 Q 155 142 143 146" />
              {/* Contorno do rosto */}
              <path d="M100,26 C78,26 62,42 58,68 C54,90 54,104 58,120 C50,140 52,160 62,176 C72,192 86,203 100,204 C114,203 128,192 138,176 C148,160 150,140 142,120 C146,104 146,90 142,68 C138,42 122,26 100,26 Z" />
              {/* Linha do cabelo */}
              <path d="M 58 66 Q 100 34 142 66" strokeWidth="1.3" />
              {/* Sobrancelhas */}
              <path d="M 70 98 Q 82 90 95 96" strokeWidth="1.8" />
              <path d="M 105 96 Q 118 90 130 98" strokeWidth="1.8" />
              {/* Olhos */}
              <path d="M 70 112 Q 80 106 91 112 Q 80 118 70 112 Z" strokeWidth="1.3" />
              <path d="M 109 112 Q 120 106 130 112 Q 120 118 109 112 Z" strokeWidth="1.3" />
              {/* Nariz */}
              <path d="M 98 114 Q 92 138 89 148 Q 94 154 100 152 Q 106 154 111 148" strokeWidth="1.3" />
              {/* Boca */}
              <path d="M 82 172 Q 100 180 118 172" strokeWidth="1.8" />
              {/* Sulco nasolabial (bem sutil) */}
              <path d="M 84 150 Q 80 162 84 172" strokeWidth="0.9" opacity="0.5" />
              <path d="M 116 150 Q 120 162 116 172" strokeWidth="0.9" opacity="0.5" />
            </g>
          </svg>

          {/* Marcadores das aplicações já salvas, com a dose ao lado (igual referência) */}
          {aplicacoes.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setPontoNovo(null); setSelecionado(s => s === a.id ? null : a.id) }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 group"
              style={{ left: `${a.pos_x}%`, top: `${a.pos_y}%` }}
            >
              <span
                className="block rounded-full border-2 border-white shadow-sm transition-transform group-active:scale-90"
                style={{ width: selecionado === a.id ? 18 : 14, height: selecionado === a.id ? 18 : 14, background: corProduto(a.produto) }}
              />
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm whitespace-nowrap"
                style={{ background: corProduto(a.produto) }}
              >
                {a.quantidade}
              </span>
            </button>
          ))}

          {/* Ponto sendo posicionado agora */}
          {pontoNovo && (
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 block w-5 h-5 rounded-full border-2 border-white shadow-md animate-pulse pointer-events-none"
              style={{ left: `${pontoNovo.x}%`, top: `${pontoNovo.y}%`, background: corProduto(produto) }}
            />
          )}

          {/* Card flutuante de adicionar — grande, perto do toque, 1 mão só */}
          {pontoNovo && (
            <div
              className="absolute z-10 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-3"
              style={{
                left: pontoNovo.side === 'left' ? `${pontoNovo.x}%` : undefined,
                right: pontoNovo.side === 'right' ? `${100 - pontoNovo.x}%` : undefined,
                top: pontoNovo.vSide === 'bottom' ? `${pontoNovo.y}%` : undefined,
                bottom: pontoNovo.vSide === 'top' ? `${100 - pontoNovo.y}%` : undefined,
                marginTop: pontoNovo.vSide === 'bottom' ? 14 : undefined,
                marginBottom: pontoNovo.vSide === 'top' ? 14 : undefined,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PRODUTOS.map(p => (
                  <button
                    key={p.nome}
                    type="button"
                    onClick={() => setProduto(p.nome)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: produto === p.nome ? p.cor : '#f3f4f6',
                      color: produto === p.nome ? '#fff' : '#6b7280',
                    }}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {DOSES_RAPIDAS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDose(d); setDoseCustom('') }}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${dose === d ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={doseCustom}
                onChange={e => { setDoseCustom(e.target.value); setDose(null) }}
                placeholder="Outra quantidade..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-center mb-2.5 focus:outline-none focus:ring-1 focus:ring-brand"
              />

              {mostrarNota ? (
                <input
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Nota (opcional)"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs mb-2.5 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              ) : (
                <button type="button" onClick={() => setMostrarNota(true)} className="text-xs text-gray-400 mb-2.5 block">
                  + adicionar nota
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={salvarPonto}
                  disabled={saving || !quantidadeSelecionada}
                  className="flex-1 bg-brand text-white py-2.5 rounded-xl text-sm font-bold hover:bg-brand-dark transition-colors disabled:opacity-40"
                >
                  {saving ? '...' : '✓ Salvar'}
                </button>
                <button onClick={() => setPontoNovo(null)} className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500">
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">Toque no rosto pra marcar uma aplicação · toque num ponto marcado pra ver os detalhes</p>

        {selecionado && (() => {
          const a = aplicacoes.find(x => x.id === selecionado)
          if (!a) return null
          return (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-1.5">
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
