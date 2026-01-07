import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tokens } from '../../styles/tokens';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzEwYjk4MSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPHBhdGggZD0iTTE2IDhMMTggMTRMMjQgMTZMMTggMThMMTYgMjRMMTQgMThMOCAxNkwxNCAxNEwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const pickupIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAzMiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgMEMxMC40NzcxIDAgNiA0LjQ3NzE1IDYgMTBDNiAxNy41IDE2IDMwIDE2IDMwQzE2IDMwIDI2IDE3LjUgMjYgMTBDMjYgNC40NzcxNSAyMS41MjI5IDAgMTYgMFoiIGZpbGw9IiMzYjgyZjYiLz4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjEwIiByPSI1IiBmaWxsPSJ3aGl0ZSIvPgogIDxyZWN0IHg9IjEzIiB5PSI3IiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjM2I4MmY2Ii8+Cjwvc3ZnPg==',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAzMiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgMEMxMC40NzcxIDAgNiA0LjQ3NzE1IDYgMTBDNiAxNy41IDE2IDMwIDE2IDMwQzE2IDMwIDI2IDE3LjUgMjYgMTBDMjYgNC40NzcxNSAyMS41MjI5IDAgMTYgMFoiIGZpbGw9IiNlZjQ0NDQiLz4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjEwIiByPSI1IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

export interface DeliveryLocation {
  id: string;
  type: 'pickup' | 'dropoff';
  lat: number;
  lng: number;
  address: string;
  name?: string;
  orderNumber?: string;
  status?: string;
}

interface DeliveryMapProps {
  driverLocation?: { lat: number; lng: number } | null;
  deliveries: DeliveryLocation[];
  showRoute?: boolean;
  height?: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function DeliveryMap({
  driverLocation,
  deliveries,
  showRoute = true,
  height = '400px',
  onLocationUpdate,
}: DeliveryMapProps) {
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(
    driverLocation || null
  );
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation && !watchId) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentPosition(pos);
          onLocationUpdate?.(pos.lat, pos.lng);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
      setWatchId(id);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const center: [number, number] = currentPosition
    ? [currentPosition.lat, currentPosition.lng]
    : deliveries.length > 0
    ? [deliveries[0].lat, deliveries[0].lng]
    : [32.0853, 34.7818];

  const routeCoordinates: [number, number][] = [];
  if (showRoute && currentPosition) {
    routeCoordinates.push([currentPosition.lat, currentPosition.lng]);
    deliveries.forEach((loc) => {
      routeCoordinates.push([loc.lat, loc.lng]);
    });
  }

  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        boxShadow: tokens.shadows.md,
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {currentPosition && (
          <>
            <Marker position={[currentPosition.lat, currentPosition.lng]} icon={driverIcon}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>Your Location</strong>
                  <br />
                  <small>
                    {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                  </small>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[currentPosition.lat, currentPosition.lng]}
              radius={100}
              pathOptions={{
                fillColor: '#10b981',
                fillOpacity: 0.1,
                color: '#10b981',
                weight: 2,
              }}
            />
          </>
        )}

        {deliveries.map((location) => (
          <Marker
            key={location.id}
            position={[location.lat, location.lng]}
            icon={location.type === 'pickup' ? pickupIcon : dropoffIcon}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    color: location.type === 'pickup' ? '#3b82f6' : '#ef4444',
                  }}
                >
                  {location.type === 'pickup' ? '📦 Pickup' : '🏠 Dropoff'}
                </div>
                {location.name && (
                  <div style={{ marginBottom: '4px' }}>{location.name}</div>
                )}
                <div style={{ fontSize: '13px', color: '#666' }}>{location.address}</div>
                {location.orderNumber && (
                  <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600' }}>
                    Order: {location.orderNumber}
                  </div>
                )}
                {location.status && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '4px 8px',
                      background: '#f0f0f0',
                      borderRadius: '4px',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {location.status}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {showRoute && routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.7,
              dashArray: '10, 10',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
