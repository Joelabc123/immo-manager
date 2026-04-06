"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProperty {
  id: string;
  latitude: string | null;
  longitude: string | null;
  street: string | null;
  city: string | null;
}

interface PropertyMapProps {
  properties: MapProperty[];
  onMarkerClick?: (id: string) => void;
  selectedId?: string | null;
  className?: string;
  center?: [number, number];
  zoom?: number;
}

// Fix Leaflet default icon issue
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -38],
  shadowSize: [48, 48],
  className: "selected-marker",
});

export function PropertyMap({
  properties,
  onMarkerClick,
  selectedId,
  className = "h-[300px] w-full",
  center = [51.1657, 10.4515], // Germany center
  zoom = 6,
}: PropertyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map should only initialize once
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    const validProperties = properties.filter((p) => p.latitude && p.longitude);

    if (validProperties.length === 0) return;

    const bounds = L.latLngBounds([]);

    for (const property of validProperties) {
      const lat = parseFloat(property.latitude!);
      const lng = parseFloat(property.longitude!);
      const isSelected = property.id === selectedId;

      const marker = L.marker([lat, lng], {
        icon: isSelected ? selectedIcon : defaultIcon,
      });

      const address = [property.street, property.city]
        .filter(Boolean)
        .join(", ");
      if (address) {
        marker.bindPopup(address);
      }

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(property.id));
      }

      marker.addTo(markersRef.current!);
      bounds.extend([lat, lng]);
    }

    if (validProperties.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (validProperties.length === 1) {
      const lat = parseFloat(validProperties[0].latitude!);
      const lng = parseFloat(validProperties[0].longitude!);
      mapRef.current.setView([lat, lng], 14);
    }
  }, [properties, selectedId, onMarkerClick]);

  return <div ref={containerRef} className={className} />;
}
