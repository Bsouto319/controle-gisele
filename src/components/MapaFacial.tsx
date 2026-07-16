import { useEffect, useRef, useState } from 'react'
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

// Centro aproximado do rosto (mesmas coordenadas percentuais do mapa) — as
// etiquetas de dose saem radialmente pra fora a partir daqui, com uma linha-guia,
// pra não ficar tudo empilhado em cima do rosto.
const CENTRO_X = 50
const CENTRO_Y = 45

function corProduto(produto: string) {
  return PRODUTOS.find(p => p.nome === produto)?.cor ?? '#6b7280'
}

function geometriaEtiqueta(px: number, py: number, w: number, h: number) {
  const dx = (px - CENTRO_X) / 100 * w
  const dy = (py - CENTRO_Y) / 100 * h
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const linha = 30
  const lx = px + (ux * linha / w) * 100
  const ly = py + (uy * linha / h) * 100
  const angulo = Math.atan2(dy, dx) * 180 / Math.PI
  return { lx, ly, angulo, linha }
}

interface Props {
  patientId: string
  aplicacoes: AplicacaoFacial[]
  onAdd: (novo: Omit<AplicacaoFacial, 'id' | 'created_at'>) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
  canDelete: boolean
}

interface PontoNovo { x: number; y: number }

export default function MapaFacial({ patientId, aplicacoes, onAdd, onDelete, canDelete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 320, h: 400 })
  const [pontoNovo, setPontoNovo] = useState<PontoNovo | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [produto, setProduto] = useState<string>('Botox')
  const [dose, setDose] = useState<number | null>(null)
  const [doseCustom, setDoseCustom] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
    setPontoNovo({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }

  async function salvarPonto() {
    const quantidade = dose ?? Number(doseCustom)
    if (!pontoNovo || !quantidade) return
    setSaving(true)
    const novoId = await onAdd({
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
    // Mostra a aplicação recem-salva no painel na hora — se foi engano, o botão
    // "Apagar" já aparece ali, sem precisar caçar o ponto certo no rosto.
    if (novoId) setSelecionado(novoId)
  }

  const historico = [...aplicacoes].sort((a, b) => (a.data_aplicacao < b.data_aplicacao ? 1 : -1))
  const quantidadeSelecionada = dose ?? (doseCustom ? Number(doseCustom) : null)
  const selecionadaObj = selecionado ? aplicacoes.find(x => x.id === selecionado) ?? null : null

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Rosto — ocupa o máximo de espaço possível */}
      <div className="flex-1 min-w-0">
        <div
          ref={containerRef}
          onClick={handleFaceClick}
          className="relative bg-[#fbf7f3] rounded-xl border border-gray-200 overflow-hidden select-none cursor-crosshair touch-manipulation mx-auto"
          style={{ aspectRatio: '4/5', maxWidth: 520 }}
        >
          <svg viewBox="0 0 200 240" className="w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
            {/* Cabelo: massa sólida, sem contorno próprio */}
            <path
              d="M100,26 C78,26 62,40 57,62 C55,70 55,78 57,86 C70,74 86,68 100,68 C114,68 130,74 143,86 C145,78 145,70 143,62 C138,40 122,26 100,26 Z"
              fill="#ddccb6" opacity="0.55"
            />
            <g fill="none" stroke="#a8907a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {/* Pescoço e ombros */}
              <path d="M 84 198 L 78 236 M 116 198 L 122 236" strokeWidth="1.8" />
              <path d="M 44 236 Q 62 214 78 202 M 156 236 Q 138 214 122 202" strokeWidth="1.8" />
              {/* Orelhas */}
              <path d="M 60 122 Q 49 121 48 133 Q 47 145 58 149" strokeWidth="1.8" />
              <path d="M 140 122 Q 151 121 152 133 Q 153 145 142 149" strokeWidth="1.8" />
              {/* Contorno do rosto */}
              <path
                d="M100,30 C80,30 66,45 62,68 C59,86 59,102 62,118 C55,138 56,158 65,174 C75,190 87,200 100,201 C113,200 125,190 135,174 C144,158 145,138 138,118 C141,102 141,86 138,68 C134,45 120,30 100,30 Z"
                fill="#fbf7f3" strokeWidth="2.4"
              />
              {/* Sobrancelhas */}
              <path d="M 74 98 Q 85 92 95 97" strokeWidth="2.2" />
              <path d="M 105 97 Q 115 92 126 98" strokeWidth="2.2" />
              {/* Olhos, neutros */}
              <path d="M 76 112 Q 84 115 92 112" strokeWidth="2" />
              <path d="M 108 112 Q 116 115 124 112" strokeWidth="2" />
              {/* Nariz, sutil */}
              <path d="M 98 116 Q 95 132 92 140 Q 96 143 100 141" strokeWidth="1.6" opacity="0.85" />
              {/* Boca */}
              <path d="M 87 168 Q 100 174 113 168" strokeWidth="2.2" />
            </g>
          </svg>

          {/* Marcadores das aplicações já salvas: ponto + linha-guia + etiqueta com a dose (estilo mapa clínico) */}
          {aplicacoes.map((a) => {
            const { lx, ly, angulo, linha } = geometriaEtiqueta(a.pos_x, a.pos_y, size.w, size.h)
            const ativo = selecionado === a.id
            return (
              <div key={a.id}>
                <div
                  className="absolute h-px origin-left pointer-events-none"
                  style={{
                    left: `${a.pos_x}%`, top: `${a.pos_y}%`,
                    width: linha, background: '#b9a48f',
                    transform: `rotate(${angulo}deg)`,
                  }}
                />
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 block rounded-full border-2 border-white shadow-sm pointer-events-none"
                  style={{ left: `${a.pos_x}%`, top: `${a.pos_y}%`, width: ativo ? 12 : 8, height: ativo ? 12 : 8, background: corProduto(a.produto) }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPontoNovo(null); setSelecionado(s => s === a.id ? null : a.id) }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-sm whitespace-nowrap transition-transform active:scale-90"
                  style={{ left: `${lx}%`, top: `${ly}%`, background: corProduto(a.produto) }}
                >
                  {a.quantidade}{a.unidade === 'ml' ? 'ml' : ''}
                </button>
              </div>
            )
          })}

          {/* Ponto sendo posicionado agora */}
          {pontoNovo && (
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 block w-5 h-5 rounded-full border-2 border-white shadow-md animate-pulse pointer-events-none"
              style={{ left: `${pontoNovo.x}%`, top: `${pontoNovo.y}%`, background: corProduto(produto) }}
            />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Toque no rosto pra marcar uma aplicação · toque numa etiqueta pra ver os detalhes</p>
      </div>

      {/* Painel fixo do lado — nunca sobrepõe nem corta, sempre visível */}
      <div className="w-full lg:w-72 flex-shrink-0">
        {pontoNovo ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-3 sticky top-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2.5">Nova aplicação</h3>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRODUTOS.map(p => (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => setProduto(p.nome)}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: produto === p.nome ? p.cor : '#f3f4f6', color: produto === p.nome ? '#fff' : '#6b7280' }}
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
        ) : selecionadaObj ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-1.5 sticky top-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: corProduto(selecionadaObj.produto) }} />
                {selecionadaObj.produto} — {selecionadaObj.quantidade} {selecionadaObj.unidade}
              </span>
              {canDelete && (
                <button onClick={() => { onDelete(selecionadaObj.id); setSelecionado(null) }} className="text-xs text-red-500 hover:underline">Apagar</button>
              )}
            </div>
            <p className="text-gray-500 text-xs">{format(new Date(selecionadaObj.data_aplicacao + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</p>
            {selecionadaObj.observacoes && <p className="text-gray-500 text-xs">{selecionadaObj.observacoes}</p>}
            <button onClick={() => setSelecionado(null)} className="text-xs text-gray-400 hover:underline pt-1">← ver histórico</button>
          </div>
        ) : (
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
                    className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors hover:bg-gray-50"
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
        )}
      </div>
    </div>
  )
}
