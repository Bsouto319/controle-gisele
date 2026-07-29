import { useEffect, useRef, useState } from 'react'
import type { AplicacaoFacial, Procedimento } from '../types'
import rostoFoto from '../assets/rosto-mapa.png'

const CORES_NOVO_PROCEDIMENTO = ['#3b82f6', '#e0546b', '#8b5cf6', '#d4a418', '#22a06b', '#0891b2', '#ea580c', '#65a30d']

// Zonas de aplicação nomeadas (coordenadas percentuais no mapa). Ao marcar um
// ponto, a zona mais próxima do toque vira o "nome" que aparece na lista —
// assim a lista fica legível (ex: "Glabela") em vez de coordenada crua.
const ZONAS = [
  { nome: 'Fronte D', x: 30.6, y: 26 },
  { nome: 'Fronte C', x: 48.2, y: 22 },
  { nome: 'Fronte E', x: 65.8, y: 26 },
  { nome: 'Glabela', x: 48.2, y: 44 },
  { nome: 'Pé de galinha D', x: 19.2, y: 54 },
  { nome: 'Pé de galinha E', x: 77.2, y: 54 },
  { nome: 'Maçã do rosto D', x: 18.2, y: 63 },
  { nome: 'Maçã do rosto E', x: 78.2, y: 63 },
  { nome: 'Bigode chinês D', x: 31.6, y: 74 },
  { nome: 'Bigode chinês E', x: 64.8, y: 74 },
  { nome: 'Lábio superior', x: 48.2, y: 78 },
  { nome: 'Mandíbula D', x: 15.1, y: 90 },
  { nome: 'Mandíbula E', x: 81.4, y: 90 },
  { nome: 'Queixo', x: 48.2, y: 94 },
] as const

// Centro aproximado do rosto — as etiquetas saem radialmente pra fora
// a partir daqui, com uma linha-guia, pra não ficar tudo empilhado no rosto.
const CENTRO_X = 48.2
const CENTRO_Y = 55

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
  procedimentos: Procedimento[]
  onAdd: (novo: Omit<AplicacaoFacial, 'id' | 'created_at'>) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
  onAddProcedimento: (nome: string, cor: string) => Promise<void>
  canDelete: boolean
}

interface PontoPendente {
  key: string
  x: number; y: number; x2?: number; y2?: number
  zona: string
  produto: string
}

