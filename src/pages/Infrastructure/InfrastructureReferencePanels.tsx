import type { Dispatch, SetStateAction } from "react";

import InfrastructureImage from "../../components/infrastructure/InfrastructureImage";
import { infrastructureCard } from "../../components/infrastructure/styles";
import { infrastructureAssets as assets } from "./assets";
import type { InfrastructureIssue } from "./types";

export function FacilityReferenceInformation({
  issue,
}: {
  issue: InfrastructureIssue;
}) {
  return (
    <section
      aria-labelledby="facility-reference-title"
      className={
        infrastructureCard +
        " min-h-[390px] p-[15.25px] pt-[12.25px] pb-[6.75px]"
      }
    >
      <h2
        id="facility-reference-title"
        className="text-base font-bold leading-6"
      >
        지역 문제·참고 정보
      </h2>
      <div className="mt-[10px] overflow-x-auto">
        <dl className="min-w-[550px] border border-[#c8d0d7]">
          {[
            ["문제 유형", issue.kind],
            ["문제 내용", issue.description],
            [
              "과거 침수 이력",
              issue.history === null
                ? "이력 확인 필요"
                : "주변 침수 이력 " + issue.history + "건",
            ],
            ["현장 확인내용", issue.findings],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid min-h-11 grid-cols-[139px_minmax(0,1fr)] border-b border-[#c8d0d7] last:border-0"
            >
              <dt className="flex items-center border-r border-[#c8d0d7] bg-[#f4f5f6] px-[11px] text-[13px] font-medium leading-[22px]">
                {label}
              </dt>
              <dd className="flex items-center px-[15px] py-1 text-[13px] leading-[21px]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-[18px] flex gap-4 overflow-x-auto">
        {issue.referencePhotos.map((photo) => (
          <figure
            key={photo.id}
            className="min-w-[180px] flex-1 overflow-hidden rounded-lg border border-[#c8d0d7]"
          >
            <InfrastructureImage
              source={photo.src}
              alt={photo.name}
              className="h-[105px] w-full object-cover"
            />
            <figcaption className="flex h-[33px] items-center gap-[10px] bg-[#f4f5f6] px-[11px] text-xs leading-[18px]">
              <img src={assets.photo} alt="" width={16} height={16} />
              {photo.name}
            </figcaption>
          </figure>
        ))}
        {!issue.referencePhotos.length && (
          <p className="flex h-[140px] w-full items-center justify-center rounded-md bg-[#f4f5f6] text-sm text-[#596672]">
            등록된 현장 자료가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

const riskStyles: Record<string, string> = {
  높음: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  주의: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  낮음: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};

const unknownRiskStyle = "border-[#c8d0d7] text-[#596672]";

export function RelatedApplications({
  issue,
  page,
  totalPages,
  onPageChange,
}: {
  issue: InfrastructureIssue;
  page: number;
  totalPages: number;
  onPageChange: Dispatch<SetStateAction<number>>;
}) {
  const visible = issue.related.slice((page - 1) * 3, page * 3);

  return (
    <section
      aria-labelledby="facility-related-title"
      className={infrastructureCard + " h-[265px] min-w-0 p-[15.25px]"}
    >
      <h2
        id="facility-related-title"
        className="text-base font-bold leading-6"
      >
        관련 주민 신청 · {issue.related.length}건
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[710px] table-fixed text-left">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[180px]" />
            <col className="w-[110px]" />
            <col />
          </colgroup>
          <thead className="h-9 bg-[#f4f5f6] text-xs font-normal leading-[18px]">
            <tr>
              {["접수번호", "주소", "취약도", "현장 확인"].map(
                (label) => (
                  <th key={label} className="px-3 font-normal">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((application) => (
              <tr
                key={application.id}
                className="h-[49px] border-b border-[#f4f5f6]"
              >
                <td className="px-3 text-sm font-bold leading-[21px]">
                  {application.id}
                </td>
                <td className="px-3 text-[13px] leading-5">
                  {application.address}
                </td>
                <td className="px-1">
                  <span
                    className={
                      "inline-flex h-[30px] w-[70px] items-center justify-center rounded-lg border text-[13px] font-bold leading-[18px] " +
                      (riskStyles[application.risk] ?? unknownRiskStyle)
                    }
                  >
                    {application.risk}
                  </span>
                </td>
                <td className="px-3 text-[13px] leading-5">
                  {application.findings}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <p className="py-10 text-center text-sm text-[#596672]">
          연결된 주민 신청이 없습니다.
        </p>
      )}
      <div className="relative flex h-11 items-center text-xs leading-[18px]">
        <p>총 {issue.related.length}건 표시</p>
        <nav
          aria-label="관련 주민 신청 페이지"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3"
        >
          <button
            aria-label="관련 주민 신청 이전 페이지"
            disabled={page <= 1}
            onClick={() => onPageChange((currentPage) => currentPage - 1)}
            className="disabled:opacity-40"
          >
            ‹
          </button>
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              disabled={p > totalPages}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className="disabled:opacity-40"
            >
              {p}
            </button>
          ))}
          <button
            aria-label="관련 주민 신청 다음 페이지"
            disabled={page >= totalPages}
            onClick={() => onPageChange((currentPage) => currentPage + 1)}
            className="disabled:opacity-40"
          >
            ›
          </button>
        </nav>
      </div>
    </section>
  );
}
