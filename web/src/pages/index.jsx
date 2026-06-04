import { useState, useEffect } from 'react';
import api from '../api/client';
import Sidebar from '../components/Sidebar';
import DashboardTab from './dashboard/DashboardTab';
import RoutesTab from './dashboard/RoutesTab';
import AnalyticsTab from './dashboard/AnalyticsTab';
import { useDashboardData } from './dashboard/hooks/useDashboardData';

const TABS = [
  { key: 'dashboard', label: 'Nadzorna plošča' },
  { key: 'routes',    label: 'Prikaz poti'     },
  { key: 'analytics', label: 'Analitika'       },
];

function useSkupneUre(selectedMonth) {
  const [skupneUre, setSkupneUre] = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [year, month] = selectedMonth.split('-').map(Number);
        const od      = `${selectedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const doDate  = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        const res     = await api.get(`/admin/tahograf?od=${od}&do=${doDate}`);
        const skupaj  = (res.data || [])
          .filter((z) => z.stanje === 'DELO' || z.stanje === 'VOZNJA')
          .reduce((sum, z) => sum + (z.trajanje_min ?? 0), 0);
        setSkupneUre(Math.round(skupaj / 60 * 10) / 10);
      } catch {
        setSkupneUre(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedMonth]);

  return { skupneUre, loading };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonthUre]        = useState(() => new Date().toISOString().slice(0, 7));

  const { totalVozniki, recentPrevozi, neplacaniAlerts, complianceAlerts, todayPrevozi } = useDashboardData();
  const { skupneUre, loading: ureLoading } = useSkupneUre(selectedMonthUre);

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sirena Admin</h1>
              <p className="text-gray-500 text-sm mt-1">Nadzorna plošča – Pregled sistema</p>
            </div>
          </div>
          <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-2 whitespace-nowrap text-sm sm:text-base font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardTab
            totalVozniki={totalVozniki}
            skupneUre={skupneUre}
            ureLoading={ureLoading}
            recentPrevozi={recentPrevozi}
            neplacaniAlerts={neplacaniAlerts}
            complianceAlerts={complianceAlerts}
            todayPrevozi={todayPrevozi}
          />
        )}
        {activeTab === 'routes'    && <RoutesTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>
    </div>
  );
}