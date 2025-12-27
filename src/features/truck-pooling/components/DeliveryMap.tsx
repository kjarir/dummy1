import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface DeliveryMapProps {
  source: { lat: number; lng: number; address?: string };
  destination: { lat: number; lng: number; address?: string };
  driverLocation?: { lat: number; lng: number } | null;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  source,
  destination,
  driverLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      // Calculate center point
      const centerLat = (source.lat + destination.lat) / 2;
      const centerLng = (source.lng + destination.lng) / 2;

      // Create map instance
      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 10,
        zoomControl: true,
      });

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers and route
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }

    // Create custom icons
    const sourceIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: #10b981;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const destinationIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: #ef4444;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const driverIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: #f59e0b;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });

    // Add source marker
    const sourceMarker = L.marker([source.lat, source.lng], { icon: sourceIcon })
      .addTo(map)
      .bindPopup(`<strong>Source</strong><br>${source.address || 'Pickup Location'}`)
      .openPopup();
    markersRef.current.push(sourceMarker);

    // Add destination marker
    const destMarker = L.marker([destination.lat, destination.lng], { icon: destinationIcon })
      .addTo(map)
      .bindPopup(`<strong>Destination</strong><br>${destination.address || 'Delivery Location'}`);
    markersRef.current.push(destMarker);

    // Add driver location marker if available
    if (driverLocation) {
      const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('<strong>Driver Location</strong><br>Current position');
      markersRef.current.push(driverMarker);
    }

    // Draw route line (straight line - for actual routing, use a routing service)
    const routeCoordinates: [number, number][] = [
      [source.lat, source.lng],
      [destination.lat, destination.lng],
    ];

    // If driver location exists, include it in the route
    if (driverLocation) {
      routeCoordinates.splice(1, 0, [driverLocation.lat, driverLocation.lng]);
    }

    const routeLine = L.polyline(routeCoordinates, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10',
    }).addTo(map);

    routeLineRef.current = routeLine;

    // Fit map bounds to show all markers
    const group = new L.FeatureGroup(markersRef.current);
    map.fitBounds(group.getBounds().pad(0.1));

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      if (routeLineRef.current) {
        routeLineRef.current.remove();
      }
    };
  }, [source, destination, driverLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div 
        ref={mapRef} 
        className="w-full rounded-lg border border-gray-200"
        style={{ minHeight: '400px', zIndex: 0 }}
      />
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Source</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Destination</span>
        </div>
        {driverLocation && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Driver</span>
          </div>
        )}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-2">
        Powered by OpenStreetMap
      </p>
      
      <style>{`
        .leaflet-container {
          font-family: inherit;
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};
