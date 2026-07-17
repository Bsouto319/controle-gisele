import { useEffect, useRef, useState } from 'react'
import type { AplicacaoFacial } from '../types'
// TODO: import rostoFoto from '../assets/rosto-mapa.png' quando a foto limpa chegar

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
  { nome: 'Fronte D', x: 36, y: 33 },
  { nome: 'Fronte C', x: 50, y: 31 },
  { nome: 'Fronte E', x: 64, y: 33 },
  { nome: 'Glabela', x: 50, y: 42 },
  { nome: 'Pé de galinha D', x: 33, y: 47 },
  { nome: 'Pé de galinha E', x: 67, y: 47 },
  { nome: 'Maçã do rosto D', x: 34, y: 58 },
  { nome: 'Maçã do rosto E', x: 66, y: 58 },
  { nome: 'Bigode chinês D', x: 40, y: 63 },
  { nome: 'Bigode chinês E', x: 60, y: 63 },
  { nome: 'Lábio superior', x: 50, y: 69 },
  { nome: 'Mandíbula D', x: 30, y: 75 },
  { nome: 'Mandíbula E', x: 70, y: 75 },
  { nome: 'Queixo', x: 50, y: 82 },
] as const

// Centro aproximado do rosto — as etiquetas de dose saem radialmente pra fora
// a partir daqui, com uma linha-guia, pra não ficar tudo empilhado no rosto.
const CENTRO_X = 50
const CENTRO_Y = 45

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
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${ativo ? 'bg-brand/10 border border-brand/30' : 'border border-transparent hover:bg-gray-50'}`}
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
          <div className="bg-white rounded-2xl shadow-md border border-brand/30 p-3">
            <h3 className="text-sm font-bold text-gray-700 mb-0.5">{pontoNovo.zona}</h3>
            <p className="text-xs text-gray-400 mb-2.5">{produto}</p>
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
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${selecionado === a.id ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: infoProduto(a.produto).cor }} />
                    <span className="truncate text-gray-700">{a.regiao ?? a.produto}</span>
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-700">{a.quantidade}{a.unidade}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(a.id); if (selecionado === a.id) setSelecionado(null) }}
                        className="text-gray-300 hover:text-red-500 transition-colors px-1"
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
          className="relative bg-[#fbf7f3] rounded-xl border border-gray-200 overflow-hidden select-none cursor-crosshair touch-manipulation mx-auto"
          style={{ aspectRatio: '4/5', maxWidth: 560 }}
        >
          {/* TODO: trocar por <img src={rostoFoto} className="absolute inset-0 w-full h-full object-cover" /> quando tivermos a foto limpa */}
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
