import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Admin from './pages/Admin'
import NovoPaciente from './pages/NovoPaciente'
import Contrato from './pages/Contrato'
import Paciente from './pages/Paciente'
import LoginPage from './pages/LoginPage'
import ResetSenha from './pages/ResetSenha'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página pública — paciente assina sem login */}
        <Route path="/contrato/:token" element={<Contrato />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-senha" element={<ResetSenha />} />

        {/* Painel protegido */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout><Admin /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/novo-paciente" element={
          <ProtectedRoute>
            <Layout><NovoPaciente /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/paciente/:id" element={
          <ProtectedRoute>
            <Layout><Paciente /></Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
