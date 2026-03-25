"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LocationPoint = {
  lat: number;
  lng: number;
  label?: string;
};

type MapHandle = { remove: () => void };

let globalSetupSeq = 0;

export function ParticipanteLocationMap({ point }: { point: LocationPoint | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);

  useEffect(() => {
    const mySeq = ++globalSetupSeq;

    if (mapHandleRef.current) {
      mapHandleRef.current.remove();
      mapHandleRef.current = null;
    }

    const container = containerRef.current;
    if (container) {
      (container as HTMLDivElement & { _leaflet_id?: unknown })._leaflet_id = undefined;
    }

    if (!container || !point) {
      return;
    }

    let map: MapHandle | null = null;

    const setup = async () => {
      const { default: L } = await import("leaflet");

      if (mySeq !== globalSetupSeq || !containerRef.current) {
        return;
      }

      const leafletMap = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      map = leafletMap;

      if (mySeq !== globalSetupSeq) {
        leafletMap.remove();
        return;
      }

      mapHandleRef.current = leafletMap;
      leafletMap.setView([point.lat, point.lng], 14, { animate: false });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap);

      const icon = L.divIcon({
        className: "participante-location-pin",
        html: '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#ef4444;color:#fff;border:2px solid #fff;box-shadow:0 10px 18px rgba(15,23,42,0.45);font-size:13px;line-height:1;">&#x1F4CD;</span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      L.marker([point.lat, point.lng], { icon }).addTo(leafletMap).bindPopup(point.label || "Localizacao do participante");

      leafletMap.invalidateSize({ pan: false, animate: false });
    };

    void setup().catch(() => {
      if (map) {
        try {
          map.remove();
        } catch {
          // ignore cleanup errors
        }
        map = null;
      }
    });

    return () => {
      globalSetupSeq++;
      if (mapHandleRef.current) {
        mapHandleRef.current.remove();
        mapHandleRef.current = null;
      }
      if (map && map !== mapHandleRef.current) {
        try {
          map.remove();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [point]);

  return (
    <div className="relative h-[260px] w-full overflow-hidden rounded-xl border border-white/10">
      <div ref={containerRef} className="h-full w-full" />
      {!point ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 px-4 text-center text-sm text-slate-300">
          Nenhuma coordenada disponivel para este participante.
        </div>
      ) : null}
    </div>
  );
}
