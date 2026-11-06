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
          <strong className="block text-base leading-[21px]">
            {application.number !== undefined && `${application.number}. `}{application.address}
          </strong>

          <span className="mt-[3px] block text-sm leading-[19px]">
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

        <span className="shrink-0 justify-self-end text-sm">상세 &gt;</span>
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
}: Props) {
  return (
    <section
      aria-label="신청 목록"
      className="flex h-full min-h-[500px] min-w-0 flex-col rounded-lg border border-[#c8d0d7] bg-white px-[14px] pt-[14px] pb-[10px] lg:min-h-0"
    >
      <h2 className="relative mb-3 flex h-[59px] shrink-0 items-center gap-[6px] border-b border-[#f4f5f6] pb-[10px] text-[22px] font-bold">
        <img src={listHeading} alt="" width={32} height={32} />
        신청 목록
        <button
          type="button"
          disabled
          title="준비 중"
          className="absolute right-0 top-[13px] flex h-9 w-[134px] items-center justify-center gap-1 rounded-md border border-[#c8d0d7] px-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <img src={layersIcon} alt="" width={18} height={18} />
          우선점검 관리
        </button>
      </h2>

      <ul className="min-h-0 flex-1 overflow-y-auto">
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

      {page && page.totalPages > 1 && (
        <nav
          aria-label="신청 목록 페이지"
          className="mt-3 flex justify-center gap-4 text-sm text-[#234f73]"
        >
          <button
            disabled={page.page === 0}
            onClick={() => onPage?.(page.page - 1)}
            aria-label="이전 신청 페이지"
          >
            ‹
          </button>
          <span>
            {page.page + 1} / {page.totalPages}
          </span>
          <button
            disabled={page.page + 1 >= page.totalPages}
            onClick={() => onPage?.(page.page + 1)}
            aria-label="다음 신청 페이지"
          >
            ›
          </button>
        </nav>
      )}

      <label className="mt-4 mb-[26px] flex h-10 shrink-0 cursor-pointer items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          role="switch"
          checked={showMarkers}
          onChange={(e) => onToggleMarkers(e.target.checked)}
          className="h-5 w-5 accent-[#234f73]"
        />
        마커와 상태를 표시
      </label>
    </section>
  );
}
