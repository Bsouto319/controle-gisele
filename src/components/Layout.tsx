import { Link, useLocation } from 'react-router-dom'
import ProNutroLogo from './ProNutroLogo'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  const navItem = (to: string, label: string, mobileLabel: string) => {
    const active = pathname === to
    return (
      <Link
        to={to}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-brand text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-brand'
        }`}
      >
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{mobileLabel}</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <ProNutroLogo size={38} />
            <div className="hidden sm:block">
              <div className="font-bold text-gray-900 leading-tight text-sm">ProNutro</div>
              <div className="text-xs text-gray-400 leading-tight">Controle de Pacientes</div>
            </div>
            <div className="sm:hidden font-semibold text-gray-800 text-sm">ProNutro</div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItem('/', 'Pacientes', 'Lista')}
            <Link
              to="/novo-paciente"
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/novo-paciente'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
              }`}
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Novo Paciente</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">{children}</main>

      <footer className="border-t border-gray-100 mt-10 py-4 text-center">
        <p className="text-xs text-gray-400">
          ProNutro · Nutrologia e Terapias Integrativas · Sistema de Controle v1.0
        </p>
      </footer>
    </div>
  )
}
