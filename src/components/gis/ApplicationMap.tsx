import { useEffect, useRef, useState } from "react";
import type { Application } from "../../pages/GIS/types";
import bg from "../../assets/gis/img01Gis.svg";
import group from "../../assets/gis/imgGroup.svg";
import group1 from "../../assets/gis/imgGroup1.svg";
import riverOuter from "../../assets/gis/imgVector.svg";
import riverInner from "../../assets/gis/imgVector1.svg";
import roads from "../../assets/gis/imgGroup2.svg";
import dots from "../../assets/gis/imgGroup3.svg";
import highPin from "../../assets/gis/img1.svg";
import mediumPin from "../../assets/gis/img2.svg";
import lowPin from "../../assets/gis/img4.svg";
import highDot from "../../assets/gis/imgEllipse.svg";
import mediumDot from "../../assets/gis/imgEllipse1.svg";
import lowDot from "../../assets/gis/imgEllipse2.svg";

type Props = {
  applications: Application[];
  selectedId?: string;
  showMarkers: boolean;
  onSelect: (id: string) => void;
};

export default function ApplicationMap({
  applications,
  selectedId,
  showMarkers,
  onSelect,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(678);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewport}
      aria-label="신청 위치 지도 미리보기"
      className="relative aspect-[678/568] min-w-0 touch-none overflow-hidden rounded-lg border border-[#c8d0d7] bg-[#f4f5f6]"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const previous = drag.current;
        if (!previous) return;

        setPan((p) => ({
          x: p.x + (event.clientX - previous.x) / (width / 678),
          y: p.y + (event.clientY - previous.y) / (width / 678),
        }));

        drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div
        className="absolute left-0 top-0 h-[568px] w-[678px] origin-top-left"
        style={{ transform: `scale(${width / 678})` }}
      >
        <div
          className="relative h-[568px] w-[678px] origin-center cursor-grab"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <img
            src={bg}
            alt=""
            draggable={false}
            width={678}
            height={568}
            className="pointer-events-none absolute left-0 top-0 max-w-none"
          />
          <img
            src={group}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[28px] top-[28px] max-w-none"
          />
          <img
            src={group1}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[28px] top-[22px] max-w-none"
          />
          <img
            src={riverOuter}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[317px] top-[-53px] max-w-none"
          />
          <img
            src={riverInner}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[325px] top-[-45px] max-w-none"
          />
          <img
            src={roads}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[-32px] top-[-30px] max-w-none"
          />

          {[
            ["부천시청", 382, 103],
            ["원미역", 92, 377],
            ["부천종합운동장역", 500, 337],
            ["중동역", 265, 165],
            ["상동역", 535, 192],
          ].map(([text, x, y]) => (
            <span
              key={text}
              className="absolute text-[13px] font-bold"
              style={{ left: Number(x), top: Number(y) }}
            >
              {text}
            </span>
          ))}

          <img
            src={dots}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[83px] top-[111px] max-w-none"
          />

          {showMarkers &&
            applications.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${item.number}번 ${item.address}, ${item.risk}, ${item.status} 상세 보기`}
                aria-pressed={item.id === selectedId}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelect(item.id)}
                className="absolute flex h-11 cursor-pointer items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73]"
                style={{
                  left: item.marker.x,
                  top: item.marker.y - 4,
                }}
              >
                <span
                  className={`relative h-9 w-8 shrink-0 ${
                    item.marker.labelBefore ? "order-2" : ""
                  }`}
                >
                  <img
                    src={
                      item.risk === "높음"
                        ? highPin
                        : item.risk === "주의"
                          ? mediumPin
                          : lowPin
                    }
                    alt=""
                    width={32}
                    height={36}
                    className="max-w-none"
                  />
                  <span className="absolute left-0 top-[6px] w-8 text-center text-xs font-bold text-white">
                    {item.number}
                  </span>
                </span>
                <span className="whitespace-nowrap rounded-[5px] border border-[#cbd5e1] bg-white px-2 py-1 text-xs text-[#334155]">
                  {item.status}
                </span>
              </button>
            ))}
        </div>
      </div>

      <div
        className="absolute right-4 top-4 flex flex-col rounded-lg border border-[#c8d0d7] bg-white"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          aria-label="지도 확대"
          disabled={zoom >= 2}
          onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          className="h-10 w-9 cursor-pointer text-2xl font-bold disabled:opacity-40"
        >
          +
        </button>
        <button
          aria-label="지도 축소"
          disabled={zoom <= 1}
          onClick={() => {
            setZoom((z) => Math.max(1, z - 0.2));
            if (zoom <= 1.2) setPan({ x: 0, y: 0 });
          }}
          className="h-10 w-9 cursor-pointer text-2xl font-bold disabled:opacity-40"
        >
          −
        </button>
      </div>

      <div
        className="absolute bottom-2.5 left-4 right-4 flex flex-wrap items-center gap-4 rounded-md border border-[#c8d0d7] bg-white px-3 py-2 text-sm"
        onPointerDown={(event) => event.stopPropagation()}
      >
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
