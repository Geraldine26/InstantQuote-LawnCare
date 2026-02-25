"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { LatLngPoint } from "@/store/quoteStore";

const DEFAULT_CENTER = { lat: 40.7608, lng: -111.891 };
const DEFAULT_BRAND_COLOR = "#16a34a";
const SQ_METERS_TO_SQFT = 10.7639104;
const TOTAL_SQFT_STORAGE_KEY = "gl_quote_total_sqft";

interface MapDrawerProps {
  address: string;
  initialCenter: LatLngPoint | null;
  initialPolygons: LatLngPoint[][];
  initialSqft: number;
  onAreaChange: (sqft: number) => void;
  onPolygonsChange: (polygons: LatLngPoint[][]) => void;
  onGetPriceNow: () => void;
  onStartOver: () => void;
}

export function MapDrawer({
  address,
  initialCenter,
  initialPolygons,
  initialSqft,
  onAreaChange,
  onPolygonsChange,
  onGetPriceNow,
  onStartOver,
}: MapDrawerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const polygonListenersRef = useRef<Map<google.maps.Polygon, google.maps.MapsEventListener[]>>(new Map());
  const globalListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const initializedRef = useRef(false);
  const mountedRef = useRef(false);

  const onAreaChangeRef = useRef(onAreaChange);
  const onPolygonsChangeRef = useRef(onPolygonsChange);
  const onStartOverRef = useRef(onStartOver);
  const onGetPriceNowRef = useRef(onGetPriceNow);

  const [mapType, setMapType] = useState<"satellite" | "roadmap">("satellite");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSqft, setTotalSqft] = useState(Math.max(0, Math.round(initialSqft)));
  const [polygonCount, setPolygonCount] = useState(initialPolygons.length);
  const [pillPulseKey, setPillPulseKey] = useState(0);

  const initialCenterRef = useRef(initialCenter ?? DEFAULT_CENTER);
  const initialPolygonsRef = useRef(initialPolygons);
  const initialSqftRef = useRef(initialSqft);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onAreaChangeRef.current = onAreaChange;
    onPolygonsChangeRef.current = onPolygonsChange;
    onStartOverRef.current = onStartOver;
    onGetPriceNowRef.current = onGetPriceNow;
  }, [onAreaChange, onPolygonsChange, onStartOver, onGetPriceNow]);

  const getBrandColor = useCallback(() => {
    if (typeof window === "undefined") {
      return DEFAULT_BRAND_COLOR;
    }

    const cssBrand = window.getComputedStyle(document.body).getPropertyValue("--brand").trim();
    return cssBrand || DEFAULT_BRAND_COLOR;
  }, []);

  const persistSqft = useCallback((sqft: number) => {
    if (typeof window === "undefined") {
      return;
    }

    sessionStorage.setItem(TOTAL_SQFT_STORAGE_KEY, String(Math.max(0, Math.round(sqft))));
  }, []);

  const serializePolygons = useCallback((): LatLngPoint[][] => {
    return polygonsRef.current.map((polygon) =>
      polygon
        .getPath()
        .getArray()
        .map((point) => ({ lat: point.lat(), lng: point.lng() })),
    );
  }, []);

  const recalculateTotalArea = useCallback(
    (shouldPulse: boolean) => {
      const googleApi = window.google;

      if (!googleApi?.maps?.geometry) {
        return;
      }

      const totalSqMeters = polygonsRef.current.reduce((sum, polygon) => {
        return sum + googleApi.maps.geometry.spherical.computeArea(polygon.getPath());
      }, 0);

      const nextSqft = Math.round(totalSqMeters * SQ_METERS_TO_SQFT);
      const polygonPaths = serializePolygons();

      onAreaChangeRef.current(nextSqft);
      onPolygonsChangeRef.current(polygonPaths);
      persistSqft(nextSqft);

      if (!mountedRef.current) {
        return;
      }

      setPolygonCount(polygonPaths.length);
      setTotalSqft(nextSqft);

      if (shouldPulse) {
        setPillPulseKey((previous) => previous + 1);
      }
    },
    [persistSqft, serializePolygons],
  );

  const removePolygon = useCallback(
    (polygon: google.maps.Polygon, shouldRecalculate: boolean) => {
      const polygonListeners = polygonListenersRef.current.get(polygon);
      if (polygonListeners) {
        polygonListeners.forEach((listener) => listener.remove());
        polygonListenersRef.current.delete(polygon);
      }

      polygon.setMap(null);
      polygonsRef.current = polygonsRef.current.filter((item) => item !== polygon);

      if (shouldRecalculate) {
        recalculateTotalArea(true);
      }
    },
    [recalculateTotalArea],
  );

  const setPolygonDrawingMode = useCallback(() => {
    const drawingManager = drawingManagerRef.current;

    if (!drawingManager || !window.google?.maps?.drawing) {
      return;
    }

    drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
  }, []);

  const attachPolygon = useCallback(
    (polygon: google.maps.Polygon) => {
      const brandColor = getBrandColor();

      polygon.setOptions({
        fillColor: brandColor,
        fillOpacity: 0.24,
        strokeColor: brandColor,
        strokeWeight: 2,
        editable: true,
        draggable: false,
        clickable: true,
      });

      polygonsRef.current.push(polygon);

      const path = polygon.getPath();
      const listeners = [
        path.addListener("insert_at", () => recalculateTotalArea(true)),
        path.addListener("set_at", () => recalculateTotalArea(true)),
        path.addListener("remove_at", () => recalculateTotalArea(true)),
        polygon.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
          if (event.vertex === undefined) {
            removePolygon(polygon, true);
            setPolygonDrawingMode();
          }
        }),
      ];

      polygonListenersRef.current.set(polygon, listeners);
      recalculateTotalArea(true);
    },
    [getBrandColor, recalculateTotalArea, removePolygon, setPolygonDrawingMode],
  );

  const clearAllPolygons = useCallback(() => {
    if (polygonsRef.current.length === 0) {
      persistSqft(0);
      onAreaChangeRef.current(0);
      onPolygonsChangeRef.current([]);
      setTotalSqft(0);
      setPolygonCount(0);
      setPolygonDrawingMode();
      return;
    }

    const existing = [...polygonsRef.current];
    existing.forEach((polygon) => removePolygon(polygon, false));

    onAreaChangeRef.current(0);
    onPolygonsChangeRef.current([]);
    persistSqft(0);

    if (mountedRef.current) {
      setTotalSqft(0);
      setPolygonCount(0);
      setPillPulseKey((previous) => previous + 1);
    }

    setPolygonDrawingMode();
  }, [persistSqft, removePolygon, setPolygonDrawingMode]);

  const handleDeleteLastShape = useCallback(() => {
    const lastPolygon = polygonsRef.current[polygonsRef.current.length - 1];

    if (!lastPolygon) {
      return;
    }

    removePolygon(lastPolygon, true);
    setPolygonDrawingMode();
  }, [removePolygon, setPolygonDrawingMode]);

  const handleStartOver = useCallback(() => {
    clearAllPolygons();

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("gl_final_quote");
    }

    onStartOverRef.current();
  }, [clearAllPolygons]);

  useEffect(() => {
    if (initializedRef.current || !mapContainerRef.current) {
      return;
    }

    initializedRef.current = true;
    let cancelled = false;

    async function initializeMap() {
      try {
        setLoading(true);
        setError(null);

        const googleApi = await loadGoogleMaps();

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const map = new googleApi.maps.Map(mapContainerRef.current, {
          center: initialCenterRef.current,
          zoom: 20,
          mapTypeId: googleApi.maps.MapTypeId.SATELLITE,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          gestureHandling: "greedy",
          tilt: 0,
        });

        map.setTilt(0);

        mapRef.current = map;
        geocoderRef.current = new googleApi.maps.Geocoder();

        globalListenersRef.current.push(
          map.addListener("tilt_changed", () => {
            if (map.getTilt() !== 0) {
              map.setTilt(0);
            }
          }),
        );

        const drawingManager = new googleApi.maps.drawing.DrawingManager({
          drawingControl: false,
          drawingMode: googleApi.maps.drawing.OverlayType.POLYGON,
          polygonOptions: {
            fillColor: getBrandColor(),
            fillOpacity: 0.24,
            strokeColor: getBrandColor(),
            strokeWeight: 2,
            clickable: true,
            editable: true,
            draggable: false,
          },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        globalListenersRef.current.push(
          googleApi.maps.event.addListener(drawingManager, "overlaycomplete", (event: google.maps.drawing.OverlayCompleteEvent) => {
            if (event.type !== googleApi.maps.drawing.OverlayType.POLYGON) {
              return;
            }

            attachPolygon(event.overlay as google.maps.Polygon);
            setPolygonDrawingMode();
          }),
        );

        initialPolygonsRef.current.forEach((polygonPath) => {
          const polygon = new googleApi.maps.Polygon({
            paths: polygonPath,
            map,
          });

          attachPolygon(polygon);
        });

        if (initialPolygonsRef.current.length === 0) {
          persistSqft(initialSqftRef.current);
        }

        setPolygonDrawingMode();
        setLoading(false);
      } catch (errorValue) {
        if (!cancelled) {
          setError(errorValue instanceof Error ? errorValue.message : "Unable to initialize Google Maps.");
          setLoading(false);
        }
      }
    }

    void initializeMap();

    const globalListeners = globalListenersRef.current;
    const polygonListenersMap = polygonListenersRef.current;
    const polygons = polygonsRef.current;

    return () => {
      cancelled = true;

      globalListeners.forEach((listener) => listener.remove());
      globalListenersRef.current = [];

      polygonListenersMap.forEach((listeners) => {
        listeners.forEach((listener) => listener.remove());
      });
      polygonListenersMap.clear();

      polygons.forEach((polygon) => polygon.setMap(null));
      polygonsRef.current = [];

      drawingManagerRef.current?.setMap(null);
      drawingManagerRef.current = null;

      mapRef.current = null;
      geocoderRef.current = null;
      initializedRef.current = false;
    };
  }, [attachPolygon, getBrandColor, persistSqft, setPolygonDrawingMode]);

  useEffect(() => {
    if (!address || !mapRef.current || !geocoderRef.current) {
      return;
    }

    geocoderRef.current.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location || !mapRef.current) {
        return;
      }

      mapRef.current.setCenter(results[0].geometry.location);
      mapRef.current.setTilt(0);
    });
  }, [address]);

  const switchMapType = (nextType: "satellite" | "roadmap") => {
    setMapType(nextType);

    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.setMapTypeId(nextType === "satellite" ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP);
    map.setTilt(0);
  };

  const formattedArea = new Intl.NumberFormat("en-US").format(totalSqft);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            aria-label="Get Price Now"
            className="min-h-11 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={totalSqft <= 0}
            onClick={() => onGetPriceNowRef.current()}
            type="button"
          >
            Get Price Now
          </button>
          <button
            aria-label="Start Over"
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={handleStartOver}
            type="button"
          >
            Start Over
          </button>
          <button
            aria-label="Delete last shape"
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={polygonCount === 0}
            onClick={handleDeleteLastShape}
            type="button"
          >
            Delete Last Shape
          </button>
        </div>

        <div className="flex gap-2 md:justify-end">
          <button
            aria-label="Show satellite map"
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mapType === "satellite" ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => switchMapType("satellite")}
            type="button"
          >
            Satellite
          </button>
          <button
            aria-label="Show map view"
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mapType === "roadmap" ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => switchMapType("roadmap")}
            type="button"
          >
            Map
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-soft">
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 md:left-4 md:translate-x-0">
          <div key={pillPulseKey} className="animate-area-pill rounded-2xl bg-white px-4 py-2.5 shadow-lg ring-1 ring-slate-200/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">TOTAL AREA</p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-2xl font-extrabold leading-none text-slate-900 sm:text-3xl">{formattedArea}</p>
              <p className="pb-0.5 text-sm font-semibold text-slate-600">sqft</p>
            </div>
          </div>
        </div>

        <div ref={mapContainerRef} className="map-canvas h-[58vh] min-h-[360px] md:h-[62vh] md:min-h-[560px]" aria-label="Map drawing canvas" />

        {loading && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-white/75 text-sm font-semibold text-slate-700">Loading map...</div>
        )}
      </div>

      {error && <p className="text-sm text-rose-700">{error}</p>}
      <p className="text-xs text-slate-600">Right-click a polygon to delete it on desktop, or use &quot;Delete Last Shape&quot; on touch devices.</p>
    </section>
  );
}
