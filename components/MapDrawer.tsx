"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { QUOTE_SESSION_KEYS } from "@/lib/quoteSession";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { LatLngPoint } from "@/store/quoteStore";

const DEFAULT_CENTER = { lat: 40.7608, lng: -111.891 };
const DEFAULT_BRAND_COLOR = "#16a34a";
const SQ_METERS_TO_SQFT = 10.7639104;

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
  const mapListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const firstVertexMarkersRef = useRef<Map<google.maps.Polygon, google.maps.Marker>>(new Map());

  const initializedRef = useRef(false);
  const mountedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawingEnabledRef = useRef(false);
  const pendingVerticesRef = useRef(0);

  const onAreaChangeRef = useRef(onAreaChange);
  const onPolygonsChangeRef = useRef(onPolygonsChange);
  const onStartOverRef = useRef(onStartOver);
  const onGetPriceNowRef = useRef(onGetPriceNow);

  const [mapType, setMapType] = useState<"satellite" | "roadmap">("satellite");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCloseHint, setShowCloseHint] = useState(false);
  const [totalSqft, setTotalSqft] = useState(initialPolygons.length > 0 ? Math.max(0, Math.round(initialSqft)) : 0);
  const [pillPulseKey, setPillPulseKey] = useState(0);

  const initialCenterRef = useRef(initialCenter ?? DEFAULT_CENTER);
  const initialPolygonsRef = useRef(initialPolygons);

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

    sessionStorage.setItem(QUOTE_SESSION_KEYS.totalSqft, String(Math.max(0, Math.round(sqft))));
  }, []);

  const serializePolygons = useCallback((): LatLngPoint[][] => {
    return polygonsRef.current.map((polygon) =>
      polygon
        .getPath()
        .getArray()
        .map((point) => ({ lat: point.lat(), lng: point.lng() })),
    );
  }, []);

  const enforceFlatMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (map.getTilt() !== 0) {
      map.setTilt(0);
    }
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const disableDrawingMode = useCallback(() => {
    const drawingManager = drawingManagerRef.current;
    if (!drawingManager) {
      return;
    }

    drawingManager.setDrawingMode(null);
    drawingEnabledRef.current = false;
    pendingVerticesRef.current = 0;

    if (mountedRef.current) {
      setShowCloseHint(false);
    }
  }, []);

  const enableDrawingMode = useCallback(() => {
    const drawingManager = drawingManagerRef.current;
    if (!drawingManager || !window.google?.maps?.drawing) {
      return;
    }

    drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    drawingEnabledRef.current = true;
    pendingVerticesRef.current = 0;

    if (mountedRef.current) {
      setShowCloseHint(false);
    }
  }, []);

  const scheduleDrawingResume = useCallback(
    (delayMs = 180) => {
      clearResumeTimer();

      resumeTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        enableDrawingMode();
      }, delayMs);
    },
    [clearResumeTimer, enableDrawingMode],
  );

  const syncAreaFromPolygons = useCallback(
    (shouldPulse: boolean) => {
      const googleApi = window.google;

      if (!googleApi?.maps?.geometry) {
        return;
      }

      const totalSqMeters = polygonsRef.current.reduce((sum, polygon) => {
        return sum + googleApi.maps.geometry.spherical.computeArea(polygon.getPath());
      }, 0);

      const nextSqft = Math.max(0, Math.round(totalSqMeters * SQ_METERS_TO_SQFT));
      const polygonPaths = serializePolygons();

      onAreaChangeRef.current(nextSqft);
      onPolygonsChangeRef.current(polygonPaths);
      persistSqft(nextSqft);

      if (!mountedRef.current) {
        return;
      }

      setTotalSqft(nextSqft);

      if (shouldPulse) {
        setPillPulseKey((value) => value + 1);
      }
    },
    [persistSqft, serializePolygons],
  );

  const upsertFirstVertexMarker = useCallback(
    (polygon: google.maps.Polygon) => {
      const path = polygon.getPath();
      const first = path.getAt(0);

      if (!first || !mapRef.current || !window.google?.maps) {
        const existingMarker = firstVertexMarkersRef.current.get(polygon);
        if (existingMarker) {
          existingMarker.setMap(null);
          firstVertexMarkersRef.current.delete(polygon);
        }
        return;
      }

      const existingMarker = firstVertexMarkersRef.current.get(polygon);

      if (existingMarker) {
        existingMarker.setPosition(first);
        return;
      }

      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: first,
        clickable: false,
        zIndex: 1000,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: getBrandColor(),
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      firstVertexMarkersRef.current.set(polygon, marker);
    },
    [getBrandColor],
  );

  const detachPolygon = useCallback((polygon: google.maps.Polygon) => {
    const listeners = polygonListenersRef.current.get(polygon);
    if (listeners) {
      listeners.forEach((listener) => listener.remove());
      polygonListenersRef.current.delete(polygon);
    }

    const marker = firstVertexMarkersRef.current.get(polygon);
    if (marker) {
      marker.setMap(null);
      firstVertexMarkersRef.current.delete(polygon);
    }

    polygon.setMap(null);
    polygonsRef.current = polygonsRef.current.filter((item) => item !== polygon);
  }, []);

  const removePolygon = useCallback(
    (polygon: google.maps.Polygon, shouldRecalculate: boolean) => {
      detachPolygon(polygon);

      if (shouldRecalculate) {
        syncAreaFromPolygons(true);
      }
    },
    [detachPolygon, syncAreaFromPolygons],
  );

  const handlePolygonPathChanged = useCallback(
    (polygon: google.maps.Polygon) => {
      upsertFirstVertexMarker(polygon);
      syncAreaFromPolygons(true);
    },
    [syncAreaFromPolygons, upsertFirstVertexMarker],
  );

  const attachPolygon = useCallback(
    (polygon: google.maps.Polygon) => {
      const brandColor = getBrandColor();

      polygon.setOptions({
        fillColor: brandColor,
        fillOpacity: 0.2,
        strokeColor: brandColor,
        strokeWeight: 3,
        editable: true,
        draggable: false,
        clickable: true,
      });

      // Asegura edición inmediata después de cerrar el shape.
      polygon.setEditable(true);
      polygon.setOptions({ clickable: true });

      polygonsRef.current.push(polygon);

      const path = polygon.getPath();
      const listeners: google.maps.MapsEventListener[] = [
        path.addListener("insert_at", () => handlePolygonPathChanged(polygon)),
        path.addListener("set_at", () => handlePolygonPathChanged(polygon)),
        path.addListener("remove_at", () => handlePolygonPathChanged(polygon)),
        polygon.addListener("mousedown", () => {
          clearResumeTimer();
          disableDrawingMode();
        }),
        polygon.addListener("mouseup", () => {
          scheduleDrawingResume(220);
        }),
        polygon.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
          if (event.vertex === undefined) {
            removePolygon(polygon, true);
            scheduleDrawingResume(160);
          }
        }),
      ];

      polygonListenersRef.current.set(polygon, listeners);
      upsertFirstVertexMarker(polygon);
      syncAreaFromPolygons(true);
    },
    [
      clearResumeTimer,
      disableDrawingMode,
      getBrandColor,
      handlePolygonPathChanged,
      removePolygon,
      scheduleDrawingResume,
      syncAreaFromPolygons,
      upsertFirstVertexMarker,
    ],
  );

  const clearAllPolygons = useCallback(() => {
    const existingPolygons = [...polygonsRef.current];
    existingPolygons.forEach((polygon) => detachPolygon(polygon));

    onAreaChangeRef.current(0);
    onPolygonsChangeRef.current([]);
    persistSqft(0);

    if (mountedRef.current) {
      setTotalSqft(0);
      setPillPulseKey((value) => value + 1);
      setShowCloseHint(false);
    }

    scheduleDrawingResume(0);
  }, [detachPolygon, persistSqft, scheduleDrawingResume]);

  const handleStartOver = useCallback(() => {
    clearAllPolygons();

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(QUOTE_SESSION_KEYS.finalQuote);
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
          minZoom: 18,
          mapTypeId: googleApi.maps.MapTypeId.SATELLITE,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          gestureHandling: "greedy",
          tilt: 0,
        });

        mapRef.current = map;
        geocoderRef.current = new googleApi.maps.Geocoder();

        mapListenersRef.current.push(
          map.addListener("tilt_changed", () => {
            enforceFlatMap();
          }),
        );

        mapListenersRef.current.push(
          map.addListener("maptypeid_changed", () => {
            enforceFlatMap();
          }),
        );

        mapListenersRef.current.push(
          map.addListener("click", () => {
            if (!drawingEnabledRef.current) {
              return;
            }

            pendingVerticesRef.current += 1;
            if (pendingVerticesRef.current >= 2 && mountedRef.current) {
              setShowCloseHint(true);
            }
          }),
        );

        const drawingManager = new googleApi.maps.drawing.DrawingManager({
          drawingControl: false,
          drawingMode: googleApi.maps.drawing.OverlayType.POLYGON,
          polygonOptions: {
            fillColor: getBrandColor(),
            fillOpacity: 0.2,
            strokeColor: getBrandColor(),
            strokeWeight: 3,
            clickable: true,
            editable: true,
            draggable: false,
          },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;
        drawingEnabledRef.current = true;

        mapListenersRef.current.push(
          googleApi.maps.event.addListener(drawingManager, "overlaycomplete", (event: google.maps.drawing.OverlayCompleteEvent) => {
            if (event.type !== googleApi.maps.drawing.OverlayType.POLYGON) {
              return;
            }

            disableDrawingMode();

            const polygon = event.overlay as google.maps.Polygon;
            polygon.setEditable(true);
            polygon.setOptions({ clickable: true });

            attachPolygon(polygon);
            scheduleDrawingResume(180);
          }),
        );

        if (initialPolygonsRef.current.length > 0) {
          initialPolygonsRef.current.forEach((path) => {
            const polygon = new googleApi.maps.Polygon({
              paths: path,
              map,
              editable: true,
              clickable: true,
              strokeWeight: 3,
            });

            attachPolygon(polygon);
          });
        } else {
          onAreaChangeRef.current(0);
          onPolygonsChangeRef.current([]);
          persistSqft(0);
          setTotalSqft(0);
        }

        enableDrawingMode();
        enforceFlatMap();
        setLoading(false);
      } catch (errorValue) {
        if (!cancelled) {
          setError(errorValue instanceof Error ? errorValue.message : "Unable to initialize Google Maps.");
          setLoading(false);
        }
      }
    }

    void initializeMap();

    const mapListeners = mapListenersRef.current;
    const polygonListenersMap = polygonListenersRef.current;
    const firstVertexMarkers = firstVertexMarkersRef.current;
    const polygons = polygonsRef.current;

    return () => {
      cancelled = true;
      clearResumeTimer();

      mapListeners.forEach((listener) => listener.remove());
      mapListenersRef.current = [];

      polygonListenersMap.forEach((listeners) => {
        listeners.forEach((listener) => listener.remove());
      });
      polygonListenersMap.clear();

      firstVertexMarkers.forEach((marker) => marker.setMap(null));
      firstVertexMarkers.clear();

      polygons.forEach((polygon) => polygon.setMap(null));
      polygonsRef.current = [];

      drawingManagerRef.current?.setMap(null);
      drawingManagerRef.current = null;

      mapRef.current = null;
      geocoderRef.current = null;
      initializedRef.current = false;
      drawingEnabledRef.current = false;
      pendingVerticesRef.current = 0;
    };
  }, [
    attachPolygon,
    clearResumeTimer,
    disableDrawingMode,
    enableDrawingMode,
    enforceFlatMap,
    getBrandColor,
    persistSqft,
    scheduleDrawingResume,
  ]);

  useEffect(() => {
    if (!address || !mapRef.current || !geocoderRef.current) {
      return;
    }

    geocoderRef.current.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location || !mapRef.current) {
        return;
      }

      mapRef.current.setCenter(results[0].geometry.location);
      enforceFlatMap();
    });
  }, [address, enforceFlatMap]);

  const switchMapType = useCallback(
    (nextType: "satellite" | "roadmap") => {
      setMapType(nextType);

      if (!mapRef.current) {
        return;
      }

      mapRef.current.setMapTypeId(nextType === "satellite" ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP);
      enforceFlatMap();
    },
    [enforceFlatMap],
  );

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
        </div>

        <div className="ml-auto flex gap-2">
          <button
            aria-label="Show satellite map"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              mapType === "satellite" ? "bg-brand text-white shadow" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
            onClick={() => switchMapType("satellite")}
            type="button"
          >
            Satellite
          </button>
          <button
            aria-label="Show map view"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              mapType === "roadmap" ? "bg-brand text-white shadow" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
            onClick={() => switchMapType("roadmap")}
            type="button"
          >
            Map
          </button>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-600">To finish a shape: tap the first point again.</p>

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

        {showCloseHint && (
          <div className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2">
            <div className="rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] font-medium text-white shadow">Tap the first dot to close.</div>
          </div>
        )}

        <div ref={mapContainerRef} aria-label="Map drawing canvas" className="map-canvas h-[58vh] min-h-[360px] md:h-[62vh] md:min-h-[560px]" />

        {loading && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-white/70 text-sm font-semibold text-slate-700">Loading map...</div>
        )}
      </div>

      {error && <p className="text-sm text-rose-700">{error}</p>}
      <p className="text-xs text-slate-600">Right-click any polygon to delete it.</p>
    </section>
  );
}
