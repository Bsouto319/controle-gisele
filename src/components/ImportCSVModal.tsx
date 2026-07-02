import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'email', label: 'Email' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'pacote_contratado', label: 'Pacote contratado' },
  { key: 'procedimento_contratado', label: 'Procedimento contratado' },
  { key: 'data_inicial', label: 'Data inicial' },
  { key: 'data_final', label: 'Data final' },
  { key: 'prazo_dias', label: 'Prazo (dias)' },
  { key: 'observacoes', label: 'Observações' },
]

function parseCSV(text: string): string[][] {
  const clean = text.startsWith('﻿') ? text.slice(1) : text
  const lines = clean.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const first = lines[0]
  const semiCount = (first.match(/;/g) || []).length
  const commaCount = (first.match(/,/g) || []).length
  const sep = semiCount >= commaCount ? ';' : ','
  return lines.map((line) => {
    const cells: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === sep && !inQ) {
        cells.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur.trim())
    return cells
  })
}

function autoMap(headers: string[]): Record<string, number> {
  const patterns: [string, string[]][] = [
    ['nome', ['nome', 'name', 'cliente', 'paciente']],
    ['email', ['email', 'mail']],
    ['telefone', ['telefone', 'fone', 'celular', 'whatsapp', 'tel']],
    ['pacote_contratado', ['pacote', 'plano', 'contratado']],
    ['procedimento_contratado', ['procedimento', 'servico', 'serviço']],
    ['data_inicial', ['inicial', 'inicio', 'início']],
    ['data_final', ['final', 'fim']],
    ['prazo_dias', ['prazo', 'dias']],
    ['observacoes', ['obs', 'observa', 'nota']],
  ]
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    const hl = h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    for (const [field, kws] of patterns) {
      if (!(field in map) && kws.some((k) => hl.includes(k))) {
        map[field] = i
      }
    }
  })
  return map
}

type Step = 'idle' | 'preview' | 'importing' | 'done'

export default function ImportCSVModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) {
        setError('Planilha vazia ou sem dados além do cabeçalho.')
        return
      }
      const hdrs = parsed[0]
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => c))
      setHeaders(hdrs)
      setRows(dataRows)
      setMapping(autoMap(hdrs))
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function setMap(field: string, colIdx: number) {
    setMapping((prev) => {
      const next = { ...prev }
      if (colIdx === -1) { delete next[field]; return next }
      return { ...next, [field]: colIdx }
    })
  }

  function getCell(row: string[], field: string) {
    const idx = mapping[field]
    return idx !== undefined ? row[idx] ?? '' : ''
  }

  async function doImport() {
    const total = rows.length
    setProgress({ done: 0, total, errors: 0 })
    setStep('importing')
    let errors = 0
    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map((row) => {
        const rec: Record<string, unknown> = {
          nome: getCell(row, 'nome') || 'Sem nome',
          email: getCell(row, 'email') || null,
          telefone: getCell(row, 'telefone') || null,
          pacote_contratado: getCell(row, 'pacote_contratado') || '',
          procedimento_contratado: getCell(row, 'procedimento_contratado') || null,
          data_inicial: getCell(row, 'data_inicial') || null,
          data_final: getCell(row, 'data_final') || null,
          observacoes: getCell(row, 'observacoes') || null,
          ativo: true,
        }
        const prazoStr = getCell(row, 'prazo_dias')
        rec.prazo_dias = prazoStr ? (parseInt(prazoStr, 10) || null) : null
        return rec
      })
      const { error } = await supabase.from('gisele_patients').insert(batch)
      if (error) errors += batch.length
      setProgress({ done: Math.min(i + BATCH, total), total, errors })
    }
    setProgress((p) => ({ ...p, errors }))
    setStep('done')
    if (errors === 0) onSuccess()
  }

  const mappedNome = 'nome' in mapping

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Importar Clientes via CSV</h2>
            {step === 'preview' && (
              <p className="text-xs text-gray-400 mt-0.5">{rows.length} cliente{rows.length !== 1 ? 's' : ''} detectado{rows.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* Step idle */}
          {step === 'idle' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload de um arquivo <strong>.csv</strong> ou <strong>.xlsx exportado como CSV</strong>.
                A coluna <strong>Nome</strong> é obrigatória. As demais são mapeadas automaticamente.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${drag ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/50 hover:bg-gray-50'}`}
              >
                <div className="text-4xl mb-3">📂</div>
                <p className="text-sm font-medium text-gray-700">Clique ou arraste o arquivo aqui</p>
                <p className="text-xs text-gray-400 mt-1">CSV com separador ; ou ,  •  UTF-8 ou ANSI</p>
              </div>
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
              <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Colunas reconhecidas automaticamente:</p>
                <p className="text-xs text-gray-400">Nome, Pacote / Plano, Procedimento / Serviço, Data Inicial, Data Final, Prazo / Dias, Obs / Observações</p>
              </div>
            </div>
          )}

          {/* Step preview */}
          {step === 'preview' && (
            <div>
              {/* Mapeamento de colunas */}
              <p className="text-xs text-gray-500 font-medium mb-2">Mapeamento de colunas:</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-36 flex-shrink-0">
                      {f.label}{f.required && <span className="text-red-400"> *</span>}
                    </span>
                    <select
                      value={mapping[f.key] ?? -1}
                      onChange={(e) => setMap(f.key, parseInt(e.target.value))}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand/40"
                    >
                      <option value={-1}>— não importar —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <p className="text-xs text-gray-500 font-medium mb-2">Prévia (primeiros 3 registros):</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {FIELDS.filter((f) => f.key in mapping).map((f) => (
                        <th key={f.key} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {FIELDS.filter((f) => f.key in mapping).map((f) => (
                          <td key={f.key} className="px-3 py-2 text-gray-700 truncate max-w-[140px]">{getCell(row, f.key) || <span className="text-gray-300">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 3 && (
                <p className="text-xs text-gray-400 mt-1 text-right">+ {rows.length - 3} mais</p>
              )}
              {!mappedNome && (
                <p className="text-sm text-red-500 mt-3 bg-red-50 rounded-xl px-3 py-2">Mapeie a coluna <strong>Nome</strong> para continuar.</p>
              )}
            </div>
          )}

          {/* Step importing */}
          {step === 'importing' && (
            <div className="py-8 text-center">
              <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
              <p className="text-sm text-gray-700 font-medium">Importando pacientes...</p>
              <p className="text-xs text-gray-400 mt-1">{progress.done} de {progress.total}</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
                <div
                  className="bg-brand h-1.5 rounded-full transition-all duration-300"
                  style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Step done */}
          {step === 'done' && (
            <div className="py-8 text-center">
              {progress.errors === 0 ? (
                <>
                  <div className="text-5xl mb-4">✅</div>
                  <p className="text-base font-semibold text-gray-800">{progress.total} paciente{progress.total !== 1 ? 's' : ''} importado{progress.total !== 1 ? 's' : ''}!</p>
                  <p className="text-sm text-gray-400 mt-1">A lista foi atualizada automaticamente.</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">⚠️</div>
                  <p className="text-base font-semibold text-gray-800">{progress.total - progress.errors} importado{(progress.total - progress.errors) !== 1 ? 's' : ''}, {progress.errors} erro{progress.errors !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-gray-400 mt-1">Verifique os dados e tente importar os registros com erro manualmente.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          {step === 'idle' && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('idle')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">← Voltar</button>
              <button
                onClick={doImport}
                disabled={!mappedNome}
                className="px-5 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                Importar {rows.length} paciente{rows.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-5 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
