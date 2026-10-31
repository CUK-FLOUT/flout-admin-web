import { useEffect, useRef, useState } from "react";
import { infrastructureAssets as assets } from "../../pages/Infrastructure/assets";
import type { InfrastructureIssue } from "../../pages/Infrastructure/types";

type Props = {
  issues: InfrastructureIssue[];
  selectedId?: string;
  showMarkers: boolean;
  onSelect: (id: string) => void;
};
export default function InfrastructureMap({
  issues,
  selectedId,
  showMarkers,
  onSelect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(678),
    [height, setHeight] = useState(523),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });

  // Fit the initial marker range inside the current map viewport, above its legend.
  const markerTop = Math.min(...issues.map((issue) => issue.marker.y));
  const markerBottom = Math.max(...issues.map((issue) => issue.marker.y + 36));
  const markerHeight = markerBottom - markerTop;
  const scale = Math.min(
    width / 678,
    issues.length ? (height - 64) / markerHeight : Infinity,
  );
  const offsetX = (width - 678 * scale) / 2;
  const offsetY =
    issues.length
      ? Math.min(0, height - 64 - markerBottom * scale)
      : 0;

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([e]) => {
      setWidth(e.contentRect.width);
      setHeight(e.contentRect.height);
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="지역·공공 문제 지도 미리보기"
      className="relative h-[523px] w-full min-w-0 touch-none overflow-hidden rounded-md bg-[#f4f5f6] min-[1102px]:h-full"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const prev = drag.current;

        setPan((p) => ({
          x: p.x + (e.clientX - prev.x) / scale,
          y: p.y + (e.clientY - prev.y) / scale,
        }));
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div
        className="absolute top-0 left-0 h-[568px] w-[678px] origin-top-left"
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
        }}
      >
        <div
          className="relative h-[568px] w-[678px] origin-center"
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          {[
            [assets.mapBackground, 0, 0],
            [assets.mapBlocks, 28, 28],
            [assets.mapWater, 28, 22],
            [assets.mapRiverOuter, 317, -53],
            [assets.mapRiverInner, 325, -45],
            [assets.mapRoads, -32, -30],
          ].map(([src, x, y]) => (
            <img
              key={String(src)}
              src={String(src)}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: Number(x), top: Number(y) }}
            />
          ))}
          {[
            ["부천시청", 382, 103],
            ["원미역", 92, 377],
            ["부천종합운동장역", 500, 337],
            ["중동역", 265, 165],
            ["상동역", 535, 192],
          ].map(([label, x, y]) => (
            <span
              key={label}
              className="absolute text-[13px] font-bold leading-[normal]"
              style={{ left: Number(x), top: Number(y) }}
            >
              {label}
            </span>
          ))}
          <img
            src={assets.mapDots}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-[111px] left-[83px] max-w-none"
          />
          {showMarkers &&
            issues.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={
                  a.code + " " + a.kind + " " + a.status + " 지도 선택"
                }
                aria-pressed={a.id === selectedId}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(a.id)}
                className="absolute flex h-9 items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-[#234f73]"
                style={{
                  left: a.marker.labelBefore ? a.marker.x - 96 : a.marker.x,
                  top: a.marker.y,
                }}
              >
                <span
                  className={
                    "relative block h-9 w-8 shrink-0 " +
                    (a.marker.labelBefore ? "order-2" : "")
                  }
                >
                  <img
                    src={
                      a.status === "조치 완료"
                        ? assets.completedPin
                        : a.status === "검토 대기"
                          ? assets.waitingPin
                          : assets.reviewPin
                    }
                    alt=""
                    width={32}
                    height={36}
                    className="max-w-none"
                  />
                  <span className="absolute top-[6px] left-0 w-8 text-center font-[family-name:Inter,sans-serif] text-xs font-bold leading-[18px] text-white">
                    {a.number}
                  </span>
                </span>
                <span
                  className={
                    "flex h-6 items-center justify-center rounded-[5px] border border-[#cbd5e1] bg-white px-2 font-[family-name:Inter,sans-serif] text-xs leading-[18px] text-[#334155] " +
                    (a.marker.labelBefore ? "w-[92px]" : "min-w-[70px]")
                  }
                >
                  {a.status}
                </span>
              </button>
            ))}
        </div>
      </div>
      <div
        className="absolute top-4 right-4 flex h-[88px] w-9 flex-col items-center gap-1 rounded-lg border border-[#c8d0d7] bg-white p-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          aria-label="지역 지도 확대"
          disabled={zoom >= 2}
          onClick={() => setZoom((v) => Math.min(2, v + 0.2))}
          className="h-8 w-full text-2xl font-bold leading-8 disabled:opacity-40"
        >
          +
        </button>
        <button
          aria-label="지역 지도 축소"
          disabled={zoom <= 1}
          onClick={() => {
            setZoom((v) => Math.max(1, v - 0.2));
            if (zoom <= 1.2) setPan({ x: 0, y: 0 });
          }}
          className="h-8 w-full text-2xl font-bold leading-8 disabled:opacity-40"
        >
          −
        </button>
      </div>
      <div
        className="absolute bottom-[10px] left-4 flex min-h-11 max-w-[calc(100%_-_32px)] flex-wrap items-center gap-x-4 gap-y-1 rounded-md border-[0.75px] border-[#c8d0d7] bg-white px-3 py-2 text-sm leading-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
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
