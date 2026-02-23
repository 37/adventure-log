"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type Leaflet from "leaflet";
import {
  WAYPOINTS,
  LEG_COLORS,
  TOP_SPEED_1H,
  FASTEST_6H,
  type Waypoint,
} from "@/lib/journey-data";

// Night watch UTC hours (approximate local 6pm–6am for ACST/AEST)
const isNightUTC = (isoTime: string): boolean => {
  const h = new Date(isoTime).getUTCHours();
  return h >= 8 && h < 21;
};

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

interface AdventureMapProps {
  highlights: HighlightState;
  activeLeg: string | null;
  onWaypointClick: (wp: Waypoint) => void;
  mapZoom: number;
  onZoomChange: (z: number) => void;
}

const HIGHLIGHT_EVENTS = {
  fish: {
    lat: -10.938,
    lon: 132.825,
    label: "Spanish Mackerel!",
    icon: "🎣",
    color: "#f5c84a",
    description: "Caught a 1.1m Spanish Mackerel on the first day along the Arnhem Land Coast — a monster catch that would feed the crew for the rest of the trip!",
  },
  storm: {
    lat: -16.21,
    lon: 145.51,
    label: "Severe Thunderstorm",
    icon: "⛈️",
    color: "#a855f7",
    description: "Evening of Feb 21 to morning of Feb 22. Max gusts ~90 km/h, sustained winds 55–65 km/h. Rough conditions between Cape Tribulation and Port Douglas.",
  },
  thursdayIsland: {
    lat: -10.587,
    lon: 142.217,
    label: "Thursday Island",
    icon: "⚓",
    color: "#3ec9f5",
    description: "A well-earned rest stop after crossing the Gulf. Refueling diesel, restocking the pantry, and celebrating crossing the gulf with a cold one! (~19 hour stopover)",
  },
  diving: {
    lat: -15.629,
    lon: 145.489,
    label: "Malcolm Patch Reef",
    icon: "🤿",
    color: "#2ee8a8",
    description: "We donned our stinger suits and checked out the local marine wildlife including starfish, parrot fish, coral trout, pale surgeonfish, pufferfish, comet, and a grey reef shark!",
  },
  cairns: {
    lat: -16.917,
    lon: 145.782,
    label: "Arrived in Cairns",
    icon: "🎉",
    color: "#f07850",
    description: "Cairns reached! Visited Rusty's Market to grab a coffee and something fresh to eat after 11 days at sea.",
  },
};

