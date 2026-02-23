"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import SidePanel from "@/components/SidePanel";
import WaypointUpload from "@/components/WaypointUpload";
import type { Waypoint } from "@/lib/journey-data";
import { WAYPOINTS } from "@/lib/journey-data";

const AdventureMap = dynamic(() => import("@/components/AdventureMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-pulse">⚓</div>
        <div className="font-serif text-xl text-primary">Loading Chart...</div>
        <div className="text-sm text-muted-foreground italic">SV Jasmin · Darwin to Cairns</div>
      </div>
    </div>
  ),
});

interface HighlightState {
  nightWatch: boolean;
  topSpeed: boolean;
  fastest6h: boolean;
  fish: boolean;
  storm: boolean;
  thursdayIsland: boolean;
  diving: boolean;
  cairns: boolean;
}

export default function AdventureLogPage() {
  const [highlights, setHighlights] = useState<HighlightState>({
    nightWatch: true,
    topSpeed: true,
    fastest6h: true,
    fish: true,
    storm: true,
    thursdayIsland: true,
    diving: true,
    cairns: true,
  });

  const [activeLeg, setActiveLeg] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapZoom, setMapZoom] = useState(6);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);
  const [waypointImages, setWaypointImages] = useState<Record<number, string>>({});

  const handleHighlightChange = useCallback(
    (key: keyof HighlightState, value: boolean) => {
      setHighlights((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleImageSaved = useCallback((waypointIdx: number, imageUrl: string) => {
    setWaypointImages((prev) => ({ ...prev, [waypointIdx]: imageUrl }));
  }, []);

  // Listen for waypoint upload events from map popups
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      const wp = WAYPOINTS[customEvent.detail];
      if (wp) setSelectedWaypoint(wp);
    };
    document.addEventListener("wp-upload", handler);
    return () => document.removeEventListener("wp-upload", handler);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <AdventureMap
          highlights={highlights}
          activeLeg={activeLeg}
          onWaypointClick={setSelectedWaypoint}
          mapZoom={mapZoom}
          onZoomChange={setMapZoom}
        />
      </div>

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-[850] pointer-events-none">
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: "linear-gradient(180deg, rgba(4,9,20,0.96) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-primary flex-shrink-0"
              fill="currentColor"
            >
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
            </svg>
            <div>
              <h1 className="font-serif font-bold text-base text-primary leading-tight tracking-wide">
                Darwin to Cairns · Adventure Log
              </h1>
              <p className="text-[11px] text-muted-foreground italic">
                SV Jasmin · 11.5m Sailing Catamaran · February 2026
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground leading-relaxed">
            <div>11 Feb – 22 Feb 2026</div>
            <div>~1,153 nautical miles</div>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <SidePanel
        highlights={highlights}
        onHighlightChange={handleHighlightChange}
        activeLeg={activeLeg}
        onLegChange={setActiveLeg}
        mapZoom={mapZoom}
        isOpen={panelOpen}
        onToggle={() => setPanelOpen((p) => !p)}
      />

      {/* Waypoint image upload dialog */}
      <WaypointUpload
        waypoint={selectedWaypoint}
        onClose={() => setSelectedWaypoint(null)}
        onImageSaved={handleImageSaved}
        waypointImages={waypointImages}
      />

      {/* Legend */}
      <div className="absolute bottom-6 right-4 z-[800] glass-panel px-3 py-2">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Legs</div>
        <div className="space-y-1.5">
          {[
            { color: "#2ee8a8", label: "Setting Out" },
            { color: "#f5c84a", label: "Arnhem Land" },
            { color: "#3ec9f5", label: "Gulf" },
            { color: "#f07850", label: "Barrier Reef" },
          ].map((leg) => (
            <div key={leg.label} className="flex items-center gap-2">
              <div className="w-5 h-0.5 rounded-full" style={{ background: leg.color }} />
              <span className="text-[10px] text-muted-foreground">{leg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
