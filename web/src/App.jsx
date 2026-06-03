import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Racuni from './pages/Racuni'
import Vozniki from './pages/Vozniki'
import AuditLog from './pages/AuditLog'
import Voznje from './pages/Voznje'
import Uporabniki from './pages/Uporabniki'
import Vozila from './pages/Vozila'
import Prevozi from './pages/Prevozi'
import Nastavitve from './pages/Nastavitve'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/racuni" element={<ProtectedRoute vlogaRequired={[2, 3]}><Racuni /></ProtectedRoute>} />
          <Route path="/vozniki" element={<ProtectedRoute vlogaRequired={[2, 3]}><Vozniki /></ProtectedRoute>} />
          <Route path="/uporabniki" element={<ProtectedRoute vlogaRequired={2}><Uporabniki /></ProtectedRoute>} />
          <Route path="/voznje" element={<ProtectedRoute><Voznje /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute vlogaRequired={2}><AuditLog /></ProtectedRoute>} />
          <Route path="/vozila" element={<ProtectedRoute vlogaRequired={2}><Vozila /></ProtectedRoute>} />
          <Route path="/prevozi" element={<ProtectedRoute vlogaRequired={[2, 3]}><Prevozi /></ProtectedRoute>} />
          <Route path="/nastavitve" element={<ProtectedRoute><Nastavitve /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}