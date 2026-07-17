import { useEffect, useRef, useState } from 'react'
import type { AplicacaoFacial } from '../types'
import rostoFoto from '../assets/rosto-mapa.png'

const PRODUTOS = [
  { nome: 'Toxina Botulínica', cor: '#3b82f6', unidade: 'u' },
  { nome: 'Preenchimento', cor: '#e0546b', unidade: 'ml' },
  { nome: 'Bioestimulador de Colágeno', cor: '#8b5cf6', unidade: 'ml' },
  { nome: 'Biorremodelador', cor: '#d4a418', unidade: 'ml' },
  { nome: 'Skinbooster', cor: '#22a06b', unidade: 'ml' },
] as const

const DOSES_RAPIDAS = [1, 2, 2.5, 4, 5, 10]

// Zonas de aplicação nomeadas (coordenadas percentuais no mapa). Ao salvar um
// ponto, a zona mais próxima do toque vira o "nome" que aparece na lista —
// assim a lista fica legível (ex: "Glabela") em vez de coordenada crua.
const ZONAS = [
  { nome: 'Fronte D', x: 33, y: 26 },
  { nome: 'Fronte C', x: 50, y: 22 },
  { nome: 'Fronte E', x: 67, y: 26 },
  { nome: 'Glabela', x: 50, y: 44 },
  { nome: 'Pé de galinha D', x: 22, y: 54 },
  { nome: 'Pé de galinha E', x: 78, y: 54 },
  { nome: 'Maçã do rosto D', x: 21, y: 63 },
  { nome: 'Maçã do rosto E', x: 79, y: 63 },
  { nome: 'Bigode chinês D', x: 34, y: 74 },
  { nome: 'Bigode chinês E', x: 66, y: 74 },
  { nome: 'Lábio superior', x: 50, y: 78 },
  { nome: 'Mandíbula D', x: 18, y: 90 },
  { nome: 'Mandíbula E', x: 82, y: 90 },
  { nome: 'Queixo', x: 50, y: 94 },
] as const

// Centro aproximado do rosto — as etiquetas de dose saem radialmente pra fora
// a partir daqui, com uma linha-guia, pra não ficar tudo empilhado no rosto.
const CENTRO_X = 50
const CENTRO_Y = 55

function infoProduto(produto: string) {
  return PRODUTOS.find(p => p.nome === produto) ?? PRODUTOS[0]
}

