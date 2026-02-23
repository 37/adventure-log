"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Waypoint } from "@/lib/journey-data";
import { WAYPOINTS } from "@/lib/journey-data";

interface WaypointUploadProps {
  waypoint: Waypoint | null;
  onClose: () => void;
  onImageSaved: (waypointIdx: number, imageUrl: string) => void;
  waypointImages: Record<number, string>;
}

// Resize and compress an image file to a JPEG data URL.
// Max 1200px wide, 82% quality — keeps typical photos under ~400 KB.
function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const MAX_W = 1200;
      let { width, height } = img;
      if (width > MAX_W) {
        height = Math.round((height * MAX_W) / width);
        width = MAX_W;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function WaypointUpload({
  waypoint,
  onClose,
  onImageSaved,
  waypointImages,
}: WaypointUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [exifLocation, setExifLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [suggestedWp, setSuggestedWp] = useState<Waypoint | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "confirm-gps">("upload");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPendingFile(file);

    try {
      const exifr = (await import("exifr")).default;
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        const { latitude: lat, longitude: lon } = gps;
        setExifLocation({ lat, lon });

        // Find nearest waypoint
        let best: Waypoint | null = null;
        let bestDist = Infinity;
        for (const wp of WAYPOINTS) {
          const d = haversine(lat, lon, wp.lat, wp.lon);
          if (d < bestDist) {
            bestDist = d;
            best = wp;
          }
        }
        setSuggestedWp(best);
        setStep("confirm-gps");
      }
    } catch {
      // no EXIF — use selected waypoint
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const saveToWaypoint = useCallback(async (targetWp: Waypoint) => {
    if (!pendingFile) return;
    setSaving(true);
    try {
      const base64 = await compressToBase64(pendingFile);
      onImageSaved(targetWp.index, base64);
      resetState();
      onClose();
    } catch {
      setSaving(false);
    }
  // resetState and onClose are stable refs — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile, onImageSaved, onClose]);

  const resetState = () => {
    setPreview(null);
    setExifLocation(null);
    setSuggestedWp(null);
    setPendingFile(null);
    setStep("upload");
    setSaving(false);
  };

  const existing = waypoint ? waypointImages[waypoint.index] : null;

  return (
    <Dialog open={!!waypoint} onOpenChange={() => { resetState(); onClose(); }}>
      <DialogContent className="max-w-md glass-panel border-0 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary">
            📷 Waypoint Photo
          </DialogTitle>
        </DialogHeader>

        {waypoint && (
          <div className="space-y-4">
            {/* Waypoint info */}
            <div className="rounded-lg p-3 border border-border/40 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Attaching to</div>
              <div className="font-medium text-sm" style={{ color: waypoint.legColor }}>
                {waypoint.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {waypoint.lat.toFixed(5)}°S, {waypoint.lon.toFixed(5)}°E &nbsp;·&nbsp; {waypoint.leg}
              </div>
            </div>

            {/* Existing image */}
            {existing && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Current photo</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existing}
                  alt="Waypoint"
                  className="w-full rounded-lg object-cover max-h-48 border border-border/30"
                />
              </div>
            )}

            {/* GPS suggestion step */}
            {step === "confirm-gps" && suggestedWp && preview && (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full rounded-lg max-h-40 object-cover" />
                <div className="rounded-lg p-3 border border-primary/30 bg-primary/5 text-sm space-y-2">
                  <div className="font-medium text-primary">📍 GPS data found in photo</div>
                  <div className="text-xs text-muted-foreground">
                    Photo location: {exifLocation!.lat.toFixed(5)}°, {exifLocation!.lon.toFixed(5)}°
                    <br />
                    Nearest waypoint: <span style={{ color: suggestedWp.legColor }}>{suggestedWp.name}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={saving}
                      onClick={() => saveToWaypoint(suggestedWp)}
                    >
                      {saving ? "Saving…" : "Use GPS waypoint"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      disabled={saving}
                      onClick={() => saveToWaypoint(waypoint)}
                    >
                      {saving ? "Saving…" : "Keep selected"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload area */}
            {step === "upload" && (
              <>
                {preview ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Preview" className="w-full rounded-lg max-h-48 object-cover border border-border/30" />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={saving}
                        onClick={() => saveToWaypoint(waypoint)}
                      >
                        {saving ? "Saving…" : "Save to Waypoint"}
                      </Button>
                      <Button variant="outline" disabled={saving} onClick={resetState}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="text-3xl mb-3">📷</div>
                    <div className="text-sm font-medium mb-1">Drop photo here or click to browse</div>
                    <div className="text-xs text-muted-foreground">
                      If the photo has GPS metadata, we&apos;ll suggest the nearest waypoint
                    </div>
                    <Badge variant="outline" className="mt-3 text-xs">JPEG · PNG · HEIC</Badge>
                  </div>
                )}
              </>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
