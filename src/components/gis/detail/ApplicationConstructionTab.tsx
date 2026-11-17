import type { GisConstruction } from "../../../api/gisApplications";
import { InfoRow } from "./DetailShared";
import { display, statuses } from "./detailPresentation";

type Props = { construction: GisConstruction | null | undefined };

export default function ApplicationConstructionTab({ construction }: Props) {
  return construction === undefined ? (
    <p>시공 정보를 불러오는 중입니다.</p>
  ) : construction === null ? (
    <p className="py-4 text-sm leading-6 text-[#43515e]">
      등록된 시공 정보가 없습니다.
    </p>
  ) : (
    <dl className="space-y-[5px]">
      <InfoRow label="시공 상태">
        {statuses[construction.status] ?? construction.status}
      </InfoRow>
      <InfoRow label="신청 시설">
        {display(construction.requestedFacility)}
      </InfoRow>
      <InfoRow label="지원 범위">{display(construction.supportScope)}</InfoRow>
      <InfoRow label="주민 희망일">
        {display(construction.preferredConstructionDate)}
      </InfoRow>
      <InfoRow label="희망 시간대">
        {construction.preferredTimeSlot
          ? { MORNING: "오전", AFTERNOON: "오후", ANY: "상관없음" }[
              construction.preferredTimeSlot
            ]
          : "미입력"}
      </InfoRow>
      <InfoRow label="확정 시공일">
        {display(construction.constructionDate)}
      </InfoRow>
      <InfoRow label="확정 시간">
        {display(construction.constructionTime)}
      </InfoRow>
      <InfoRow label="담당자">{display(construction.managerName)}</InfoRow>
      <InfoRow label="완료 시각">{display(construction.completedAt)}</InfoRow>
      <InfoRow label="최종 설치 결과">
        {display(construction.finalInstallationResult)}
      </InfoRow>
    </dl>
  );
}
