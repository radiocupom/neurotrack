"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type HeatPoint = {
  lat: number;
  lng: number;
  intensity?: number;
};

type MapHandle = { remove: () => void };

// Incrementing counter so stale async closures can detect they've been superseded
let globalSetupSeq = 0;

export function SensoHeatMap({ points }: { points: HeatPoint[] }) {
  // The container div is ALWAYS mounted — never conditionally removed from DOM
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);

  useEffect(() => {
    // Claim a unique sequence number for this effect invocation
    const mySeq = ++globalSetupSeq;

    // Synchronously destroy any previous instance BEFORE any async work
    // This prevents StrictMode double-invoke from having two live maps
    if (mapHandleRef.current) {
      mapHandleRef.current.remove();
      mapHandleRef.current = null;
    }

    // Clear any leftover Leaflet state on the container so it can be re-used
    const container = containerRef.current;
    if (container) {
      // Leaflet sets this property to mark a container as "in use"
      // Resetting it allows L.map() to initialise the container again
      (container as HTMLDivElement & { _leaflet_id?: unknown })._leaflet_id = undefined;
    }

    if (!container || !points.length) return;

    let map: MapHandle | null = null;

    const setup = async () => {
      const { default: L } = await import("leaflet");
      await import("leaflet.heat");

      // If a newer setup has started while we were loading, abort
      if (mySeq !== globalSetupSeq) return;
      // Container may have been removed by React
      if (!containerRef.current) return;

      const leafletMap = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      map = leafletMap;

      // Guard again: cleanup may have fired while awaiting
      if (mySeq !== globalSetupSeq) {
        leafletMap.remove();
        return;
      }

      mapHandleRef.current = leafletMap;

      const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
      const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
      leafletMap.setView([lat, lng], 5, { animate: false });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap);

      (L as typeof L & {
        heatLayer: (pts: number[][], opts: Record<string, unknown>) => { addTo: (m: unknown) => void };
      }).heatLayer(
        points.map((p) => [p.lat, p.lng, p.intensity ?? 0.6]),
        {
          radius: 28,
          blur: 20,
          minOpacity: 0.35,
          maxZoom: 16,
          gradient: { 0.2: "#22d3ee", 0.45: "#38bdf8", 0.65: "#f59e0b", 0.85: "#f97316", 1.0: "#ef4444" },
        },
      ).addTo(leafletMap);

      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));

      // Garante layout estável antes de ajustar o viewport durante remount/HMR.
      leafletMap.invalidateSize({ pan: false, animate: false });

      if (bounds.isValid() && containerRef.current?.isConnected) {
        leafletMap.fitBounds(bounds, {
          padding: [24, 24],
          maxZoom: 14,
          animate: false,
        });
      }
    };

    void setup().catch(() => {
      // If setup threw while the map was partially created, clean it up
      if (map) {
        try { map.remove(); } catch { /* ignore */ }
        map = null;
      }
    });

    return () => {
      // Invalidate this setup so the async continuation aborts
      globalSetupSeq++;
      if (mapHandleRef.current) {
        mapHandleRef.current.remove();
        mapHandleRef.current = null;
      }
      // Also clean up if the map was created but not yet assigned to the ref
      if (map && map !== mapHandleRef.current) {
        try { map.remove(); } catch { /* ignore */ }
      }
    };
  }, [points]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-white/10">
      {/* Container is always in the DOM — Leaflet must never lose its element */}
      <div ref={containerRef} className="h-full w-full" />
      {!points.length && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-sm text-slate-300">
          Nenhuma coordenada disponivel para renderizar o mapa.
        </div>
      )}
    </div>
  );
}