function zonaMaisProxima(px: number, py: number, w: number, h: number): string {
  let melhor: string = ZONAS[0].nome
  let menorDist = Infinity
  for (const z of ZONAS) {
    const dx = (px - z.x) / 100 * w
    const dy = (py - z.y) / 100 * h
    const d = dx * dx + dy * dy
    if (d < menorDist) { menorDist = d; melhor = z.nome }
  }
  return melhor
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

interface PontoNovo { x: number; y: number; zona: string }

export default function MapaFacial({ patientId, aplicacoes, onAdd, onDelete, canDelete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 320, h: 400 })
  const [pontoNovo, setPontoNovo] = useState<PontoNovo | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [produto, setProduto] = useState<string>(PRODUTOS[0].nome)
  const [dose, setDose] = useState<number | null>(null)
  const [doseCustom, setDoseCustom] = useState('')
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
    setPontoNovo({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      zona: zonaMaisProxima(x, y, size.w, size.h),
    })
  }

  async function salvarPonto() {
    const quantidade = dose ?? Number(doseCustom)
    if (!pontoNovo || !quantidade) return
    setSaving(true)
    const novoId = await onAdd({
      patient_id: patientId,
      pos_x: pontoNovo.x,
      pos_y: pontoNovo.y,
      regiao: pontoNovo.zona,
      produto,
      quantidade,
      unidade: infoProduto(produto).unidade,
      data_aplicacao: new Date().toISOString().split('T')[0],
      observacoes: null,
    })
    setSaving(false)
    setPontoNovo(null)
    // Mostra a aplicação recem-salva na hora — se foi engano, o botão "Apagar"
    // já aparece ali, sem precisar caçar o ponto certo no rosto.
    if (novoId) setSelecionado(novoId)
  }

  const quantidadeSelecionada = dose ?? (doseCustom ? Number(doseCustom) : null)
  const pontos = [...aplicacoes].sort((a, b) => (a.regiao ?? '').localeCompare(b.regiao ?? ''))

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Painel lateral — lista de produtos + pontos aplicados, sempre visível */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4 order-2 lg:order-1">
        <div>
          <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-2">INJETÁVEIS</h3>
          <div className="space-y-1">
            {PRODUTOS.map(p => {
              const total = aplicacoes.filter(a => a.produto === p.nome).reduce((acc, a) => acc + Number(a.quantidade), 0)
              const ativo = produto === p.nome
              return (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => setProduto(p.nome)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl text-sm cursor-pointer transition-colors duration-200 ${ativo ? 'bg-brand/10 border border-brand/30 shadow-[0_2px_10px_-4px_rgba(196,149,106,0.35)]' : 'border border-transparent hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: p.cor }} />
                    <span className={`truncate ${ativo ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{p.nome}</span>
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{total > 0 ? `${total}${p.unidade}` : '—'}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Card de dose — aparece só quando um ponto acabou de ser tocado no rosto */}
        {pontoNovo && (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_-6px_rgba(15,23,42,0.12)] border border-brand/20 p-3.5">
            <h3 className="text-sm font-bold text-gray-700 mb-0.5">{pontoNovo.zona}</h3>
            <p className="text-xs text-gray-400 mb-3">{produto}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {DOSES_RAPIDAS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDose(d); setDoseCustom('') }}
                  className={`min-h-11 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors duration-200 ${dose === d ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
              className="w-full min-h-11 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center mb-3 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            <div className="flex gap-2">
              <button
                onClick={salvarPonto}
                disabled={saving || !quantidadeSelecionada}
                className="flex-1 min-h-11 bg-brand text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-dark transition-colors duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? '...' : '✓ Salvar'}
              </button>
              <button onClick={() => setPontoNovo(null)} className="min-h-11 min-w-11 px-4 py-3 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                ✕
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-2">PONTOS APLICADOS</h3>
          {pontos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma aplicação registrada ainda.</p>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {pontos.map(a => (
                <div
                  key={a.id}
                  onClick={() => { setPontoNovo(null); setSelecionado(s => s === a.id ? null : a.id) }}
                  className={`flex items-center justify-between gap-2 pl-3 pr-1.5 py-1.5 rounded-xl text-sm cursor-pointer transition-colors duration-200 ${selecionado === a.id ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: infoProduto(a.produto).cor }} />
                    <span className="truncate text-gray-700">{a.regiao ?? a.produto}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-bold text-gray-700">{a.quantidade}{a.unidade}</span>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label="Apagar aplicação"
                        onClick={(e) => { e.stopPropagation(); onDelete(a.id); if (selecionado === a.id) setSelecionado(null) }}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors duration-200"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rosto — ocupa o máximo de espaço possível */}
      <div className="flex-1 min-w-0 order-1 lg:order-2">
        <div
          ref={containerRef}
          onClick={handleFaceClick}
          className="relative bg-[#fbf7f3] rounded-xl border border-gray-200 overflow-hidden select-none cursor-crosshair touch-manipulation mx-auto shadow-[0_8px_30px_-8px_rgba(15,23,42,0.15)]"
          style={{ aspectRatio: '605/878', maxWidth: 480 }}
        >
          <img
            src={rostoFoto}
            alt="Mapa facial para marcação de aplicações"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {/* Marcadores das aplicações já salvas: ponto + linha-guia + etiqueta com a dose */}
          {aplicacoes.map((a) => {
            const { lx, ly, angulo, linha } = geometriaEtiqueta(a.pos_x, a.pos_y, size.w, size.h)
            const ativo = selecionado === a.id
            const cor = infoProduto(a.produto).cor
            return (
              <div key={a.id}>
                <div
                  className="absolute h-px origin-left pointer-events-none"
                  style={{ left: `${a.pos_x}%`, top: `${a.pos_y}%`, width: linha, background: '#b9a48f', transform: `rotate(${angulo}deg)` }}
                />
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 block rounded-full border-2 border-white shadow-sm pointer-events-none"
                  style={{ left: `${a.pos_x}%`, top: `${a.pos_y}%`, width: ativo ? 12 : 8, height: ativo ? 12 : 8, background: cor }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPontoNovo(null); setSelecionado(s => s === a.id ? null : a.id) }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-sm whitespace-nowrap transition-transform active:scale-90"
                  style={{ left: `${lx}%`, top: `${ly}%`, background: cor }}
                >
                  {a.quantidade}{a.unidade}
                </button>
              </div>
            )
          })}

          {/* Ponto sendo posicionado agora */}
          {pontoNovo && (
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 block w-5 h-5 rounded-full border-2 border-white shadow-md animate-pulse pointer-events-none"
              style={{ left: `${pontoNovo.x}%`, top: `${pontoNovo.y}%`, background: infoProduto(produto).cor }}
            />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Produto ativo: <b className="text-gray-600">{produto}</b> — toque no rosto pra marcar uma aplicação
        </p>
      </div>
    </div>
  )
}
