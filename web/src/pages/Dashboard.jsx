import Sidebar from '../components/Sidebar'

export default function Dashboard() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8">
        <h1 className="text-2xl font-bold">Nadzorna plošča</h1>
        <p className="text-on-surface-variant mt-2">Test</p>
      </main>
    </div>
  )
}