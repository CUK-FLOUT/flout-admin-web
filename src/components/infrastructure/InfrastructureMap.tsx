import { infrastructureAssets as assets } from "../../pages/Infrastructure/assets";
import { getInfrastructureLocation } from "../../pages/Infrastructure/mapLocations";
import { useInfrastructureMap } from "./useInfrastructureMap";
import type { InfrastructureMapOptions } from "./useInfrastructureMap";

export default function InfrastructureMap(props: InfrastructureMapOptions) {
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
  } = useInfrastructureMap(props);
  const missingLocations = props.issues.filter(
    (issue) => !getInfrastructureLocation(issue),
  ).length;

  return (
    <div
      role="region"
      aria-label="지역·공공 문제 지도"
      className="relative isolate h-[523px] w-full min-w-0 overflow-hidden rounded-md bg-[#f4f5f6] min-[1102px]:h-full"
    >
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      {isLoading && (
        <div
          role="status"
          className="absolute inset-0 z-20 grid place-items-center bg-[#f4f5f6] text-sm text-[#596672]"
        >
          지도를 불러오는 중이에요.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#f4f5f6] p-6 text-center text-sm text-[#596672]"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-md border border-[#c8d0d7] bg-white px-4 py-2 text-[#234f73]"
          >
            다시 시도
          </button>
        </div>
      )}
      {(hasDemoLocations || missingLocations > 0) && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%_-_80px)] rounded bg-white/95 px-2 py-1 text-xs text-[#596672]">
          {hasDemoLocations && <p>테스트 좌표 · 실제 문제 위치가 아닙니다</p>}
          {missingLocations > 0 && (
            <p>
              위치 정보가 없는 {missingLocations}건은 목록에서 확인해 주세요.
            </p>
          )}
        </div>
      )}
      <div className="absolute top-4 right-4 z-10 flex h-[88px] w-9 flex-col items-center gap-1 rounded-lg border border-[#c8d0d7] bg-white p-1">
        <button
          type="button"
          aria-label="지역 지도 확대"
          disabled={!canZoomIn}
          onClick={zoomIn}
          className="h-8 w-full text-2xl font-bold leading-8 disabled:opacity-40"
        >
          +
        </button>
        <button
          type="button"
          aria-label="지역 지도 축소"
          disabled={!canZoomOut}
          onClick={zoomOut}
          className="h-8 w-full text-2xl font-bold leading-8 disabled:opacity-40"
        >
          −
        </button>
      </div>
      <div className="absolute z-10 bottom-[30px] left-4 flex min-h-11 max-w-[calc(100%_-_32px)] flex-wrap items-center gap-x-4 gap-y-1 rounded-md border-[0.75px] border-[#c8d0d7] bg-white px-3 py-2 text-sm leading-5">
        {[
          [assets.waitingDot, "검토 대기", "#a53632"],
          [assets.reviewDot, "검토 중", "#865a16"],
          [assets.completedDot, "조치 완료", "#27654d"],
        ].map(([src, label, color]) => (
          <span
            key={label}
            className="flex items-center gap-[5px] whitespace-nowrap"
            style={{ color }}
          >
            <img src={src} alt="" width={14} height={14} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-[5px] whitespace-nowrap font-semibold">
          <span className="grid size-[26px] place-items-center rounded-full border-2 border-[#234f73] font-normal">
            1
          </span>
          번호 = 신청 위치
        </span>
      </div>
    </div>
  );
}
