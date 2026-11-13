import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import Pagination from "../common/Pagination";
import type { GisPage } from "../../api/gisApplications";
import type { Application, Risk } from "../../pages/GIS/types";
import listHeading from "../../assets/gis/imgListIcon.svg";
import layersIcon from "../../assets/gis/imgFrame.svg";

const riskClasses: Record<Risk, string> = {
  높음: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  주의: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  미입력: "border-[#c8d0d7] text-[#596672]",
  낮음: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};

type Props = {
  applications: Application[];
  selectedId?: string;
  hasApplications: boolean;
  showMarkers: boolean;
  onSelect: (id: string) => void;
  onToggleMarkers: (visible: boolean) => void;
  page?: GisPage;
  onPage?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

type RowProps = Pick<Props, "onSelect"> & {
  application: Application;
  selected: boolean;
};

function ApplicationRow({ application, selected, onSelect }: RowProps) {
  return (
    <li className="h-16 shrink-0 border-b border-[#f4f5f6]">
      <button
        onClick={() => onSelect(application.id)}
        className={`grid h-full w-full cursor-pointer grid-cols-[minmax(0,1fr)_70px_76px] items-center gap-2.5 rounded-lg border-l-4 pl-2 pr-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-[#234f73] ${
          selected
            ? "border-l-[#234f73] bg-[#f4f5f6]"
            : "border-l-transparent hover:bg-[#f4f5f6]"
        }`}
      >
        <span className="min-w-0 flex-1">
          <strong
            title={application.address}
            className="block truncate text-base leading-[21px]"
          >
            {application.number !== undefined && `${application.number}. `}
            {application.address}
          </strong>

          <span
            className="mt-[3px] block truncate text-sm leading-[19px]"
            title={`${application.receiptNo ?? application.id} · ${application.resident} · ${application.status}`}
          >
            {application.receiptNo ?? application.id} · {application.resident} ·{" "}
            {application.status}
          </span>
        </span>

        <span
          className={`flex h-[30px] w-[70px] shrink-0 items-center justify-center rounded-lg border px-3 py-1 text-[13px] font-bold ${
            riskClasses[application.risk]
          }`}
        >
          {application.risk}
        </span>

        <span className="shrink-0 justify-self-end whitespace-nowrap text-sm">
          상세 &gt;
        </span>
      </button>
    </li>
  );
}

export default function ApplicationList({
  applications,
  selectedId,
  hasApplications,
  showMarkers,
  onSelect,
  onToggleMarkers,
  page,
  onPage,
  onPageSizeChange,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;

    if (!list || !onPageSizeChange) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const row = list.querySelector("li > button")?.parentElement;
        const rowHeight = row?.getBoundingClientRect().height || 64;

        if (list.clientHeight > 0)
          onPageSizeChange(Math.max(1, Math.min(100, Math.floor(list.clientHeight / rowHeight))));
      }, 150);
    };

    const observer = new ResizeObserver(measure);

    observer.observe(list);
    measure();

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [onPageSizeChange]);

  return (
    <section
      aria-label="신청 목록"
      className="flex h-full min-h-[500px] min-w-0 flex-col rounded-lg border border-[#c8d0d7] bg-white px-[14px] pt-[14px] pb-[10px] lg:min-h-0"
    >
      <h2 className="relative mb-3 flex h-[59px] shrink-0 items-center gap-[6px] border-b border-[#f4f5f6] pb-[10px] text-[22px] font-bold">
        <img src={listHeading} alt="" width={32} height={32} />
        신청 목록
        <Link
          to="/priority"
          className="absolute right-0 top-[13px] flex h-9 w-[134px] items-center justify-center gap-1 rounded-md border border-[#c8d0d7] px-2 text-sm font-bold hover:bg-[#f4f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73]"
        >
          <img src={layersIcon} alt="" width={18} height={18} />
          우선점검 관리
        </Link>
      </h2>

      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {applications.map((application) => (
          <ApplicationRow
            key={application.id}
            application={application}
            selected={application.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        {!applications.length && (
          <li className="py-12 text-center text-sm text-[#596672]">
            {hasApplications
              ? "검색 조건에 맞는 신청이 없습니다."
              : "등록된 신청이 없습니다."}
          </li>
        )}
      </ul>

      {page && (
        <Pagination
          label="신청 목록 페이지"
          page={page.page + 1}
          totalPages={page.totalPages}
          disabled={!onPage}
          onPageChange={(next) => onPage?.(next - 1)}
          className="mt-3"
        />
      )}

      <label className="mt-4 mb-[26px] flex h-10 shrink-0 cursor-pointer items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          role="switch"
          checked={showMarkers}
          onChange={(e) => onToggleMarkers(e.target.checked)}
          className="h-5 w-5 accent-[#234f73]"
        />
        마커 표시
      </label>
    </section>
  );
}
