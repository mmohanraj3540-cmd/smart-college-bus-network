import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const StopManager = () => {
  const [stops, setStops] = useState<any[]>([]);
  const [newStop, setNewStop] = useState({ name: '', latitude: '', longitude: '' });

  const fetchStops = async () => {
    try {
      const res = await api.get('/stops');
      setStops(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/admin/stops', {
        name: newStop.name,
        latitude: parseFloat(newStop.latitude),
        longitude: parseFloat(newStop.longitude)
      });
      setNewStop({ name: '', latitude: '', longitude: '' });
      fetchStops();
    } catch (e) {
      alert("Failed to create stop");
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold mb-4">Stop Management</h2>
      <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-200">
        <h3 className="font-semibold mb-2">Create New Stop</h3>
        <div className="flex gap-4">
          <input type="text" placeholder="Stop Name" value={newStop.name} onChange={e => setNewStop({...newStop, name: e.target.value})} className="border p-2 rounded" />
          <input type="text" placeholder="Latitude" value={newStop.latitude} onChange={e => setNewStop({...newStop, latitude: e.target.value})} className="border p-2 rounded" />
          <input type="text" placeholder="Longitude" value={newStop.longitude} onChange={e => setNewStop({...newStop, longitude: e.target.value})} className="border p-2 rounded" />
          <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Coordinates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stops.map(stop => (
              <tr key={stop.id}>
                <td className="px-4 py-3">{stop.id}</td>
                <td className="px-4 py-3 font-medium">{stop.name}</td>
                <td className="px-4 py-3 text-gray-500">{stop.latitude}, {stop.longitude}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
