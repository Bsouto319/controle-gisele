import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProNutroLogo from '../components/ProNutroLogo'

export default function ResetSenha() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase redirects with hash params: #access_token=...&type=recovery
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setReady(true)
    } else {
      setError('Link de redefinição inválido ou expirado. Solicite um novo link.')
    }
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setSubmitting(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Erro ao redefinir senha. Tente solicitar um novo link.')
      setSubmitting(false)
    } else {
      navigate('/login?reset=ok')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex justify-center mb-7">
          <ProNutroLogo width={200} textColor="#2d2d2d" />
        </div>

        <h1 className="text-base font-bold text-gray-800 text-center mb-0.5">Nova senha</h1>
        <p className="text-xs text-gray-400 text-center mb-6">Digite sua nova senha de acesso ao sistema.</p>

        {!ready && error && (
          <div className="text-center">
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl py-3 px-4 mb-4">
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-gray-400 hover:text-brand transition-colors"
            >
              ← Voltar para o login
            </button>
          </div>
        )}

        {ready && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Nova senha</label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 transition"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Confirmar senha</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 border border-red-100 rounded-xl py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <p className="text-xs text-gray-300 text-center mt-6">
          ProNutro · Sistema v1.0
        </p>
      </div>
    </div>
  )
}
