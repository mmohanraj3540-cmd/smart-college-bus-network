import { useState, useEffect, useRef } from 'react';
import { Map } from '../../components/Map';
import { Bell, MapPin, Bus, AlertCircle, Navigation, WifiOff, Home, Map as MapIcon, Route as RouteIcon, User as UserIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { api, getWebSocketUrl } from '../../services/api';

export const LiveMap = () => {
  const [buses, setBuses] = useState<any[]>([]);
  const [alternatives, setAlternatives] = useState<any>(null);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [missed, setMissed] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const user = useStore(state => state.user);
  const navigate = useNavigate();
  
  const [center] = useState<[number, number]>([user?.assigned_stop?.latitude || 11.0183, user?.assigned_stop?.longitude || 76.9654]);
  const [studentStop] = useState(user?.assigned_stop || { latitude: 11.0183, longitude: 76.9654, name: 'Gandhipuram', id: 1 });
  const [myBusNumber] = useState(user?.assigned_bus || "05");
  
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [notifications, setNotifications] = useState<{id: number, text: string, type: string}[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchActiveBuses();
    connectWebSocket();
    fetchRoute();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [user]);

  const fetchRoute = async () => {
      // Assuming a generic route fetch for this bus. MVP implementation just fetches all stops and fakes it if needed.
      try {
          const res = await api.get('/admin/buses'); // Using admin buses to find our route info (temporary hack since we don't have a direct student route endpoint)
          const myBus = res.data.find((b:any) => b.bus_number === myBusNumber);
          if (myBus && myBus.bus_assignments && myBus.bus_assignments.length > 0) {
              const rRes = await api.get(`/routes/${myBus.bus_assignments[0].route_id}/stops`);
              setRouteStops(rRes.data);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const showNotification = (text: string, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const connectWebSocket = () => {
    if (!user) return;
    const ws = new WebSocket(getWebSocketUrl(`/ws/college/${user.college_id}`));
    
    ws.onopen = () => setWsStatus('connected');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'BUS_LOCATION_UPDATED') {
          const busId = Number(data.bus_id);
          setBuses(prev => {
            const exists = prev.find(b => b.bus_id === busId);
            if (exists) {
              return prev.map(b => b.bus_id === busId ? { 
                ...b, 
                latitude: Number(data.latitude), 
                longitude: Number(data.longitude), 
                speed: Number(data.speed), 
                heading: data.heading !== undefined ? Number(data.heading) : b.heading,
                status: data.status,
                bus_number: data.bus_number || b.bus_number
              } : b);
            } else {
               fetchActiveBuses();
               return prev;
            }
          });
        } else if (data.type === 'TRIP_STARTED') {
          const displayBus = data.bus_number || data.bus_id;
          showNotification(`Bus ${displayBus} has started its trip.`, 'info');
          fetchActiveBuses();
        } else if (data.type === 'TRIP_ENDED') {
          const displayBus = data.bus_number || data.bus_id;
          showNotification(`Bus ${displayBus} has ended its trip.`, 'info');
          fetchActiveBuses();
        } else if (data.type === 'BUS_STATUS_CHANGED') {
          const displayBus = data.bus_number || data.bus_id;
          if(data.status === 'DELAYED') showNotification(`Bus ${displayBus} is delayed.`, 'warning');
          if(data.status === 'BREAKDOWN') showNotification(`Bus ${displayBus} has broken down.`, 'error');
          fetchActiveBuses();
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    ws.onclose = () => {
      setWsStatus('reconnecting');
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = () => ws.close();
    wsRef.current = ws;
  };

  const fetchActiveBuses = async () => {
    try {
      const res = await api.get('/buses/active');
      setBuses(res.data);
      
      const myBus = res.data.find((b: any) => b.bus_number === myBusNumber);
      if (myBus) {
         if (myBus.latitude > studentStop.latitude + 0.005) {
             setMissed(true);
         }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const findAlternatives = async () => {
    setLoadingAlts(true);
    try {
      const res = await api.get(`/recommendations/alternatives?stop_id=${studentStop.id}`);
      setAlternatives(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoadingAlts(false);
  };

  const myBusActive = buses.find((b: any) => b.bus_number === myBusNumber);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans pb-16">
      {/* Header */}
      <header className="bg-white px-5 py-4 shadow-sm z-10 flex items-center justify-between sticky top-0">
        <div>
           <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Smart College Transport</p>
           <h1 className="text-lg font-bold text-gray-900 leading-tight">Good morning, {user?.name?.split(' ')[0]}</h1>
        </div>
        <button onClick={() => setActiveTab('notifications')} className="p-2 rounded-full hover:bg-gray-100 relative">
          <Bell size={22} className="text-gray-700" />
          {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>
      </header>
      
      {/* WS Status Overlay */}
      {wsStatus !== 'connected' && (
        <div className="bg-yellow-50 text-yellow-800 px-4 py-2 text-xs flex items-center justify-center gap-2 z-20 shadow-sm border-b border-yellow-200 font-medium">
           <WifiOff size={14} />
           {wsStatus === 'reconnecting' ? 'Reconnecting to live server...' : 'Offline'}
        </div>
      )}

      {/* Notifications Toast */}
      <div className="fixed top-20 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-auto w-full max-w-sm ${n.type === 'error' ? 'bg-red-900 text-white' : n.type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-gray-900 text-white'}`}>
             {n.type === 'error' ? <AlertCircle size={18} /> : <Bell size={18} />}
            <p className="text-sm font-medium">{n.text}</p>
          </div>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* HOME TAB */}
        {activeTab === 'home' && (
            <div className="p-5 space-y-6 animate-in fade-in">
                {/* My Bus Card */}
                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Bus size={120} />
                    </div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="bg-white/20 px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-sm mb-2 inline-block">YOUR REGULAR BUS</span>
                            <h2 className="text-3xl font-black">BUS {myBusNumber}</h2>
                        </div>
                        {myBusActive && (
                            <div className="text-right">
                                <div className="text-sm font-medium opacity-80 uppercase tracking-wider mb-1">Status</div>
                                <div className="text-sm font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">● {myBusActive.status.replace('_', ' ')}</div>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <MapPin size={18} className="text-indigo-200" />
                            <div>
                                <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">Pickup Stop</p>
                                <p className="font-semibold text-lg">{studentStop.name}</p>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={() => setActiveTab('tracking')} className="w-full mt-4 bg-white text-indigo-600 font-bold py-3.5 rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                        <Navigation size={18} /> Track Live
                    </button>
                </div>

                {/* Missed Bus Alert */}
                {(missed || alternatives) && (
                    <div className={`rounded-3xl p-5 border shadow-sm ${missed ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${missed ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                <AlertCircle size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-bold text-lg ${missed ? 'text-red-900' : 'text-gray-900'}`}>Missed your bus?</h3>
                                <p className={`text-sm mt-1 ${missed ? 'text-red-700' : 'text-gray-500'}`}>Find the next suitable bus passing your stop.</p>
                                
                                {!alternatives ? (
                                    <button onClick={findAlternatives} className="mt-4 w-full bg-gray-900 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                                        {loadingAlts ? 'Searching...' : 'Find Alternative Bus'}
                                    </button>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {alternatives.recommended_bus ? (
                                            <div className="bg-blue-600 text-white p-4 rounded-xl">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs bg-white/20 px-2 py-1 rounded font-bold">BEST OPTION</span>
                                                    <span className="font-bold text-xl">{alternatives.recommended_bus.eta_minutes} min</span>
                                                </div>
                                                <h4 className="font-bold text-lg">Bus {alternatives.recommended_bus.bus_number}</h4>
                                                <p className="text-sm opacity-90">{alternatives.recommended_bus.distance_km} km away</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">No alternatives found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* TRACKING TAB */}
        {activeTab === 'tracking' && (
            <div className="h-full relative animate-in fade-in">
                <Map center={center} buses={buses} studentStop={studentStop} />
                <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-100 pointer-events-auto">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Your Stop</p>
                                <p className="font-bold text-gray-900 flex items-center gap-1"><MapPin size={16} className="text-indigo-500" />{studentStop.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Bus Status</p>
                                <p className="font-bold text-gray-900">{myBusActive ? myBusActive.status : 'Unknown'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ROUTE TAB */}
        {activeTab === 'route' && (
            <div className="p-5 animate-in fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Route Overview</h2>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-black text-indigo-600 mb-6 flex items-center gap-2"><RouteIcon size={20}/> BUS {myBusNumber} ROUTE</h3>
                    <div className="relative">
                        <div className="absolute top-3 bottom-3 left-[11px] w-0.5 bg-gray-100"></div>
                        <ul className="space-y-6 relative">
                            {routeStops.map((rs: any) => {
                                const isMyStop = rs.stop.id === studentStop.id;
                                return (
                                    <li key={rs.id} className={`flex items-start gap-4 ${isMyStop ? 'opacity-100' : 'opacity-60'}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center relative z-10 ${isMyStop ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-gray-300 ring-4 ring-white'}`}>
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                        <div className="pt-0.5">
                                            <p className={`font-bold ${isMyStop ? 'text-indigo-900 text-lg' : 'text-gray-700'}`}>{rs.name}</p>
                                            {isMyStop && <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mt-1">YOUR PICKUP STOP</p>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        {routeStops.length === 0 && <p className="text-gray-500 italic">Route data not available.</p>}
                    </div>
                </div>
            </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
            <div className="p-5 animate-in fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Student Profile</h2>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <UserIcon size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
                            <p className="text-gray-500">{user?.email}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">College</p>
                            <p className="font-medium text-gray-900">Demo Engineering College</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Regular Bus</p>
                            <p className="font-medium text-gray-900">Bus {myBusNumber}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pickup Stop</p>
                            <p className="font-medium text-gray-900">{studentStop.name}</p>
                        </div>
                    </div>
                    
                    <button onClick={() => { useStore.getState().logout(); navigate('/login'); }} className="w-full mt-6 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                        Sign Out
                    </button>
                </div>
            </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-40 pb-safe">
          <div className="flex justify-around items-center h-16">
              <NavButton icon={<Home size={22}/>} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
              <NavButton icon={<MapIcon size={22}/>} label="Live Map" active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} />
              <NavButton icon={<RouteIcon size={22}/>} label="My Route" active={activeTab === 'route'} onClick={() => setActiveTab('route')} />
              <NavButton icon={<UserIcon size={22}/>} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>
      </nav>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
);
