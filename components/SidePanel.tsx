"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WAYPOINTS,
  LEG_STATS,
  LEG_ORDER,
  TOTAL_DISTANCE_NM,
  JOURNEY_DURATION_HOURS,
  TOP_SPEED_1H,
  FASTEST_6H,
} from "@/lib/journey-data";

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

interface SidePanelProps {
  highlights: HighlightState;
  onHighlightChange: (key: keyof HighlightState, value: boolean) => void;
  activeLeg: string | null;
  onLegChange: (leg: string | null) => void;
  mapZoom: number;
  isOpen: boolean;
  onToggle: () => void;
}

function formatDuration(hours: number): string {
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.round((hours % 1) * 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Darwin",
  });
}

const LEG_DESCRIPTIONS: Record<string, string> = {
  "Setting Out": "Darwin harbour to Melville Island. The start of the adventure — slipping the moorings and heading into Darwin Harbour.",
  "Arnhem Land Coast": "Coburg Peninsula to Cape Wessel. Hugging the remote Arnhem Land coast through spectacular wilderness.",
  "Gulf of Carpentaria": "Cape Wessel to Thursday Island. The big crossing — open water of the Gulf with shifting winds.",
  "Great Barrier Reef": "Thursday Island to Cairns. Threading through the outer reef with the Great Barrier Reef to starboard.",
};

const HIGHLIGHT_CONFIG = [
  { key: "nightWatch" as const, icon: "🌙", label: "Night Watches", description: "6pm–6am (local) shaded on route" },
  { key: "topSpeed" as const, icon: "⚡", label: `Top Speed: ${TOP_SPEED_1H?.speed ?? "—"} kn`, description: "Best 1-hour run" },
  { key: "fastest6h" as const, icon: "🔥", label: `Best 6h: ${FASTEST_6H?.speed ?? "—"} kn avg`, description: "Fastest sustained sailing" },
  { key: "fish" as const, icon: "🎣", label: "Spanish Mackerel", description: "1.1m catch on day 2" },
  { key: "storm" as const, icon: "⛈️", label: "Thunderstorm", description: "Feb 21 evening — gusts to 90 km/h" },
  { key: "thursdayIsland" as const, icon: "⚓", label: "Thursday Island", description: "Rest stop & celebrations" },
  { key: "diving" as const, icon: "🤿", label: "Malcolm Patch Reef", description: "Dive near Cooktown" },
  { key: "cairns" as const, icon: "🎉", label: "Arrival in Cairns", description: "Rusty's Market & coffee" },
];

