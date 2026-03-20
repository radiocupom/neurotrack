"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type HeatPoint = {
  lat: number;
  lng: number;
  intensity?: number;
};

type LeafletMapInstance = {
  setView: (center: [number, number], zoom: number) => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
  remove: () => void;
};

export function SensoHeatMap({ points }: { points: HeatPoint[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current || !points.length) {
      return;
    }

    let removed = false;
    let mapInstance: LeafletMapInstance | null = null;

    const renderMap = async () => {
      const leafletModule = await import("leaflet");
      await import("leaflet.heat");

      const L = leafletModule.default;

      if (removed || !mapRef.current) {
        return;
      }

      const createdMap = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });
      mapInstance = createdMap;

      const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
      const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;

      createdMap.setView([lat, lng], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(createdMap);

      const heatPoints = points.map((point) => [point.lat, point.lng, point.intensity ?? 0.6]);

      (L as typeof L & {
        heatLayer: (latlngs: number[][], options: Record<string, unknown>) => { addTo: (map: unknown) => void };
      }).heatLayer(heatPoints, {
        radius: 28,
        blur: 20,
        minOpacity: 0.35,
        maxZoom: 16,
        gradient: {
          0.2: "#22d3ee",
          0.45: "#38bdf8",
          0.65: "#f59e0b",
          0.85: "#f97316",
          1.0: "#ef4444",
        },
      }).addTo(mapInstance);

      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
      createdMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    };

    void renderMap();

    return () => {
      removed = true;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [points]);

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-xl border border-white/10">
      {points.length ? (
        <div ref={mapRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-950/45 text-sm text-slate-300">
          Nenhuma coordenada disponivel para renderizar o mapa.
        </div>
      )}
    </div>
  );
}
