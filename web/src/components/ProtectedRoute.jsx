import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute({ children, vlogaRequired }) {
  const { token, vloga } = useAuthStore()

  if (!token) return <Navigate to="/login" />
  if (vlogaRequired) {
    const allowed = Array.isArray(vlogaRequired) ? vlogaRequired : [vlogaRequired]
    if (!allowed.includes(vloga)) return <Navigate to="/voznje" />
  }

  return children
}