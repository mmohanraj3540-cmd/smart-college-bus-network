import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BusLocation {
  bus_id: number;
  bus_number: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface MapProps {
  center: [number, number];
  buses: BusLocation[];
  studentStop?: { latitude: number; longitude: number; name: string };
  onBusClick?: (bus: BusLocation) => void;
}

const CenterUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const busIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div class="text-2xl drop-shadow-md">🚌</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const stopIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div class="text-2xl drop-shadow-md">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

export const Map: React.FC<MapProps> = ({ center, buses, studentStop, onBusClick }) => {
  return (
    <div className="w-full h-full z-0 relative">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterUpdater center={center} />
        
        {studentStop && (
          <Marker position={[studentStop.latitude, studentStop.longitude]} icon={stopIcon}>
            <Popup>{studentStop.name}</Popup>
          </Marker>
        )}
        
        {buses.map((bus) => (
          <Marker 
            key={bus.bus_id} 
            position={[bus.latitude, bus.longitude]} 
            icon={busIcon}
            eventHandlers={{
              click: () => onBusClick && onBusClick(bus),
            }}
          >
            <Popup>
              <div className="font-semibold text-gray-800">Bus {bus.bus_number}</div>
              <div className="text-sm text-gray-500">{bus.status}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
