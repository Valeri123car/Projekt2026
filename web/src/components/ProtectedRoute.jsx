import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute({ children, vlogaRequired }) {
  const { token, vloga } = useAuthStore()

  if (!token) return <Navigate to="/login" />
  if (vlogaRequired && vloga !== vlogaRequired) return <Navigate to="/" />

  return children
}