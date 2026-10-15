import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Navigation2, AlertTriangle, Power, LogOut, RotateCcw, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

export const DriverDashboard = () => {
  const [tripId, setTripId] = useState<number | null>(null);
  const [status, setStatus] = useState("NOT_STARTED");
  const [speed, setSpeed] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'unavailable' | 'connected' | 'error' | 'waiting'>('waiting');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayReason, setDelayReason] = useState('Traffic');
  const [delayNote, setDelayNote] = useState('');

  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const user = useStore(state => state.user);
  const [busNumber, setBusNumber] = useState<string>(user?.assigned_bus || "Unassigned");
  const navigate = useNavigate();

  const hasAssignment = Boolean(
    user?.assigned_bus &&
    user.assigned_bus !== "Unassigned" &&
    user?.assigned_route &&
    user?.stops &&
    user.stops.length > 0
  );
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Check for active trip
      api.get('/trips/current').then(res => {
        if (res.data.active) {
          setTripId(res.data.trip_id);
          setBusNumber(res.data.bus_number);
          setStatus(res.data.status);
          startGPS(res.data.trip_id);
        } else {
          // Check initial GPS permission before starting
          checkGPSPermission();
        }
      }).catch(err => {
        console.error("Failed to check current trip", err);
        checkGPSPermission();
      });
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [user]);

  const handleGpsError = (error: GeolocationPositionError) => {
    setGpsStatus('error');
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setGpsErrorMessage("GPS access denied. Please allow location permissions in your browser settings to transmit live bus coordinates.");
        break;
      case error.POSITION_UNAVAILABLE:
        setGpsErrorMessage("GPS position unavailable. Please ensure device location / GPS service is turned on.");
        break;
      case error.TIMEOUT:
        setGpsErrorMessage("GPS signal request timed out. Click retry to acquire location again.");
        break;
      default:
        setGpsErrorMessage("An error occurred while accessing GPS: " + (error.message || "Unknown error"));
    }
  };

  const checkGPSPermission = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGpsStatus('connected');
          setGpsErrorMessage(null);
        },
        (error) => {
          handleGpsError(error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsStatus('unavailable');
      setGpsErrorMessage("Geolocation is not supported by your browser.");
    }
  };

  const startTrip = async () => {
    setActionError(null);
    if (!hasAssignment) {
      setActionError("Cannot start trip: You are not assigned to a bus or route. Please contact your transport administrator.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/trips/start');
      setTripId(res.data.trip_id);
      setBusNumber(res.data.bus_number);
      setStatus("RUNNING");
      startGPS(res.data.trip_id);
    } catch (e: any) {
      setActionError("Failed to start trip: " + (e.response?.data?.detail || e.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGPS = (id: number) => {
    setGpsStatus('waiting');
    if ("geolocation" in navigator) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          setGpsStatus('connected');
          setGpsErrorMessage(null);
          const { latitude, longitude, speed: gpsSpeed, heading, accuracy } = position.coords;
          const currentSpeed = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0; // m/s to km/h
          setSpeed(currentSpeed);
          
          try {
            await api.post(`/trips/${id}/location`, {
              latitude,
              longitude,
              speed: currentSpeed,
              heading: heading || 0,
              accuracy,
              timestamp: new Date(position.timestamp).toISOString()
            });
            setLastUpdate(new Date());
          } catch (e) {
            console.error("GPS send failed", e);
          }
        },
        (error) => {
          console.error("GPS watch error", error);
          handleGpsError(error);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      setGpsStatus('unavailable');
      setGpsErrorMessage("Geolocation is not supported by your browser.");
    }
  };

  const retryGPS = () => {
    setGpsErrorMessage(null);
    setGpsStatus('waiting');
    if (tripId) startGPS(tripId);
    else checkGPSPermission();
  };

  const endTrip = async () => {
    if (!tripId) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/trips/${tripId}/end`);
      setStatus("COMPLETED");
      setTripId(null);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    } catch (e: any) {
      setActionError("Failed to end trip: " + (e.response?.data?.detail || e.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportDelay = async () => {
    if (!tripId) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/trips/${tripId}/status?status=DELAYED`);
      setStatus("DELAYED");
      setShowDelayModal(false);
    } catch (e: any) {
      setActionError("Failed to report delay: " + (e.response?.data?.detail || e.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportBreakdown = async () => {
    if (!tripId) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/trips/${tripId}/status?status=BREAKDOWN`);
      setStatus("BREAKDOWN");
      setShowBreakdownModal(false);
    } catch (e: any) {
      setActionError("Failed to report breakdown: " + (e.response?.data?.detail || e.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    useStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans overflow-y-auto pb-10">
      <header className="px-6 py-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between sticky top-0 z-20">
        <div>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Driver Dashboard</p>
           <h1 className="text-xl font-bold text-white mt-1">Bus {busNumber}</h1>
        </div>
        <button onClick={logout} className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors border border-gray-700" title="Sign Out">
           <LogOut size={18} className="text-gray-300" />
        </button>
      </header>

      <main className="flex-1 p-5 flex flex-col max-w-lg mx-auto w-full">
        {actionError && (
          <div className="mb-4 bg-red-900/40 border border-red-700/60 rounded-2xl p-4 flex items-start gap-3 text-red-200 animate-in fade-in">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">
              {actionError}
            </div>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white" title="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {!tripId ? (
          <div className="flex-1 flex flex-col justify-center w-full animate-in fade-in duration-500">
            <div className="bg-gray-800 rounded-3xl p-6 text-center border border-gray-700 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full"></div>
              
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                <Navigation2 size={36} className="text-blue-500" />
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tight">Ready to go?</h2>
              <p className="text-gray-400 mb-6 text-sm">Ensure your GPS is enabled before starting the trip.</p>

              {/* Assignment Notice if driver has no bus/route */}
              {!hasAssignment && (
                <div className="mb-6 bg-amber-950/60 border border-amber-600/40 rounded-2xl p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-200">No Bus or Route Assigned</h4>
                      <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                        You do not have an active bus or route assigned. Please contact your transport administrator to assign you a bus, route, and stops before starting a trip.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-3 mb-6 text-left bg-gray-950 p-4 rounded-xl border border-gray-800">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-medium">
                        {gpsStatus === 'connected' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-yellow-500" />}
                        <span>GPS Signal: <strong className={gpsStatus === 'connected' ? 'text-white' : 'text-yellow-500'}>{gpsStatus.toUpperCase()}</strong></span>
                    </div>
                    {gpsStatus !== 'connected' && (
                        <button onClick={retryGPS} className="text-xs bg-gray-800 px-2.5 py-1.5 rounded-lg text-white flex items-center gap-1 hover:bg-gray-700 border border-gray-700">
                          <RotateCcw size={12}/> Retry
                        </button>
                    )}
                 </div>
                 {gpsErrorMessage && (
                   <div className="text-xs text-red-400 mt-1 border-t border-gray-800 pt-2 flex items-start gap-1.5">
                     <AlertCircle size={14} className="shrink-0 mt-0.5" />
                     <span>{gpsErrorMessage}</span>
                   </div>
                 )}
              </div>

              {user?.assigned_route && (
                <div className="mb-6 text-left">
                  <h3 className="text-sm font-bold mb-3 text-gray-500 uppercase tracking-wider">Today's Route: <span className="text-white">{user.assigned_route}</span></h3>
                  <div className="bg-gray-950 p-5 rounded-2xl flex flex-col gap-0 relative border border-gray-800">
                    <div className="absolute top-6 bottom-6 left-[27px] w-0.5 bg-gray-800"></div>
                    {user.stops?.map((stop) => (
                      <div key={stop.id} className="flex items-center gap-4 py-2 relative">
                        <div className="w-3.5 h-3.5 rounded-full bg-gray-700 ring-4 ring-gray-950 z-10 ml-0.5"></div>
                        <span className="text-sm font-medium text-gray-300">{stop.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={startTrip}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasAssignment || isSubmitting}
              >
                <Power size={22} />
                {isSubmitting ? "STARTING..." : "START TRIP"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
             
             {/* Status Card */}
             <div className="bg-gray-800 rounded-3xl p-6 mb-6 border border-gray-700 relative overflow-hidden shadow-xl">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 ${status === 'RUNNING' ? 'bg-emerald-500' : status === 'BREAKDOWN' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <div className="flex items-center gap-3">
                       <div className={`w-4 h-4 rounded-full ${status === 'RUNNING' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : status === 'BREAKDOWN' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                       <span className="font-black tracking-widest uppercase text-white">{status.replace('_', ' ')}</span>
                   </div>
                   <div className="bg-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400">TRIP ACTIVE</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                   <div className="bg-gray-950 rounded-2xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Speed</p>
                      <div className="flex items-baseline gap-1">
                         <span className="text-4xl font-black text-white">{speed}</span>
                         <span className="text-gray-400 font-medium">km/h</span>
                      </div>
                   </div>
                   <div className="bg-gray-950 rounded-2xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">GPS Status</p>
                      <div className="flex items-center gap-2 mt-1 mb-2">
                          <div className={`w-2 h-2 rounded-full ${gpsStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-bold text-white">{gpsStatus.toUpperCase()}</span>
                      </div>
                      {gpsStatus !== 'connected' ? (
                          <button onClick={retryGPS} className="text-xs bg-gray-800 text-white w-full py-1 rounded hover:bg-gray-700 border border-gray-700 flex items-center justify-center gap-1">
                            <RotateCcw size={12}/> Retry GPS
                          </button>
                      ) : (
                          <div className="text-xs text-gray-500 font-medium">
                              Updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Waiting...'}
                          </div>
                      )}
                   </div>
                </div>

                {gpsErrorMessage && (
                  <div className="mt-4 bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2 relative z-10">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{gpsErrorMessage}</span>
                  </div>
                )}
             </div>

             {/* Actions - only enabled when tripId is active */}
             <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  onClick={() => setShowDelayModal(true)}
                  disabled={!tripId || isSubmitting || status === 'BREAKDOWN' || status === 'DELAYED'}
                  className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <AlertTriangle size={24} />
                   REPORT DELAY
                </button>
                <button 
                  onClick={() => setShowBreakdownModal(true)}
                  disabled={!tripId || isSubmitting || status === 'BREAKDOWN'}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <AlertTriangle size={24} />
                   BREAKDOWN
                </button>
             </div>
             
             <button 
                onClick={endTrip}
                disabled={!tripId || isSubmitting}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-2 border border-gray-700 mt-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "ENDING TRIP..." : "END TRIP"}
              </button>
          </div>
        )}
      </main>

      {/* Delay Modal */}
      {showDelayModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">Report Delay</h3>
                      <button onClick={() => setShowDelayModal(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="space-y-4 mb-8">
                      <div>
                          <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Delay Reason</label>
                          <select value={delayReason} onChange={e => setDelayReason(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-yellow-500 transition-colors">
                              <option>Traffic</option>
                              <option>Weather</option>
                              <option>Minor Issue</option>
                              <option>Waiting for Students</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Optional Note</label>
                          <input type="text" value={delayNote} onChange={e => setDelayNote(e.target.value)} placeholder="e.g. Heavy rain at Peelamedu" className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-yellow-500 transition-colors" />
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setShowDelayModal(false)} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-xl border border-gray-700">Cancel</button>
                      <button onClick={reportDelay} disabled={!tripId || isSubmitting} className="flex-1 bg-yellow-500 text-gray-900 font-bold py-3 rounded-xl disabled:opacity-50">
                        {isSubmitting ? "Submitting..." : "Confirm Delay"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Breakdown Modal */}
      {showBreakdownModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-gray-900 border border-red-900/50 rounded-3xl p-6 w-full max-w-sm text-center">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={36} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Report Breakdown</h3>
                  <p className="text-gray-400 mb-8 text-sm">Are you sure you want to report a breakdown? This will notify all students and dispatch alternatives.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowBreakdownModal(false)} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-xl border border-gray-700">Cancel</button>
                      <button onClick={reportBreakdown} disabled={!tripId || isSubmitting} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/50 disabled:opacity-50">
                        {isSubmitting ? "Submitting..." : "Confirm Breakdown"}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
