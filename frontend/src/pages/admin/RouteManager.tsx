import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const RouteManager = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [newRoute, setNewRoute] = useState({ name: '', description: '' });
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [rRes, sRes] = await Promise.all([api.get('/routes'), api.get('/stops')]);
      setRoutes(rRes.data);
      setStops(sRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoute = async () => {
    try {
      await api.post('/admin/routes', newRoute);
      setNewRoute({ name: '', description: '' });
      fetchData();
    } catch (e) {
      alert("Failed to create route");
    }
  };

  const selectRoute = async (route: any) => {
    setSelectedRoute(route);
    try {
      const res = await api.get(`/routes/${route.id}/stops`);
      setRouteStops(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const addStopToRoute = (stop: any) => {
    if (routeStops.find(rs => rs.id === stop.id)) return;
    setRouteStops([...routeStops, { ...stop, sequence_order: routeStops.length + 1 }]);
  };

  const removeStopFromRoute = (index: number) => {
    const updated = [...routeStops];
    updated.splice(index, 1);
    setRouteStops(updated.map((s, i) => ({ ...s, sequence_order: i + 1 })));
  };

  const moveStop = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= routeStops.length) return;
    const updated = [...routeStops];
    const temp = updated[index];
    updated[index] = updated[index + direction];
    updated[index + direction] = temp;
    setRouteStops(updated.map((s, i) => ({ ...s, sequence_order: i + 1 })));
  };

  const saveRouteStops = async () => {
    try {
      const payload = routeStops.map((rs, i) => ({ stop_id: rs.id, sequence: i + 1 }));
      await api.put(`/admin/routes/${selectedRoute.id}/stops`, payload);
      alert("Route stops saved!");
    } catch (e) {
      alert("Failed to save route stops");
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold mb-4">Route Management</h2>
      <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-200">
        <h3 className="font-semibold mb-2">Create New Route</h3>
        <div className="flex gap-4">
          <input type="text" placeholder="Route Name" value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} className="border p-2 rounded" />
          <input type="text" placeholder="Description" value={newRoute.description} onChange={e => setNewRoute({...newRoute, description: e.target.value})} className="border p-2 rounded w-64" />
          <button onClick={handleCreateRoute} className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-1/3 bg-white rounded-xl shadow border border-gray-200 overflow-hidden h-fit">
          <h3 className="font-semibold p-4 border-b bg-gray-50">Routes</h3>
          <ul className="divide-y">
            {routes.map(r => (
              <li 
                key={r.id} 
                onClick={() => selectRoute(r)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedRoute?.id === r.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
              >
                {r.name}
              </li>
            ))}
          </ul>
        </div>

        {selectedRoute && (
          <div className="w-2/3 bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Manage Stops: {selectedRoute.name}</h3>
              <button onClick={saveRouteStops} className="bg-green-600 text-white px-4 py-2 rounded">Save Route</button>
            </div>
            
            <div className="flex gap-4 mb-4 items-center">
               <select className="border p-2 rounded flex-1" id="stopSelect">
                  <option value="">Select Stop to Add</option>
                  {stops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
               <button 
                  onClick={() => {
                     const sel = document.getElementById('stopSelect') as HTMLSelectElement;
                     if(sel.value) {
                         const stop = stops.find(s => s.id === parseInt(sel.value));
                         if(stop) addStopToRoute(stop);
                         sel.value = "";
                     }
                  }} 
                  className="bg-indigo-600 text-white px-4 py-2 rounded"
               >
                 Add Stop
               </button>
            </div>

            <div className="border rounded">
               {routeStops.map((rs, idx) => (
                  <div key={rs.id} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-gray-50">
                     <div className="flex items-center gap-3">
                        <span className="font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">{idx + 1}</span>
                        <span className="font-medium">{rs.name}</span>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => moveStop(idx, -1)} disabled={idx === 0} className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30">↑</button>
                        <button onClick={() => moveStop(idx, 1)} disabled={idx === routeStops.length - 1} className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30">↓</button>
                        <button onClick={() => removeStopFromRoute(idx)} className="p-1 text-red-500 hover:text-red-700 ml-2">Remove</button>
                     </div>
                  </div>
               ))}
               {routeStops.length === 0 && <div className="p-4 text-center text-gray-500">No stops assigned to this route.</div>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
