import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { Activity, AlertTriangle, CheckCircle, Navigation, Bus } from 'lucide-react';
import { BusManagement } from './BusManagement';

interface AdminStats {
  total_buses: number;
  active_buses: number;
  delayed_buses: number;
  breakdown_buses: number;
  not_started: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  const auth = useStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth || auth.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [auth]);

  const fetchData = async () => {
    try {
      const [statsRes, busesRes, driversRes, tripsRes, studentsRes, routesRes, stopsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/buses'),
        api.get('/admin/drivers'),
        api.get('/admin/trips'),
        api.get('/admin/students'),
        api.get('/routes'),
        api.get('/stops')
      ]);
      setStats(statsRes.data);
      setBuses(busesRes.data);
      setDrivers(driversRes.data);
      setTrips(tripsRes.data);
      setStudents(studentsRes.data);
      setRoutes(routesRes.data);
      setStops(stopsRes.data);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

  if (!stats) return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-10">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Bus className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">College Admin</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Transport Network Manager</p>
          </div>
        </div>
        <button 
          onClick={() => { useStore.getState().logout(); navigate('/login'); }}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign Out
        </button>
      </header>

      <div className="bg-white px-6 py-2 border-b border-gray-200 flex gap-6 overflow-x-auto text-sm">
        <button onClick={() => setActiveTab('overview')} className={`pb-2 ${activeTab === 'overview' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-900'}`}>System Overview</button>
        <button onClick={() => setActiveTab('buses')} className={`pb-2 ${activeTab === 'buses' ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-900'}`}>Manage Network (Buses)</button>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
        {activeTab === 'overview' && (
          <>
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Live Network Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard title="Total Buses" value={stats.total_buses} icon={<Bus size={20} />} color="bg-blue-50 text-blue-700" iconColor="text-blue-500" />
              <StatCard title="Active" value={stats.active_buses} icon={<Activity size={20} />} color="bg-emerald-50 text-emerald-700" iconColor="text-emerald-500" />
              <StatCard title="Delayed" value={stats.delayed_buses} icon={<AlertTriangle size={20} />} color="bg-yellow-50 text-yellow-700" iconColor="text-yellow-500" />
              <StatCard title="Breakdown" value={stats.breakdown_buses} icon={<AlertTriangle size={20} />} color="bg-red-50 text-red-700" iconColor="text-red-500" />
              <StatCard title="Not Started" value={stats.not_started} icon={<CheckCircle size={20} />} color="bg-gray-100 text-gray-700" iconColor="text-gray-500" />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Live Trips Monitoring</h2>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 font-medium">Bus</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Started At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {trips.filter(t => t.status !== 'COMPLETED').map(trip => (
                        <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold flex items-center gap-2">
                            <Navigation size={14} className="text-gray-400" />
                            Bus {buses.find(b => b.id === trip.bus_id)?.bus_number || 'Unknown'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={trip.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(trip.started_at + 'Z').toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                      {trips.filter(t => t.status !== 'COMPLETED').length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No active trips currently.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
          </>
        )}

        {activeTab === 'buses' && (
           <BusManagement 
             buses={buses} 
             drivers={drivers} 
             routes={routes} 
             stops={stops} 
             allStudents={students} 
             fetchData={fetchData} 
           />
        )}
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, iconColor }: any) => (
  <div className={`rounded-2xl p-4 ${color} border border-white/50 shadow-sm relative overflow-hidden transition-transform hover:scale-[1.02]`}>
    <div className={`absolute top-0 right-0 -mr-2 -mt-2 opacity-20 ${iconColor} transform scale-150`}>
      {icon}
    </div>
    <div className={`mb-2 ${iconColor}`}>{icon}</div>
    <p className="text-2xl font-black mb-1">{value}</p>
    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    'RUNNING': 'bg-emerald-100 text-emerald-700',
    'DELAYED': 'bg-yellow-100 text-yellow-700',
    'BREAKDOWN': 'bg-red-100 text-red-700',
    'ROUTE_CHANGED': 'bg-blue-100 text-blue-700',
    'COMPLETED': 'bg-gray-100 text-gray-700'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${colors[status] || colors['COMPLETED']}`}>
      {status}
    </span>
  );
};