export default function MapaFacial({ patientId, aplicacoes, procedimentos, onAdd, onDelete, onAddProcedimento, canDelete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 320, h: 400 })
  const [modo, setModo] = useState<'ponto' | 'risco'>('ponto')
  const [riscoInicio, setRiscoInicio] = useState<{ x: number; y: number } | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [produto, setProduto] = useState<string>('')
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0])
  const [pendentes, setPendentes] = useState<PontoPendente[]>([])
  const [salvandoSessao, setSalvandoSessao] = useState(false)
  const [novoProcNome, setNovoProcNome] = useState('')
  const [savingProc, setSavingProc] = useState(false)

  function infoProduto(nome: string) {
    return procedimentos.find(p => p.nome === nome) ?? procedimentos[0] ?? { nome, cor: '#3b82f6' }
  }

  useEffect(() => {
    if (!produto && procedimentos.length > 0) setProduto(procedimentos[0].nome)
  }, [procedimentos, produto])

  async function salvarNovoProcedimento() {
    if (!novoProcNome.trim()) return
    setSavingProc(true)
    const cor = CORES_NOVO_PROCEDIMENTO[procedimentos.length % CORES_NOVO_PROCEDIMENTO.length]
    await onAddProcedimento(novoProcNome.trim(), cor)
    setNovoProcNome('')
    setSavingProc(false)
  }

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

    if (modo === 'risco') {
      if (!riscoInicio) {
        // Primeiro toque marca o início do risco — espera o segundo toque pra completar.
        setRiscoInicio({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
        return
      }
      const meioX = (riscoInicio.x + x) / 2
      const meioY = (riscoInicio.y + y) / 2
      setPendentes(p => [...p, {
        key: crypto.randomUUID(),
        x: riscoInicio.x,
        y: riscoInicio.y,
        x2: Math.round(x * 10) / 10,
        y2: Math.round(y * 10) / 10,
        zona: zonaMaisProxima(meioX, meioY, size.w, size.h),
        produto,
      }])
      setRiscoInicio(null)
      return
    }

    setPendentes(p => [...p, {
      key: crypto.randomUUID(),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      zona: zonaMaisProxima(x, y, size.w, size.h),
      produto,
    }])
  }

  function removerPendente(key: string) {
    setPendentes(p => p.filter(pt => pt.key !== key))
  }

  async function salvarSessao() {
    if (pendentes.length === 0) return
    setSalvandoSessao(true)
    for (const pt of pendentes) {
      const ehRisco = pt.x2 !== undefined && pt.y2 !== undefined
      await onAdd({
        patient_id: patientId,
        pos_x: pt.x,
        pos_y: pt.y,
        pos_x2: ehRisco ? pt.x2! : null,
        pos_y2: ehRisco ? pt.y2! : null,
        tipo: ehRisco ? 'risco' : 'ponto',
        regiao: pt.zona,
        produto: pt.produto,
        quantidade: null,
        unidade: null,
        data_aplicacao: dataSelecionada,
        observacoes: null,
      })
    }
    setPendentes([])
    setSalvandoSessao(false)
  }

  const pontos = [...aplicacoes].sort((a, b) => {
    if (a.data_aplicacao !== b.data_aplicacao) return b.data_aplicacao.localeCompare(a.data_aplicacao)
    return (a.regiao ?? '').localeCompare(b.regiao ?? '')
  })

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Painel lateral — lista de produtos + pontos aplicados, sempre visível */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4 order-2 lg:order-1">
        <div>
          <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-2">PROCEDIMENTO ATIVO</h3>
          <div className="space-y-1">
            {procedimentos.map(p => {
              const ativo = produto === p.nome
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProduto(p.nome)}
                  className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm cursor-pointer transition-colors duration-200 ${ativo ? 'bg-brand/10 border border-brand/30 shadow-[0_2px_10px_-4px_rgba(196,149,106,0.35)]' : 'border border-transparent hover:bg-gray-50'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: p.cor }} />
                  <span className={`truncate ${ativo ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{p.nome}</span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              placeholder="+ Novo procedimento..."
              value={novoProcNome}
              onChange={e => setNovoProcNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvarNovoProcedimento() }}
              className="flex-1 min-w-0 px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={salvarNovoProcedimento}
              disabled={savingProc || !novoProcNome.trim()}
              className="px-2.5 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 cursor-pointer transition-colors duration-200"
            >
              {savingProc ? '...' : '+'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-2">MARCAÇÃO</h3>
          <div className="flex rounded-xl border border-gray-200 p-1 gap-1">
            {(['ponto', 'risco'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setRiscoInicio(null) }}
                className={`flex-1 min-h-9 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 ${modo === m ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {m === 'ponto' ? '● Ponto' : '／ Risco'}
              </button>
            ))}
          </div>
          {modo === 'risco' && riscoInicio && (
            <div className="mt-2 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-700">Toque no fim do risco pra completar.</p>
              <button type="button" onClick={() => setRiscoInicio(null)} className="text-xs text-amber-700 underline cursor-pointer flex-shrink-0">Cancelar</button>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-1.5">Toque no rosto quantas vezes precisar — marca tudo e salva no final.</p>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-2">DATA DA SESSÃO</h3>
          <input
            type="date"
            value={dataSelecionada}
            onChange={e => setDataSelecionada(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>

        {pendentes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_-6px_rgba(15,23,42,0.12)] border border-brand/20 p-3.5">
            <h3 className="text-sm font-bold text-gray-700 mb-2">{pendentes.length} ponto{pendentes.length > 1 ? 's' : ''} marcado{pendentes.length > 1 ? 's' : ''} nessa sessão</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
              {pendentes.map(pt => (
                <div key={pt.key} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-gray-50 text-xs">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: infoProduto(pt.produto).cor }} />
                    <span className="truncate text-gray-600">{pt.zona}</span>
                  </span>
                  <button type="button" onClick={() => removerPendente(pt.key)} className="text-gray-300 hover:text-red-500 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
            <button
              onClick={salvarSessao}
              disabled={salvandoSessao}
              className="w-full min-h-11 bg-brand text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-dark transition-colors duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {salvandoSessao ? 'Salvando...' : `💾 Salvar sessão (${pendentes.length})`}
            </button>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-2">PONTOS APLICADOS</h3>
          {pontos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma aplicação registrada ainda.</p>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {pontos.map((a, i) => (
                <div key={a.id}>
                {(i === 0 || pontos[i - 1].data_aplicacao !== a.data_aplicacao) && (
                  <p className="text-[11px] font-semibold text-gray-400 mt-2 mb-1 px-1">
                    {new Date(a.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
                <div
                  onClick={() => setSelecionado(s => s === a.id ? null : a.id)}
                  className={`flex items-center justify-between gap-2 pl-3 pr-1.5 py-1.5 rounded-xl text-sm cursor-pointer transition-colors duration-200 ${selecionado === a.id ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: infoProduto(a.produto).cor }} />
                    <span className="truncate text-gray-700">{a.regiao ?? a.produto}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {a.quantidade ? <span className="font-bold text-gray-700">{a.quantidade}{a.unidade}</span> : null}
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
          style={{ aspectRatio: '584/878', maxWidth: 480 }}
        >
          <img
            src={rostoFoto}
            alt="Mapa facial para marcação de aplicações"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {/* Marcadores das aplicações já salvas: ponto (ou risco) + linha-guia + etiqueta */}
          {aplicacoes.map((a) => {
            const ehRisco = a.tipo === 'risco' && a.pos_x2 != null && a.pos_y2 != null
            const meioX = ehRisco ? (a.pos_x + a.pos_x2!) / 2 : a.pos_x
            const meioY = ehRisco ? (a.pos_y + a.pos_y2!) / 2 : a.pos_y
            const { lx, ly, angulo, linha } = geometriaEtiqueta(meioX, meioY, size.w, size.h)
            const ativo = selecionado === a.id
            const cor = infoProduto(a.produto).cor
            return (
              <div key={a.id}>
                {ehRisco ? (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                    <line
                      x1={`${a.pos_x}%`} y1={`${a.pos_y}%`} x2={`${a.pos_x2}%`} y2={`${a.pos_y2}%`}
                      stroke={cor} strokeWidth={ativo ? 3 : 2} strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <span
                    className="absolute -translate-x-1/2 -translate-y-1/2 block rounded-full border-2 border-white shadow-sm pointer-events-none"
                    style={{ left: `${a.pos_x}%`, top: `${a.pos_y}%`, width: ativo ? 12 : 8, height: ativo ? 12 : 8, background: cor }}
                  />
                )}
                <div
                  className="absolute h-px origin-left pointer-events-none"
                  style={{ left: `${meioX}%`, top: `${meioY}%`, width: linha, background: '#b9a48f', transform: `rotate(${angulo}deg)` }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelecionado(s => s === a.id ? null : a.id) }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-sm whitespace-nowrap transition-transform active:scale-90"
                  style={{ left: `${lx}%`, top: `${ly}%`, background: cor }}
                >
                  {a.quantidade ? `${a.quantidade}${a.unidade ?? ''}` : (a.regiao ?? a.produto)}
                </button>
              </div>
            )
          })}

          {/* Início do risco já tocado, aguardando o segundo toque */}
          {riscoInicio && (
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 block w-4 h-4 rounded-full border-2 border-white shadow-md animate-pulse pointer-events-none"
              style={{ left: `${riscoInicio.x}%`, top: `${riscoInicio.y}%`, background: infoProduto(produto).cor }}
            />
          )}

          {/* Pontos marcados nessa sessão, ainda não salvos — visual tracejado/pulsante */}
          {pendentes.map(pt => {
            const ehRisco = pt.x2 !== undefined && pt.y2 !== undefined
            const cor = infoProduto(pt.produto).cor
            return ehRisco ? (
              <svg key={pt.key} className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <line
                  x1={`${pt.x}%`} y1={`${pt.y}%`} x2={`${pt.x2}%`} y2={`${pt.y2}%`}
                  stroke={cor} strokeWidth={3} strokeLinecap="round" strokeDasharray="4 3" opacity={0.75}
                />
              </svg>
            ) : (
              <span
                key={pt.key}
                className="absolute -translate-x-1/2 -translate-y-1/2 block w-5 h-5 rounded-full border-2 border-white shadow-md animate-pulse pointer-events-none"
                style={{ left: `${pt.x}%`, top: `${pt.y}%`, background: cor, opacity: 0.75 }}
              />
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Produto ativo: <b className="text-gray-600">{produto}</b> — toque no rosto pra marcar uma aplicação
        </p>
      </div>
    </div>
  )
}
