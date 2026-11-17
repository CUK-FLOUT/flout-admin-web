import type { GisSupport } from "../../../api/gisApplications";
import { InfoRow } from "./DetailShared";
import { display, statuses } from "./detailPresentation";

type Props = { support: GisSupport | null | undefined };

export default function ApplicationSupportTab({ support }: Props) {
  return support === undefined ? (
    <p>지원 정보를 불러오는 중입니다.</p>
  ) : support === null ? (
    <p className="py-4 text-sm leading-6 text-[#43515e]">
      등록된 지원 정보가 없습니다.
    </p>
  ) : (
    <dl className="space-y-[5px]">
      <InfoRow label="지원사업">{display(support.programName)}</InfoRow>
      <InfoRow label="지원 상태">
        {statuses[support.status] ?? support.status}
      </InfoRow>
      <InfoRow label="신청 시설">{display(support.requestedFacility)}</InfoRow>
      <InfoRow label="지원 범위">{display(support.supportScope)}</InfoRow>
      <InfoRow label="임대인 동의">
        {support.landlordConsentRequired ? "필요" : "불필요"}
      </InfoRow>
      <InfoRow label="동의서 제출">
        {support.landlordConsentDocumentSubmitted ? "제출" : "미제출"}
      </InfoRow>
      <InfoRow label="시공 상태">
        {support.constructionStatus
          ? statuses[support.constructionStatus]
          : "미연계"}
      </InfoRow>
      {support.rejectionReason && (
        <InfoRow label="미승인 사유">{support.rejectionReason}</InfoRow>
      )}
    </dl>
  );
}
