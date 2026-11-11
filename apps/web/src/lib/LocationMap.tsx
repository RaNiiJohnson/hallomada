"use client";

import {
  Map,
  MapMarker,
  MarkerContent,
  MapControls,
} from "@/components/ui/map";
import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationMapProps {
  location: { lat: number; lng: number };
  city: string;
  listing?: boolean;
  approximate?: boolean;
}

export function LocationMap({ location, city, listing, approximate }: LocationMapProps) {
  // Open in Google Maps
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    window.open(url, "_blank");
  };

  if (listing) {
    return (
      <div className="overflow-hidden">
        <div className="relative h-[300px] sm:h-[400px] w-full">
          <Map center={[location.lng, location.lat]} zoom={12}>
            <MapControls
              showCompass
              showFullscreen
              position="top-right"
              showZoom
            />
            <MapMarker longitude={location.lng} latitude={location.lat}>
              <MarkerContent>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background">
                  <MapPin className="h-5 w-5" />
                </div>
              </MarkerContent>
            </MapMarker>
          </Map>
        </div>
        {!approximate && <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={openInGoogleMaps}
            >
              <ExternalLink className="w-3 h-3" />
              Google Maps
            </Button>
          </div>
        </div>}
      </div>
    );
  }
  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Localisation
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{city}</p>
      </div>

      {/* Map Container */}
      <div className="relative h-[300px] sm:h-[400px] w-full">
        <Map center={[location.lng, location.lat]} zoom={12}>
          <MapControls
            showCompass
            showFullscreen
            position="top-right"
            showZoom
          />
          <MapMarker longitude={location.lng} latitude={location.lat}>
            <MarkerContent>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background">
                <MapPin className="h-5 w-5" />
              </div>
            </MarkerContent>
          </MapMarker>
        </Map>
      </div>

      {!approximate && (
        <div className="p-4 bg-muted/30 border-t">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={openInGoogleMaps}
            >
              <ExternalLink className="w-3 h-3" />
              Google Maps
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
