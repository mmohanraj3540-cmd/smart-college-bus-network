import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, User, Map, Users, Settings, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

export const BusManagement = ({ buses, drivers, routes, stops, allStudents, fetchData }: any) => {
  const [selectedBus, setSelectedBus] = useState<any | null>(null);
  const [isEditingBus, setIsEditingBus] = useState(false);
  
  // States for editing assignments
  const [editDriverId, setEditDriverId] = useState('');
  const [editRouteId, setEditRouteId] = useState('');
  
  // Route Stops State
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [isManagingStops, setIsManagingStops] = useState(false);
  
  // Add Stop State
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [newStop, setNewStop] = useState({ name: '', latitude: '', longitude: '' });
  
  // Students State
  const [busStudents, setBusStudents] = useState<any[]>([]);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  useEffect(() => {
    if (selectedBus) {
       // Refresh selected bus data when parent data changes
       const updatedBus = buses.find((b: any) => b.id === selectedBus.id);
       if (updatedBus) {
           setSelectedBus(updatedBus);
           const currentAssignment = updatedBus.bus_assignments?.find((a: any) => a.active);
           if (currentAssignment) {
               setEditDriverId(currentAssignment.driver_id.toString());
               setEditRouteId(currentAssignment.route_id.toString());
               loadRouteStops(currentAssignment.route_id);
           } else {
               setEditDriverId('');
               setEditRouteId('');
               setRouteStops([]);
           }
       }
       setBusStudents(allStudents.filter((s: any) => s.regular_bus_id === selectedBus.id));
    }
  }, [buses, allStudents]);

  const loadRouteStops = async (routeId: number) => {
    try {
        const res = await api.get(`/routes/${routeId}/stops`);
        setRouteStops(res.data);
    } catch (e) {
        console.error("Failed to load route stops", e);
    }
  };

  const saveBusAssignment = async () => {
    if (!editDriverId || !editRouteId) return;
    try {
      await api.put(`/admin/drivers/${editDriverId}/assign-bus`, { 
          bus_id: selectedBus.id, 
          route_id: parseInt(editRouteId) 
      });
      setIsEditingBus(false);
      fetchData(); // Trigger full refresh
    } catch (e: any) {
      alert("Failed to assign: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleCreateStop = async () => {
    try {
        const res = await api.post('/admin/stops', {
            name: newStop.name,
            latitude: parseFloat(newStop.latitude),
            longitude: parseFloat(newStop.longitude)
        });
        const stopObj = res.data;
        // Also add it to the current route locally
        addStopToRoute(stopObj);
        setIsAddingStop(false);
        setNewStop({ name: '', latitude: '', longitude: '' });
        fetchData(); // Refresh global stops
    } catch (e) {
        alert("Failed to create stop");
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
      const currentAssignment = selectedBus.bus_assignments?.find((a: any) => a.active);
      if (!currentAssignment) return;
      
      try {
        const payload = routeStops.map((rs, i) => ({ stop_id: rs.id, sequence: i + 1 }));
        await api.put(`/admin/routes/${currentAssignment.route_id}/stops`, payload);
        alert("Route stops saved!");
        setIsManagingStops(false);
        fetchData();
      } catch (e) {
        alert("Failed to save route stops");
      }
  };



  if (!selectedBus) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buses.map((bus: any) => {
            const assignment = bus.bus_assignments?.find((a: any) => a.active);
            const driver = drivers.find((d: any) => d.id === assignment?.driver_id);
            const route = routes.find((r: any) => r.id === assignment?.route_id);
            const studentCount = allStudents.filter((s: any) => s.regular_bus_id === bus.id).length;

            return (
              <div key={bus.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                           <Bus size={24} />
                       </div>
                       <div>
                           <h3 className="font-bold text-xl text-gray-900">BUS {bus.bus_number}</h3>
                           <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Active</span>
                       </div>
                   </div>
                </div>
                
                <div className="space-y-3 mb-6 text-sm text-gray-600">
                   <div className="flex items-center gap-2">
                       <User size={16} className="text-gray-400" /> 
                       <span>Driver: <strong className="text-gray-900">{driver ? driver.name : 'Unassigned'}</strong></span>
                   </div>
                   <div className="flex items-center gap-2">
                       <Map size={16} className="text-gray-400" /> 
                       <span>Route: <strong className="text-gray-900">{route ? route.name : 'Unassigned'}</strong></span>
                   </div>
                   <div className="flex items-center gap-2">
                       <Users size={16} className="text-gray-400" /> 
                       <span>Students: <strong className="text-gray-900">{studentCount}</strong></span>
                   </div>
                </div>
                
                <button 
                  onClick={() => {
                      setSelectedBus(bus);
                      const a = bus.bus_assignments?.find((ass: any) => ass.active);
                      if(a) {
                          setEditDriverId(a.driver_id.toString());
                          setEditRouteId(a.route_id.toString());
                          loadRouteStops(a.route_id);
                      }
                      setBusStudents(allStudents.filter((s: any) => s.regular_bus_id === bus.id));
                  }}
                  className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-200"
                >
                  Manage Bus
                </button>
              </div>
            );
        })}
      </div>
    );
  }

  const currentAssignment = selectedBus.bus_assignments?.find((a: any) => a.active);
  const driver = drivers.find((d: any) => d.id === currentAssignment?.driver_id);
  const route = routes.find((r: any) => r.id === currentAssignment?.route_id);

  return (
    <div className="animate-in fade-in duration-300">
       <button onClick={() => setSelectedBus(null)} className="text-indigo-600 font-semibold text-sm mb-6 flex items-center gap-1 hover:underline">
          ← Back to All Buses
       </button>
       
       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                  <h2 className="text-2xl font-black text-gray-900">BUS {selectedBus.bus_number}</h2>
                  <p className="text-gray-500 text-sm">Manage configuration, route, stops, and students.</p>
              </div>
              {!isEditingBus ? (
                <button onClick={() => setIsEditingBus(true)} className="flex items-center gap-2 text-sm font-semibold bg-white border border-gray-300 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50">
                    <Settings size={16} /> Edit Settings
                </button>
              ) : (
                <div className="flex gap-2">
                    <button onClick={() => setIsEditingBus(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={saveBusAssignment} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">Save Changes</button>
                </div>
              )}
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
             {isEditingBus ? (
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Assign Driver</label>
                         <select value={editDriverId} onChange={e => setEditDriverId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                             <option value="">Select a driver...</option>
                             {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Assign Route</label>
                         <select value={editRouteId} onChange={e => setEditRouteId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                             <option value="">Select a route...</option>
                             {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                         </select>
                     </div>
                 </div>
             ) : (
                 <div className="space-y-6">
                     <div className="flex flex-col">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned Driver</span>
                         <span className="text-lg font-medium text-gray-900">{driver ? driver.name : 'None'}</span>
                     </div>
                     <div className="flex flex-col">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned Route</span>
                         <span className="text-lg font-medium text-gray-900">{route ? route.name : 'None'}</span>
                     </div>
                 </div>
             )}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Route & Stops Section */}
           <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h3 className="font-bold text-gray-900 flex items-center gap-2"><Map size={18} className="text-indigo-500" /> Route & Stops</h3>
                   {!isManagingStops ? (
                       <button onClick={() => setIsManagingStops(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800" disabled={!route}>Manage Stops</button>
                   ) : (
                       <div className="flex gap-2">
                           <button onClick={() => setIsManagingStops(false)} className="text-sm font-semibold text-gray-500">Cancel</button>
                           <button onClick={saveRouteStops} className="text-sm font-semibold text-white bg-indigo-600 px-3 py-1 rounded-lg">Save</button>
                       </div>
                   )}
               </div>
               
               <div className="p-5 flex-1">
                   {!route ? (
                       <div className="text-center text-gray-500 py-8">Assign a route first to manage stops.</div>
                   ) : (
                       <div className="space-y-4">
                           {isManagingStops && (
                               <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 mb-6">
                                   <div className="flex gap-2">
                                       <select id="stopSelector" className="flex-1 border rounded-lg p-2 text-sm bg-white">
                                           <option value="">Select existing stop...</option>
                                           {stops.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                       </select>
                                       <button onClick={() => {
                                           const sel = document.getElementById('stopSelector') as HTMLSelectElement;
                                           if (sel.value) {
                                               const s = stops.find((st: any) => st.id === parseInt(sel.value));
                                               if (s) addStopToRoute(s);
                                               sel.value = "";
                                           }
                                       }} className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-semibold">Add</button>
                                   </div>
                                   <div className="relative">
                                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                                       <div className="relative flex justify-center text-xs"><span className="bg-gray-50 px-2 text-gray-500 font-medium">OR</span></div>
                                   </div>
                                   <button onClick={() => setIsAddingStop(true)} className="w-full border border-dashed border-gray-400 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 flex items-center justify-center gap-2">
                                       <Plus size={16} /> Create New Stop
                                   </button>
                               </div>
                           )}
                           
                           {isAddingStop && (
                               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 relative">
                                   <button onClick={() => setIsAddingStop(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={16}/></button>
                                   <h4 className="font-semibold text-sm mb-3">Create New Stop</h4>
                                   <div className="space-y-3">
                                       <input type="text" placeholder="Stop Name (e.g. Thudiyalur)" value={newStop.name} onChange={e => setNewStop({...newStop, name: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                                       <div className="flex gap-2">
                                           <input type="text" placeholder="Latitude" value={newStop.latitude} onChange={e => setNewStop({...newStop, latitude: e.target.value})} className="w-1/2 p-2 text-sm border rounded-lg" />
                                           <input type="text" placeholder="Longitude" value={newStop.longitude} onChange={e => setNewStop({...newStop, longitude: e.target.value})} className="w-1/2 p-2 text-sm border rounded-lg" />
                                       </div>
                                       <button onClick={handleCreateStop} className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm">Save & Add to Route</button>
                                   </div>
                               </div>
                           )}

                           <div className="relative">
                               <div className="absolute top-4 bottom-4 left-4 w-0.5 bg-gray-200"></div>
                               <ul className="space-y-0">
                                   {routeStops.map((rs, idx) => (
                                       <li key={rs.id} className="relative flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl group transition-colors">
                                           <div className="w-3 h-3 rounded-full bg-indigo-500 z-10 ring-4 ring-white shadow-sm ml-2.5"></div>
                                           <div className="flex-1 font-medium text-gray-900">{rs.name}</div>
                                           {isManagingStops && (
                                               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                   <button onClick={() => moveStop(idx, -1)} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowUp size={14}/></button>
                                                   <button onClick={() => moveStop(idx, 1)} disabled={idx === routeStops.length - 1} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowDown size={14}/></button>
                                                   <button onClick={() => removeStopFromRoute(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded ml-2"><X size={14}/></button>
                                               </div>
                                           )}
                                       </li>
                                   ))}
                               </ul>
                               {routeStops.length === 0 && <p className="text-gray-400 text-sm italic pl-8">No stops configured for this route.</p>}
                           </div>
                       </div>
                   )}
               </div>
           </section>

           {/* Students Section */}
           <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users size={18} className="text-emerald-500" /> Students Using Bus {selectedBus.bus_number}</h3>
                   <button onClick={() => setIsAddingStudent(!isAddingStudent)} className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                       <Plus size={16} /> Add Student
                   </button>
               </div>
               
               <div className="p-0 flex-1 overflow-x-auto">
                   {isAddingStudent && (
                       <div className="p-5 bg-emerald-50/50 border-b border-emerald-100 space-y-3">
                           <h4 className="font-semibold text-sm mb-2 text-emerald-900">Assign Existing Student to Bus</h4>
                           <div className="flex flex-col gap-2">
                               <select className="border p-2 rounded-lg text-sm w-full" id="assignStudentId">
                                   <option value="">Select unassigned student...</option>
                                   {allStudents.filter((s:any) => s.regular_bus_id !== selectedBus.id).map((s:any) => (
                                       <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                   ))}
                               </select>
                               <select className="border p-2 rounded-lg text-sm w-full" id="assignStopId">
                                   <option value="">Select pickup stop (Must be on Route)...</option>
                                   {routeStops.map((rs:any) => (
                                       <option key={rs.id} value={rs.id}>{rs.name}</option>
                                   ))}
                               </select>
                               <button 
                                 onClick={async () => {
                                     const sId = (document.getElementById('assignStudentId') as HTMLSelectElement).value;
                                     const stopId = (document.getElementById('assignStopId') as HTMLSelectElement).value;
                                     if(sId && stopId) {
                                         try {
                                             await api.put(`/admin/students/${sId}/assignment`, { bus_id: selectedBus.id, pickup_stop_id: parseInt(stopId) });
                                             setIsAddingStudent(false);
                                             fetchData();
                                         } catch(e: any) {
                                             alert("Error assigning student: " + (e.response?.data?.detail || e.message));
                                         }
                                     }
                                 }} 
                                 className="bg-emerald-600 text-white font-semibold py-2 rounded-lg text-sm mt-1">Assign Student
                               </button>
                           </div>
                       </div>
                   )}
                   
                   <table className="w-full text-sm text-left">
                       <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wider">
                           <tr>
                               <th className="px-5 py-3 font-semibold">Student</th>
                               <th className="px-5 py-3 font-semibold">Pickup Stop</th>
                               <th className="px-5 py-3 font-semibold text-right">Action</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {busStudents.map(student => {
                               const pickupStop = stops.find((s:any) => s.id === student.selected_stop_id);
                               return (
                                   <tr key={student.id} className="hover:bg-gray-50/50">
                                       <td className="px-5 py-4">
                                           <p className="font-medium text-gray-900">{student.name}</p>
                                           <p className="text-xs text-gray-500">{student.email}</p>
                                       </td>
                                       <td className="px-5 py-4 text-gray-600">
                                           {pickupStop ? pickupStop.name : 'Unknown'}
                                       </td>
                                       <td className="px-5 py-4 text-right">
                                           <button onClick={() => alert("Edit student functionality")} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">Edit</button>
                                       </td>
                                   </tr>
                               );
                           })}
                           {busStudents.length === 0 && (
                               <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No students assigned to this bus yet.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </section>
       </div>
    </div>
  );
};
