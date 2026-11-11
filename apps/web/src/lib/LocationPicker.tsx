"use client";

import { useState, useCallback, useEffect } from "react";
import type { MapMouseEvent } from "maplibre-gl";
import {
  Map,
  MapMarker,
  MarkerContent,
  MapControls,
  useMap,
} from "@/components/ui/map";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

interface LocationPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number } | null) => void;
  onCityChange?: (city: string) => void;
  className?: string;
  privacyMode?: boolean;
}

// Germany center coordinates
const GERMANY_CENTER: [number, number] = [10.4515, 51.1657]; // [lng, lat]
const GERMANY_ZOOM = 5;

// Reverse geocoding using Nominatim (OpenStreetMap)
async function reverseGeocode(
  lat: number,
  lng: number,
  locale: string,
): Promise<{ location: string; address: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          "Accept-Language": locale,
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address;

    // Get city name from various fields (in order of preference)
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      "";

    // Get region/state
    const region = address.state || address.region || "";

    // Get local area
    const local =
      address.suburb || address.city_district || address.county || "";

    let location = "";
    if (city && region && local) {
      location = `${city}, ${region}, ${local}`;
    } else if (city && region) {
      location = `${city}, ${region}`;
    } else if (city) {
      location = city;
    } else if (region) {
      location = region;
    } else if (local) {
      location = local;
    }

    return {
      location,
      address: data.display_name || "",
    };
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}

// Inner component that uses useMap hook
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lng: number, lat: number) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleClick = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      onMapClick(lng, lat);
    };

    map.on("click", handleClick);

    // Change cursor to crosshair on hover
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = "";
      }
    };
  }, [map, isLoaded, onMapClick]);

  return null;
}

export function LocationPicker({
  value,
  onChange,
  onCityChange,
  className,
  privacyMode = false,
}: LocationPickerProps) {
  const locale = useLocale();
  const t = useTranslations("common.mapPicker");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");

  const handleMapClick = useCallback(
    async (lng: number, lat: number) => {
      setIsLoading(true);

      // Update location immediately
      onChange({ lat, lng });

      // Perform reverse geocoding
      const result = await reverseGeocode(lat, lng, locale);

      if (result) {
        setSelectedAddress(result.address);
        if (onCityChange && result.location) {
          onCityChange(result.location);
        }
      }

      setIsLoading(false);
    },
    [locale, onChange, onCityChange],
  );

  const handleMarkerDragEnd = useCallback(
    async (lngLat: { lng: number; lat: number }) => {
      setIsLoading(true);

      onChange({ lat: lngLat.lat, lng: lngLat.lng });

      const result = await reverseGeocode(lngLat.lat, lngLat.lng, locale);

      if (result) {
        setSelectedAddress(result.address);
        if (onCityChange && result.location) {
          onCityChange(result.location);
        }
      }

      setIsLoading(false);
    },
    [locale, onChange, onCityChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative h-[300px] w-full overflow-hidden rounded-lg border">
        <Map
          center={value ? [value.lng, value.lat] : GERMANY_CENTER}
          zoom={value ? 12 : GERMANY_ZOOM}
        >
          <MapClickHandler onMapClick={handleMapClick} />
          <MapControls position="top-right" showZoom showLocate />

          {value && (
            <MapMarker
              longitude={value.lng}
              latitude={value.lat}
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <MarkerContent className="cursor-grab active:cursor-grabbing">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <MapPin className="h-5 w-5" />
                </div>
              </MarkerContent>
            </MapMarker>
          )}
        </Map>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Instructions */}
        {!value && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-md">
            {privacyMode ? t("selectArea") : t("selectPosition")}
          </div>
        )}
      </div>

      {/* Selected location info */}
      {value && (
        <div className="rounded-md bg-muted/50 p-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {privacyMode ? t("selectedArea") : t("selectedPosition")}
            </span>
          </div>
          {!privacyMode && selectedAddress && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {selectedAddress}
            </p>
          )}
          {!privacyMode && <p className="mt-1 text-xs text-muted-foreground">
            {t("coordinates", {
              lat: value.lat.toFixed(4),
              lng: value.lng.toFixed(4),
            })}
          </p>}
        </div>
      )}
    </div>
  );
}
