import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [geslo, setGeslo] = useState('')
  const [napaka, setNapaka] = useState('')
  const [loading, setLoading] = useState(false)
  const { handleLogin } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setNapaka('')
    try {
      await handleLogin(email, geslo)
    } catch {
      setNapaka('Napačen email ali geslo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-8 bg-surface-container-lowest">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-4xl">local_shipping</span>
          </div>
          <h1 className="text-3xl font-bold text-on-surface mb-1">Sirena d.o.o.</h1>
          <p className="text-sm text-on-surface-variant">Logistični portal za upravljanje prevozov</p>
        </div>
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-6">Prijava v račun</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="email">E-pošta</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">mail</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="vas@podjetje.si"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="geslo">Geslo</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
                <input
                  id="geslo"
                  type="password"
                  value={geslo}
                  onChange={e => setGeslo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {napaka && <p className="text-sm text-error">{napaka}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Prijavljam...' : 'Prijava'}
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}