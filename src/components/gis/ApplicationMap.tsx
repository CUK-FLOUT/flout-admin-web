import { useApplicationMap } from "./useApplicationMap";
import type { ApplicationMapOptions } from "./useApplicationMap";
import highDot from "../../assets/gis/imgEllipse.svg";
import mediumDot from "../../assets/gis/imgEllipse1.svg";
import lowDot from "../../assets/gis/imgEllipse2.svg";

export default function ApplicationMap(props: ApplicationMapOptions) {
  const {
    mapContainerRef,
    isLoading,
    error,
    hasDemoLocations,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    retry,
  } = useApplicationMap(props);

  return (
    <div
      aria-label="신청 위치 지도"
      className="relative isolate h-[568px] w-full min-w-0 lg:h-full overflow-hidden rounded-lg border border-[#c8d0d7] bg-[#f4f5f6]"
    >
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      {isLoading && (
        <div
          role="status"
          className="absolute inset-0 z-10 grid place-items-center bg-[#f4f5f6] text-sm text-[#596672]"
        >
          지도를 불러오는 중이에요.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f4f5f6] p-6 text-center text-sm text-[#596672]"
        >
          <p>{error}</p>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-[#c8d0d7] bg-white px-4 py-2 text-[#234f73]"
            onClick={retry}
          >
            다시 시도
          </button>
        </div>
      )}
      {hasDemoLocations && (
        <p className="pointer-events-none absolute left-4 top-4 z-10 rounded bg-white/95 px-2 py-1 text-xs text-[#596672]">
          테스트 좌표 · 실제 신청 위치가 아닙니다
        </p>
      )}
      <div className="absolute right-4 top-4 z-10 flex h-[88px] w-9 flex-col rounded-lg border border-[#c8d0d7] bg-white">
        <button
          type="button"
          aria-label="지도 확대"
          disabled={!canZoomIn}
          onClick={zoomIn}
          className="h-[43px] w-full cursor-pointer text-2xl font-bold disabled:opacity-40"
        >
          +
        </button>
        <button
          type="button"
          aria-label="지도 축소"
          disabled={!canZoomOut}
          onClick={zoomOut}
          className="h-[43px] w-full cursor-pointer text-2xl font-bold disabled:opacity-40"
        >
          −
        </button>
      </div>
      <div className="absolute bottom-[30px] left-4 z-10 flex w-[477px] max-w-[calc(100%_-_32px)] flex-wrap items-center gap-4 rounded-md border border-[#c8d0d7] bg-white px-3 py-2 text-sm">
        {[
          [highDot, "높음"],
          [mediumDot, "주의"],
          [lowDot, "낮음"],
        ].map(([src, label]) => (
          <span key={label} className="flex items-center gap-1">
            <img src={src} alt="" width={14} height={14} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-[#234f73]">
            1
          </span>
          번호 = 신청 위치
        </span>
      </div>
    </div>
  );
}
