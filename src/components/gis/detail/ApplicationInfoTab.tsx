import type { Application } from "../../../pages/GIS/types";
import type { GisAttachment } from "../../../api/gisApplications";
import basic from "../../../assets/gis/imgIconBasicInfo.svg";
import resident from "../../../assets/gis/imgIconResident.svg";
import attachment from "../../../assets/gis/imgIconAttachment.svg";
import { InfoRow, SectionTitle } from "./DetailShared";

type Props = {
  application: Application;
  attachments: GisAttachment[] | undefined;
  error: string | undefined;
  onOpenPhoto: (src: string, title: string) => void;
};

export default function ApplicationInfoTab({
  application: a,
  attachments,
  error,
  onOpenPhoto,
}: Props) {
  return (
    <>
      <section className="pb-2">
        <SectionTitle icon={basic}>기본 정보</SectionTitle>

        <dl className="space-y-[5px]">
          <InfoRow label="신청자 / 연락처">
            {a.resident} / {a.phone}
          </InfoRow>

          <InfoRow label="주택 / 거주 형태">
            <span>{a.address}</span>
            {" · "}
            <span className="inline-block">
              {a.houseType} / {a.tenure}
            </span>
          </InfoRow>

          <InfoRow label="AI 취약도 / 이력">
            {a.risk} / {a.floodHistory}
          </InfoRow>
        </dl>
      </section>

      <section className="border-t border-[#f4f5f6] pt-[9px] pb-[6px]">
        <SectionTitle icon={resident}>주민 입력정보</SectionTitle>

        <dl className="space-y-[5px]">
          <InfoRow label="유입 위치 / 시설">
            {a.inflow} / {a.facilities}
          </InfoRow>

          <InfoRow label="방문 희망일">{a.visitDate}</InfoRow>

          <InfoRow label="점검 요청 사유">{a.reason}</InfoRow>

          <InfoRow label="방문 가능시간">
            <div className="grid grid-cols-3 gap-[6px]">
              {["오전 9~12시", "오후 13~18시", "상관없음"].map((t) => (
                <span
                  key={t}
                  className={`flex min-h-7 min-w-0 items-center justify-center rounded-md border bg-[#f4f5f6] px-2 py-1 text-[11px] ${
                    t === a.visitTime
                      ? "border-[#234f73] font-bold"
                      : "border-[#c8d0d7] text-[#43515e]"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </InfoRow>
        </dl>
      </section>

      <section className="border-t border-[#f4f5f6] pt-[7px] pb-0 [&>h3]:mb-1">
        <SectionTitle icon={attachment}>첨부 자료</SectionTitle>

        <div className="flex flex-wrap items-start gap-2">
          {(attachments ?? []).map((item) => (
            <button
              key={item.attachmentId}
              onClick={() => onOpenPhoto(item.imageUrl, item.originalFilename)}
              className="w-32 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#234f73]"
            >
              <img
                src={item.imageUrl}
                alt={item.originalFilename}
                className="h-[68px] w-32 rounded-[7px] border border-[#c8d0d7] object-cover"
              />
            </button>
          ))}
          {!error && (
            <span className="ml-1 pt-[3px] text-xs">
              {attachments
                ? `첨부사진 ${attachments.length}개`
                : "첨부사진을 불러오는 중입니다."}
            </span>
          )}
        </div>
      </section>
    </>
  );
}
