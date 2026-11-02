export interface LatLng {
  getLat(): number;
  getLng(): number;
}
export interface KakaoMap {
  getCenter(): LatLng;
  setCenter(center: LatLng): void;
  panTo(center: LatLng): void;
  getLevel(): number;
  setLevel(level: number): void;
  setMinLevel(level: number): void;
  setMaxLevel(level: number): void;
  relayout(): void;
}
export interface KakaoOverlay {
  setMap(map: KakaoMap | null): void;
}
export interface KakaoMaps {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => LatLng;
  Map: new (
    container: HTMLElement,
    options: { center: LatLng; level: number },
  ) => KakaoMap;
  CustomOverlay: new (options: {
    map: KakaoMap;
    position: LatLng;
    content: HTMLElement;
    xAnchor: number;
    yAnchor: number;
    zIndex: number;
  }) => KakaoOverlay;
  event: {
    addListener(map: KakaoMap, name: string, handler: () => void): void;
    removeListener(map: KakaoMap, name: string, handler: () => void): void;
    preventMap(): void;
  };
}
declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let sdkPromise: Promise<KakaoMaps> | undefined;
const scriptId = "flout-kakao-maps-sdk";

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (sdkPromise) return sdkPromise;
  const key = import.meta.env.VITE_KAKAO_MAP_KEY?.trim();

  if (!key)
    return Promise.reject(new Error("카카오맵 키 설정을 확인해 주세요."));

  sdkPromise = new Promise<KakaoMaps>((resolve, reject) => {
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script?.removeEventListener("load", ready);
      script?.removeEventListener("error", fail);
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      script?.remove();
      reject(
        new Error(
          "지도를 불러오지 못했습니다. 네트워크와 카카오맵 도메인 설정을 확인해 주세요.",
        ),
      );
    };

    const ready = () => {
      const maps = window.kakao?.maps;

      if (!maps) return fail();
      try {
        maps.load(() => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(maps);
        });
      } catch {
        fail();
      }
    };

    const timer = window.setTimeout(fail, 20000);

    if (window.kakao?.maps) {
      ready();

      return;
    }

    const needsScript = !script;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    }

    script.addEventListener("load", ready);
    script.addEventListener("error", fail);
    if (needsScript) document.head.append(script);
  }).catch((error: unknown) => {
    sdkPromise = undefined;
    throw error;
  });

  return sdkPromise;
}
