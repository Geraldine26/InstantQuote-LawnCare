"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { LatLngPoint } from "@/store/quoteStore";

const DEFAULT_CENTER = { lat: 40.7608, lng: -111.891 };
const SQ_METERS_TO_SQFT = 10.7639104;
const DEFAULT_BRAND_COLOR = "#16a34a";

interface MapDrawerProps {
  address: string;
  initialCenter: LatLngPoint | null;
  initialPolygons: LatLngPoint[][];
  onAreaChange: (sqft: number) => void;
  onPolygonsChange: (polygons: LatLngPoint[][]) => void;
}

export function MapDrawer({ address, initialCenter, initialPolygons, onAreaChange, onPolygonsChange }: MapDrawerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const [mapType, setMapType] = useState<"satellite" | "roadmap">("satellite");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackCenter = useMemo(() => initialCenter ?? DEFAULT_CENTER, [initialCenter]);

  const getBrandColor = useCallback(() => {
    if (typeof window === "undefined") {
      return DEFAULT_BRAND_COLOR;
    }

    const cssBrand = window.getComputedStyle(document.body).getPropertyValue("--brand").trim();
    return cssBrand || DEFAULT_BRAND_COLOR;
  }, []);

  const serializePolygons = useCallback((): LatLngPoint[][] => {
    return polygonsRef.current.map((polygon) =>
      polygon
        .getPath()
        .getArray()
        .map((point) => ({ lat: point.lat(), lng: point.lng() })),
    );
  }, []);

  const recalculateTotalArea = useCallback(() => {
    const googleApi = window.google;

    if (!googleApi?.maps?.geometry) {
      return;
    }

    const totalSqMeters = polygonsRef.current.reduce((sum, polygon) => {
      return sum + googleApi.maps.geometry.spherical.computeArea(polygon.getPath());
    }, 0);

    const totalSqft = Math.round(totalSqMeters * SQ_METERS_TO_SQFT);
    onAreaChange(totalSqft);
    onPolygonsChange(serializePolygons());
  }, [onAreaChange, onPolygonsChange, serializePolygons]);

  const detachPolygon = useCallback(
    (polygon: google.maps.Polygon) => {
      polygon.setMap(null);
      polygonsRef.current = polygonsRef.current.filter((item) => item !== polygon);
      recalculateTotalArea();
    },
    [recalculateTotalArea],
  );

  const attachPolygon = useCallback(
    (polygon: google.maps.Polygon) => {
      polygonsRef.current.push(polygon);
      polygon.setEditable(true);
      polygon.setDraggable(false);

      const path = polygon.getPath();
      listenersRef.current.push(path.addListener("insert_at", recalculateTotalArea));
      listenersRef.current.push(path.addListener("remove_at", recalculateTotalArea));
      listenersRef.current.push(path.addListener("set_at", recalculateTotalArea));
      listenersRef.current.push(
        polygon.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
          if (event.vertex === undefined) {
            detachPolygon(polygon);
          }
        }),
      );

      recalculateTotalArea();
    },
    [detachPolygon, recalculateTotalArea],
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) {
        return;
      }

      try {
        setLoading(true);
        const googleApi = await loadGoogleMaps();

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const map = new googleApi.maps.Map(mapContainerRef.current, {
          center: fallbackCenter,
          zoom: 20,
          mapTypeId: googleApi.maps.MapTypeId.SATELLITE,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });

        mapRef.current = map;
        geocoderRef.current = new googleApi.maps.Geocoder();
        const brandColor = getBrandColor();

        const drawingManager = new googleApi.maps.drawing.DrawingManager({
          drawingControl: true,
          drawingControlOptions: {
            drawingModes: [googleApi.maps.drawing.OverlayType.POLYGON],
            position: googleApi.maps.ControlPosition.TOP_CENTER,
          },
          polygonOptions: {
            fillColor: brandColor,
            fillOpacity: 0.25,
            strokeColor: brandColor,
            strokeWeight: 2,
            clickable: true,
            editable: true,
            draggable: false,
          },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        listenersRef.current.push(
          googleApi.maps.event.addListener(drawingManager, "overlaycomplete", (event: google.maps.drawing.OverlayCompleteEvent) => {
            if (event.type === googleApi.maps.drawing.OverlayType.POLYGON) {
              attachPolygon(event.overlay as google.maps.Polygon);
            }
          }),
        );

        if (initialPolygons.length > 0) {
          initialPolygons.forEach((path) => {
            const polygon = new googleApi.maps.Polygon({
              paths: path,
              map,
              fillColor: brandColor,
              fillOpacity: 0.25,
              strokeColor: brandColor,
              strokeWeight: 2,
              clickable: true,
              editable: true,
              draggable: false,
            });
            attachPolygon(polygon);
          });
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to initialize Google Maps.");
          setLoading(false);
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];
      polygonsRef.current.forEach((polygon) => polygon.setMap(null));
      polygonsRef.current = [];
      drawingManagerRef.current?.setMap(null);
      drawingManagerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, [attachPolygon, fallbackCenter, getBrandColor, initialPolygons]);

  useEffect(() => {
    if (!address || !mapRef.current || !geocoderRef.current) {
      return;
    }

    geocoderRef.current.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location && mapRef.current) {
        mapRef.current.setCenter(results[0].geometry.location);
      }
    });
  }, [address]);

  const switchMapType = (nextType: "satellite" | "roadmap") => {
    setMapType(nextType);
    mapRef.current?.setMapTypeId(nextType === "satellite" ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          aria-label="Show satellite map"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            mapType === "satellite" ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
          }`}
          onClick={() => switchMapType("satellite")}
          type="button"
        >
          Satellite
        </button>
        <button
          aria-label="Show map view"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            mapType === "roadmap" ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
          }`}
          onClick={() => switchMapType("roadmap")}
          type="button"
        >
          Map
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-soft">
        <div ref={mapContainerRef} className="map-canvas" aria-label="Map drawing canvas" />
        {loading && <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-medium text-slate-700">Loading map...</div>}
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <p className="text-xs text-slate-600">Draw one or more lawn polygons. Right-click a polygon edge area to remove that shape.</p>
    </div>
  );
}