export default function SidePanel({
  highlights,
  onHighlightChange,
  activeLeg,
  onLegChange,
  mapZoom,
  isOpen,
  onToggle,
}: SidePanelProps) {
  const [expandedLeg, setExpandedLeg] = useState<string | null>(null);

  const avgSpeed = TOTAL_DISTANCE_NM / JOURNEY_DURATION_HOURS;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-20 left-4 z-[1000] glass-panel p-2.5 rounded-xl cursor-pointer transition-all hover:border-primary/50"
        style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Toggle panel"
      >
        <span className="text-primary text-lg">{isOpen ? "◀" : "▶"}</span>
      </button>

      {/* Side panel */}
      <div
        className={`fixed top-0 left-0 h-full z-[900] flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 340, paddingTop: 60 }}
      >
        <div className="glass-panel m-3 mt-0 flex flex-col flex-1 overflow-hidden" style={{ maxHeight: "calc(100vh - 80px)" }}>
          {/* Header */}
          <div className="p-4 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⚓</span>
              <div>
                <h1 className="font-serif text-lg font-bold text-primary leading-tight">Darwin → Cairns</h1>
                <p className="text-xs text-muted-foreground italic">SV Jasmin · Feb 2026</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Distance", value: `${TOTAL_DISTANCE_NM.toLocaleString()} nm` },
                { label: "Duration", value: formatDuration(JOURNEY_DURATION_HOURS) },
                { label: "Avg Speed", value: `${avgSpeed.toFixed(1)} kn` },
              ].map((s) => (
                <div key={s.label} className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-primary font-semibold text-sm leading-tight">{s.value}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {mapZoom < 9 && (
              <div className="mt-2 text-[10px] text-muted-foreground text-center">
                Zoom in to see individual waypoints
              </div>
            )}
          </div>

          <Tabs defaultValue="legs" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-3 mt-2 grid grid-cols-2 h-8">
              <TabsTrigger value="legs" className="text-xs">Legs</TabsTrigger>
              <TabsTrigger value="highlights" className="text-xs">Highlights</TabsTrigger>
            </TabsList>

            {/* Legs tab */}
            <TabsContent value="legs" className="flex-1 overflow-hidden m-0 mt-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  <button
                    onClick={() => onLegChange(null)}
                    className={`w-full text-left rounded-lg p-2.5 border transition-all text-xs ${
                      activeLeg === null
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/30 hover:border-border/60"
                    }`}
                  >
                    <span className="font-medium">All Legs</span>
                    <span className="text-muted-foreground ml-2">Show full journey</span>
                  </button>

                  {LEG_ORDER.map((legName, idx) => {
                    const stat = LEG_STATS.find((s) => s.name === legName);
                    if (!stat) return null;
                    const isActive = activeLeg === legName;
                    const isExpanded = expandedLeg === legName;

                    return (
                      <div key={legName} className="rounded-lg border border-border/30 overflow-hidden">
                        <button
                          className={`w-full text-left p-3 transition-all ${
                            isActive ? "bg-muted/40" : "hover:bg-muted/20"
                          }`}
                          onClick={() => {
                            onLegChange(isActive ? null : legName);
                            setExpandedLeg(isExpanded ? null : legName);
                          }}
                          style={{ borderLeft: `3px solid ${stat.color}` }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{["⛵", "🏝️", "🌊", "🐠"][idx]}</span>
                              <span className="font-serif font-bold text-sm" style={{ color: stat.color }}>
                                {legName}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5"
                              style={{ borderColor: `${stat.color}60`, color: stat.color }}
                            >
                              Leg {idx + 1}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-1 mt-2">
                            {[
                              { v: `${stat.distance} nm`, l: "distance" },
                              { v: formatDuration(stat.durationHours), l: "duration" },
                              { v: `${stat.avgSpeed} kn`, l: "avg speed" },
                            ].map((s) => (
                              <div key={s.l} className="text-center">
                                <div className="text-xs font-semibold text-foreground/90">{s.v}</div>
                                <div className="text-[10px] text-muted-foreground">{s.l}</div>
                              </div>
                            ))}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 bg-muted/10 border-t border-border/20">
                            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                              {LEG_DESCRIPTIONS[legName]}
                            </p>
                            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                              <div className="flex justify-between">
                                <span>Start</span>
                                <span className="text-foreground/70">{formatDate(stat.start)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>End</span>
                                <span className="text-foreground/70">{formatDate(stat.end)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Waypoints</span>
                                <span className="text-foreground/70">{stat.waypointCount}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Highlights tab */}
            <TabsContent value="highlights" className="flex-1 overflow-hidden m-0 mt-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1">
                  <div className="text-xs text-muted-foreground mb-3">
                    Toggle overlays on the map
                  </div>

                  {HIGHLIGHT_CONFIG.map((h) => (
                    <div
                      key={h.key}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <span className="text-lg w-6 text-center flex-shrink-0">{h.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{h.label}</div>
                        <div className="text-[10px] text-muted-foreground">{h.description}</div>
                      </div>
                      <Switch
                        checked={highlights[h.key]}
                        onCheckedChange={(v) => onHighlightChange(h.key, v)}
                        className="flex-shrink-0"
                      />
                    </div>
                  ))}

                  <Separator className="my-3" />

                  {/* All on/off */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-7"
                      onClick={() => {
                        Object.keys(highlights).forEach((k) =>
                          onHighlightChange(k as keyof HighlightState, true)
                        );
                      }}
                    >
                      Show All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-7"
                      onClick={() => {
                        Object.keys(highlights).forEach((k) =>
                          onHighlightChange(k as keyof HighlightState, false)
                        );
                      }}
                    >
                      Hide All
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="p-3 pt-2 border-t border-border/30">
            <div className="text-[10px] text-muted-foreground text-center">
              {mapZoom >= 9 ? "🔵 Waypoint markers visible" : "Zoom ≥ 9 to see waypoints"} · {WAYPOINTS_COUNT} points logged
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const WAYPOINTS_COUNT = WAYPOINTS.length;