export default function AdventureMap({
  highlights,
  activeLeg,
  onWaypointClick,
  mapZoom,
  onZoomChange,
}: AdventureMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Record<string, LayerGroup>>({});
  const waypointLayerRef = useRef<LayerGroup | null>(null);

  const buildMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    const L = (await import("leaflet")).default;
    leafletRef.current = L;

    const map = L.map(containerRef.current, {
      center: [-12.5, 137],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;

    // Esri Ocean Base + Reference
    const oceanBase = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
        maxZoom: 18,
      }
    );
    const oceanRef = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxZoom: 18,
        opacity: 0.85,
      }
    );

    oceanBase.addTo(map);
    oceanRef.addTo(map);

    map.on("zoomend", () => {
      onZoomChange(map.getZoom());
    });

    // Draw leg polylines
    const legGroups: Record<string, [number, number][]> = {};
    for (const wp of WAYPOINTS) {
      if (!legGroups[wp.leg]) legGroups[wp.leg] = [];
      legGroups[wp.leg].push([wp.lat, wp.lon]);
    }

    const legLayer = L.layerGroup().addTo(map);
    layersRef.current["legs"] = legLayer;

    for (const [legName, coords] of Object.entries(legGroups)) {
      const color = LEG_COLORS[legName] || "#ffffff";
      const isActive = activeLeg === null || activeLeg === legName;
      // Glow effect: draw thick dim line underneath, then bright line on top
      L.polyline(coords, {
        color: color,
        weight: 8,
        opacity: isActive ? 0.15 : 0.05,
        smoothFactor: 1,
      }).addTo(legLayer);
      L.polyline(coords, {
        color: color,
        weight: 3,
        opacity: isActive ? 0.95 : 0.25,
        smoothFactor: 1,
        dashArray: undefined,
      }).addTo(legLayer);
    }

    // Night watch layer
    const nightLayer = L.layerGroup();
    layersRef.current["nightWatch"] = nightLayer;
    let nightSegment: [number, number][] = [];
    for (let i = 0; i < WAYPOINTS.length; i++) {
      const wp = WAYPOINTS[i];
      if (isNightUTC(wp.time)) {
        nightSegment.push([wp.lat, wp.lon]);
      } else {
        if (nightSegment.length > 1) {
          L.polyline(nightSegment, {
            color: "#1e40af",
            weight: 10,
            opacity: 0.45,
            smoothFactor: 1,
          }).addTo(nightLayer);
        }
        nightSegment = [];
      }
    }
    if (nightSegment.length > 1) {
      L.polyline(nightSegment, {
        color: "#1e40af",
        weight: 10,
        opacity: 0.45,
        smoothFactor: 1,
      }).addTo(nightLayer);
    }

    // Top speed 1h layer
    const topSpeedLayer = L.layerGroup();
    layersRef.current["topSpeed"] = topSpeedLayer;
    if (TOP_SPEED_1H) {
      const { fromLat, fromLon, toLat, toLon, speed } = TOP_SPEED_1H;
      L.polyline([[fromLat, fromLon], [toLat, toLon]], {
        color: "#facc15",
        weight: 8,
        opacity: 0.9,
        dashArray: "12 5",
      }).addTo(topSpeedLayer);
      const midLat = (fromLat + toLat) / 2;
      const midLon = (fromLon + toLon) / 2;
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:rgba(7,16,31,0.92);border:2px solid #facc15;border-radius:8px;padding:4px 8px;font-size:11px;color:#facc15;white-space:nowrap;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.5)">⚡ Top Speed: ${speed} kn</div>`,
        iconAnchor: [50, 20],
      });
      L.marker([midLat, midLon], { icon }).addTo(topSpeedLayer);
    }

    // Fastest 6h layer
    const fastest6hLayer = L.layerGroup();
    layersRef.current["fastest6h"] = fastest6hLayer;
    if (FASTEST_6H) {
      const { fromIdx, toIdx, speed } = FASTEST_6H;
      const segPts: [number, number][] = WAYPOINTS.slice(fromIdx, toIdx + 1).map(
        (wp) => [wp.lat, wp.lon]
      );
      L.polyline(segPts, {
        color: "#f97316",
        weight: 8,
        opacity: 0.85,
        dashArray: "8 4",
      }).addTo(fastest6hLayer);
      if (segPts.length > 0) {
        const mid = segPts[Math.floor(segPts.length / 2)];
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:rgba(7,16,31,0.92);border:2px solid #f97316;border-radius:8px;padding:4px 8px;font-size:11px;color:#f97316;white-space:nowrap;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.5)">🔥 Best 6h: ${speed} kn avg</div>`,
          iconAnchor: [60, 20],
        });
        L.marker(mid, { icon }).addTo(fastest6hLayer);
      }
    }

    // Highlight event markers
    const buildEventLayer = (key: string) => {
      const ev = HIGHLIGHT_EVENTS[key as keyof typeof HIGHLIGHT_EVENTS];
      if (!ev) return L.layerGroup();
      const layer = L.layerGroup();
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          display:flex;align-items:center;justify-content:center;
          width:36px;height:36px;border-radius:50%;
          background:rgba(7,16,31,0.9);
          border:2px solid ${ev.color};
          box-shadow:0 0 12px ${ev.color}60;
          font-size:18px;cursor:pointer;
          transition:transform 0.2s;
        ">${ev.icon}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([ev.lat, ev.lon], { icon })
        .bindPopup(
          `<div style="min-width:200px;max-width:280px">
            <div style="font-family:var(--font-playfair,Georgia,serif);font-size:14px;font-weight:700;color:${ev.color};margin-bottom:6px">${ev.icon} ${ev.label}</div>
            <div style="font-size:12px;line-height:1.5;color:#b9d2e6">${ev.description}</div>
          </div>`,
          { maxWidth: 300 }
        )
        .addTo(layer);
      return layer;
    };

    layersRef.current["fish"] = buildEventLayer("fish");
    layersRef.current["storm"] = buildEventLayer("storm");
    layersRef.current["thursdayIsland"] = buildEventLayer("thursdayIsland");
    layersRef.current["diving"] = buildEventLayer("diving");
    layersRef.current["cairns"] = buildEventLayer("cairns");

    // Waypoint detail layer (shown at higher zoom)
    const wpLayer = L.layerGroup();
    waypointLayerRef.current = wpLayer;
    for (const wp of WAYPOINTS) {
      const color = wp.legColor;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:8px;height:8px;border-radius:50%;
          background:${color};
          border:1.5px solid rgba(255,255,255,0.6);
          box-shadow:0 0 6px ${color}80;
        "></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      const localTime = new Date(wp.time).toLocaleString("en-AU", {
        timeZone: "Australia/Darwin",
        dateStyle: "short",
        timeStyle: "short",
      });
      const popup = `
        <div style="min-width:200px">
          <div style="font-family:var(--font-playfair,Georgia,serif);font-size:13px;font-weight:700;color:${color};margin-bottom:8px">${wp.name}</div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px;color:#b9d2e6">
            <span style="color:#6b8fa8">Time (ACST)</span><span>${localTime}</span>
            <span style="color:#6b8fa8">Position</span><span>${wp.lat.toFixed(5)}°, ${wp.lon.toFixed(5)}°</span>
            <span style="color:#6b8fa8">Speed</span><span>${wp.speed} kn</span>
            <span style="color:#6b8fa8">Distance</span><span>${wp.cumDist.toFixed(1)} nm from start</span>
            <span style="color:#6b8fa8">Leg</span><span style="color:${color}">${wp.leg}</span>
          </div>
          <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(62,201,245,0.15)">
            <button
              onclick="document.dispatchEvent(new CustomEvent('wp-upload', {detail: ${wp.index}}))"
              style="width:100%;padding:5px 10px;background:rgba(62,201,245,0.12);border:1px solid rgba(62,201,245,0.3);border-radius:6px;color:#3ec9f5;font-size:11px;cursor:pointer;font-family:inherit"
            >📷 Add Photo to This Waypoint</button>
          </div>
        </div>
      `;
      L.marker([wp.lat, wp.lon], { icon })
        .bindPopup(popup, { maxWidth: 280 })
        .on("click", () => onWaypointClick(wp))
        .addTo(wpLayer);
    }

    // Vessel start marker
    const startWp = WAYPOINTS[0];
    const vesselIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:48px;height:48px;border-radius:50%;
        background:rgba(7,16,31,0.92);
        border:2px solid #2ee8a8;
        box-shadow:0 0 20px #2ee8a880;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;
      ">⛵</div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
    L.marker([startWp.lat, startWp.lon], { icon: vesselIcon })
      .bindPopup(
        `<div style="min-width:220px">
          <div style="font-family:var(--font-playfair,Georgia,serif);font-size:15px;font-weight:700;color:#2ee8a8;margin-bottom:8px">⛵ SV Jasmin</div>
          <div style="font-size:12px;color:#b9d2e6;line-height:1.6">
            <strong style="color:#d8e8f4">Vessel:</strong> Sailing Catamaran<br>
            <strong style="color:#d8e8f4">Length:</strong> 11.5 m &nbsp;|&nbsp; <strong style="color:#d8e8f4">Beam:</strong> 6.0 m<br>
            <strong style="color:#d8e8f4">Departed:</strong> Darwin, Feb 11 2026<br>
            <strong style="color:#d8e8f4">Arrived:</strong> Cairns, Feb 22 2026<br>
            <strong style="color:#d8e8f4">Distance:</strong> ~1,153 nautical miles
          </div>
        </div>`,
        { maxWidth: 260 }
      )
      .addTo(map);

    // Initial layer visibility
    setLayerVisibility(map, highlights);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLayerVisibility = (
    map: LeafletMap,
    hs: HighlightState
  ) => {
    const toggleLayer = (key: string, on: boolean) => {
      const layer = layersRef.current[key];
      if (!layer) return;
      if (on) map.addLayer(layer);
      else map.removeLayer(layer);
    };
    toggleLayer("nightWatch", hs.nightWatch);
    toggleLayer("topSpeed", hs.topSpeed);
    toggleLayer("fastest6h", hs.fastest6h);
    toggleLayer("fish", hs.fish);
    toggleLayer("storm", hs.storm);
    toggleLayer("thursdayIsland", hs.thursdayIsland);
    toggleLayer("diving", hs.diving);
    toggleLayer("cairns", hs.cairns);
  };

  const setWaypointLayerVisibility = (map: LeafletMap, zoom: number) => {
    const layer = waypointLayerRef.current;
    if (!layer) return;
    if (zoom >= 9) map.addLayer(layer);
    else map.removeLayer(layer);
  };

  useEffect(() => {
    buildMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [buildMap]);

  // Update highlights visibility
  useEffect(() => {
    if (!mapRef.current) return;
    setLayerVisibility(mapRef.current, highlights);
  }, [highlights]);

  // Update waypoint visibility based on zoom
  useEffect(() => {
    if (!mapRef.current) return;
    setWaypointLayerVisibility(mapRef.current, mapZoom);
  }, [mapZoom]);

  // Update active leg opacity
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const map = mapRef.current;
    const L = leafletRef.current;
    const legLayer = layersRef.current["legs"];
    if (!legLayer) return;
    map.removeLayer(legLayer);
    const newLegLayer = L.layerGroup().addTo(map);
    layersRef.current["legs"] = newLegLayer;
    const legGroups: Record<string, [number, number][]> = {};
    for (const wp of WAYPOINTS) {
      if (!legGroups[wp.leg]) legGroups[wp.leg] = [];
      legGroups[wp.leg].push([wp.lat, wp.lon]);
    }
    for (const [legName, coords] of Object.entries(legGroups)) {
      const color = LEG_COLORS[legName] || "#ffffff";
      const isActive = activeLeg === null || activeLeg === legName;
      L.polyline(coords, { color, weight: 8, opacity: isActive ? 0.15 : 0.04, smoothFactor: 1 }).addTo(newLegLayer);
      L.polyline(coords, { color, weight: 3, opacity: isActive ? 0.95 : 0.2, smoothFactor: 1 }).addTo(newLegLayer);
    }
  }, [activeLeg]);

  return <div ref={containerRef} className="w-full h-full" />;
}
