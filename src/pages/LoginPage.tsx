import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProNutroLogo from '../components/ProNutroLogo'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'forgot' | 'sent'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) return <Navigate to="/" replace />

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha incorretos.')
      setSubmitting(false)
    } else {
      navigate('/')
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://controle-pronutro.vercel.app/reset-senha',
    })
    if (error) {
      setError('Erro ao enviar email. Verifique o endereço.')
      setSubmitting(false)
    } else {
      setMode('sent')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex justify-center mb-7">
          <ProNutroLogo width={200} textColor="#2d2d2d" />
        </div>

        {mode === 'login' && (
          <>
            <h1 className="text-base font-bold text-gray-800 text-center mb-0.5">Acesso ao Sistema</h1>
            <p className="text-xs text-gray-400 text-center mb-6">Controle de Pacientes — Uso exclusivo da clínica</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 transition"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1.5">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                className="w-full bg-brand text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60 mt-2"
              >
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <button
              onClick={() => { setMode('forgot'); setError('') }}
              className="w-full text-xs text-gray-400 hover:text-brand mt-4 text-center transition-colors"
            >
              Esqueceu a senha?
            </button>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1 className="text-base font-bold text-gray-800 text-center mb-0.5">Redefinir senha</h1>
            <p className="text-xs text-gray-400 text-center mb-6">Enviaremos um link de redefinição para seu email.</p>

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
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
                {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>

            <button
              onClick={() => { setMode('login'); setError('') }}
              className="w-full text-xs text-gray-400 hover:text-brand mt-4 text-center transition-colors"
            >
              ← Voltar para o login
            </button>
          </>
        )}

        {mode === 'sent' && (
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <h1 className="text-base font-bold text-gray-800 mb-2">Email enviado!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
            </p>
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="w-full text-xs text-gray-400 hover:text-brand text-center transition-colors"
            >
              ← Voltar para o login
            </button>
          </div>
        )}

        <p className="text-xs text-gray-300 text-center mt-6">
          ProNutro · Sistema v1.0
        </p>
      </div>
    </div>
  )
}
