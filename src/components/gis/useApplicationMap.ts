import { useEffect, useRef, useState } from "react";
import type { Application } from "../../pages/GIS/types";
import { BUCHEON_CENTER, getMapLocation } from "../../pages/GIS/mapLocations";
import { loadKakaoMaps } from "../../lib/kakao/maps";
import type { KakaoMap, KakaoMaps, LatLng } from "../../lib/kakao/maps";
import { addApplicationMarker } from "./applicationMarkers";

export type ApplicationMapOptions = {
  applications: Application[];
  selectedId?: string;
  showMarkers: boolean;
  onSelect: (id: string) => void;
};
type MapRuntime = { maps: KakaoMaps; map: KakaoMap };

export function useApplicationMap({
  applications,
  selectedId,
  showMarkers,
  onSelect,
}: ApplicationMapOptions) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const centeredSelection = useRef<{
    runtime: MapRuntime;
    id: string;
  } | undefined>(undefined);
  const lastIntentionalCenter = useRef<LatLng | null>(null);
  const [runtime, setRuntime] = useState<MapRuntime>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [level, setLevel] = useState(6);
  const selectedApplication = applications.find(
    (application) => application.id === selectedId,
  );
  const location = selectedApplication && getMapLocation(selectedApplication);
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const hasDemoLocations = applications.some(
    (application) => getMapLocation(application)?.source === "demo",
  );

  useEffect(() => {
    const container = mapContainerRef.current;

    if (!container) return;
    let disposed = false;
    let disposeMap: (() => void) | undefined;

    loadKakaoMaps()
      .then((maps) => {
        if (disposed) return;
        lastIntentionalCenter.current = new maps.LatLng(
          BUCHEON_CENTER.latitude,
          BUCHEON_CENTER.longitude,
        );
        const map = new maps.Map(container, {
          center: lastIntentionalCenter.current,
          level: 6,
        });

        map.setMinLevel(2);
        map.setMaxLevel(9);
        const rememberCenter = () => {
          lastIntentionalCenter.current = map.getCenter();
        };

        const onZoom = () => {
          rememberCenter();
          setLevel(map.getLevel());
        };

        maps.event.addListener(map, "zoom_changed", onZoom);
        maps.event.addListener(map, "dragend", rememberCenter);
        const observer = new ResizeObserver(() => {
          map.relayout();
          if (lastIntentionalCenter.current)
            map.setCenter(lastIntentionalCenter.current);
        });

        observer.observe(container);
        disposeMap = () => {
          observer.disconnect();
          maps.event.removeListener(map, "zoom_changed", onZoom);
          maps.event.removeListener(map, "dragend", rememberCenter);
          container.replaceChildren();
        };

        setRuntime({ maps, map });
      })
      .catch(() => {
        if (!disposed)
          setError(
            "지도를 불러오지 못했습니다. 네트워크와 카카오맵 키·등록 도메인을 확인해 주세요.",
          );
      });

    return () => {
      disposed = true;
      disposeMap?.();
    };
  }, [attempt]);

  useEffect(() => {
    if (!selectedId) {
      centeredSelection.current = undefined;

      return;
    }

    if (!runtime || latitude === undefined || longitude === undefined) return;
    if (
      centeredSelection.current?.runtime === runtime &&
      centeredSelection.current.id === selectedId
    ) return;
    centeredSelection.current = { runtime, id: selectedId };
    lastIntentionalCenter.current = new runtime.maps.LatLng(
      latitude,
      longitude,
    );
    runtime.map.panTo(lastIntentionalCenter.current);
  }, [runtime, selectedId, latitude, longitude]);

  useEffect(() => {
    if (!runtime || !showMarkers) return;
    const removeMarkers: (() => void)[] = [];

    for (const application of applications) {
      const removeMarker = addApplicationMarker({
        ...runtime,
        application,
        isSelected: application.id === selectedId,
        onSelect,
      });

      if (removeMarker) removeMarkers.push(removeMarker);
    }

    return () => removeMarkers.forEach((removeMarker) => removeMarker());
  }, [runtime, applications, selectedId, showMarkers, onSelect]);

  function retry() {
    setError("");
    setAttempt((attempt) => attempt + 1);
  }

  function zoomIn() {
    runtime?.map.setLevel(level - 1);
  }

  function zoomOut() {
    runtime?.map.setLevel(level + 1);
  }

  return {
    mapContainerRef,
    error,
    hasDemoLocations,
    retry,
    zoomIn,
    zoomOut,
    isLoading: !runtime && !error,
    canZoomIn: !!runtime && level > 2,
    canZoomOut: !!runtime && level < 9,
  };
}
