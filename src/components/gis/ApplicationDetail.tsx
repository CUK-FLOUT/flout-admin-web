import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Application } from "../../pages/GIS/types";

import back from "../../assets/gis/imgIconBack.svg";
import basic from "../../assets/gis/imgIconBasicInfo.svg";
import resident from "../../assets/gis/imgIconResident.svg";
import attachment from "../../assets/gis/imgIconAttachment.svg";
import memoIcon from "../../assets/gis/imgIconMemo.svg";
import type { GisRecord } from "../../pages/GIS/useGisApi";
import { gisError } from "../../api/gisApplications";
import { getSessionGeneration } from "../../auth/session";

type Props = {
  application: Application;
  onClose: () => void;
  onAccept: (id: string, memo: string) => Promise<string>;
  record: GisRecord;
};

const tabs = ["신청 정보", "처리 이력", "지원 정보", "시공 정보"] as const;

function SectionTitle({
  icon,
  children,
}: {
  icon: string;
  children: ReactNode;
}) {
  return (
    <h3 className="mb-[9px] flex items-center gap-2 text-[15px] font-bold leading-5">
      <img src={icon} alt="" width={16} height={16} />
      {children}
    </h3>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 text-[13px] leading-[19px]">
      <dt>{label}</dt>
      <dd className="min-w-0 break-keep [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

export default function ApplicationDetail({
  application: a,
  onClose,
  onAccept,
  record,
}: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("신청 정보");
  const [memoSource, setMemoSource] = useState(record.internalMemo);
  const [memo, setMemo] = useState(record.internalMemo ?? "");

  if (memoSource !== record.internalMemo) {
    setMemoSource(record.internalMemo);
    setMemo(record.internalMemo ?? "");
  }

  const memoReady = record.internalMemo !== undefined && !record.errors.internalMemo;
  const [photo, setPhoto] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const inFlight = useRef(false);
  const active = useRef(true);
  const generation = getSessionGeneration();

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);
  async function saveMemo() {
    if (inFlight.current || !memoReady) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const saved = await onAccept(a.id, memo);

      if (active.current && generation === getSessionGeneration()) {
        setMemo(saved);
        setSaveMessage("내부 메모를 저장했습니다.");
      }
    } catch (error) {
      if (active.current && generation === getSessionGeneration())
        setSaveError(gisError(error));
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }

  const support = record.support;
  const construction = record.construction;
  const statuses: Record<string, string> = {
    SUBMITTED: "검토 중",
    APPROVED: "승인",
    REJECTED: "미승인",
    PENDING: "일정 미등록",
    SCHEDULED: "예정",
    IN_PROGRESS: "진행",
    COMPLETED: "완료",
  };
  const display = (value: string | null | undefined) => value || "미입력";
  const tabError =
    tab === "신청 정보"
      ? record.errors.attachments
      : tab === "처리 이력"
        ? record.errors.histories
        : tab === "지원 정보"
          ? record.errors.support
          : record.errors.construction;

  function openPhoto(src: string, title: string) {
    setPhoto({ src, title });
    dialog.current?.showModal();
  }

  return (
    <section
      aria-label={`${a.id} 신청 상세`}
      className="flex h-[568px] min-w-0 flex-col lg:h-full overflow-hidden rounded-lg border border-[#c8d0d7] bg-white"
    >
      <header className="flex h-[43px] shrink-0 items-center gap-2 px-[15px] pt-[15px]">
        <button
          onClick={onClose}
          aria-label="신청 목록으로 돌아가기"
          className="grid h-5 w-5 shrink-0 cursor-pointer self-start place-items-center rounded focus-visible:outline-2 focus-visible:outline-[#234f73]"
        >
          <img src={back} alt="" width={20} height={20} />
        </button>

        <h2 className="text-lg font-bold">
          {a.receiptNo ?? a.id} · {a.resident}님의 신청
        </h2>
      </header>

      <div
        role="tablist"
        aria-label="신청 상세 정보"
        className="grid shrink-0 grid-cols-4 gap-1 px-[15px] pt-2"
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            id={`request-tab-${i}`}
            aria-controls="request-tab-panel"
            aria-selected={tab === label}
            onClick={() => setTab(label)}
            className={`min-h-[35px] cursor-pointer rounded-md border border-[#234f73] px-4 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] ${
              tab === label
                ? "bg-[#234f73] text-white"
                : "bg-white text-[#202b36]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="request-tab-panel"
        aria-labelledby={`request-tab-${tabs.indexOf(tab)}`}
        className="min-h-0 flex-1 overflow-y-auto px-[15px] pb-0 pt-4"
      >
        {tabError && (
          <p role="alert" className="mb-3 text-sm text-[#a53632]">
            {tabError}
          </p>
        )}
        {tab === "신청 정보" && (
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
                {(record.attachments ?? []).map((item) => (
                  <button
                    key={item.attachmentId}
                    onClick={() =>
                      openPhoto(item.imageUrl, item.originalFilename)
                    }
                    className="w-32 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#234f73]"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.originalFilename}
                      className="h-[68px] w-32 rounded-[7px] border border-[#c8d0d7] object-cover"
                    />
                  </button>
                ))}
                {!record.errors.attachments && (
                  <span className="ml-1 pt-[3px] text-xs">
                    {record.attachments
                      ? `첨부사진 ${record.attachments.length}개`
                      : "첨부사진을 불러오는 중입니다."}
                  </span>
                )}
              </div>
            </section>
          </>
        )}

        {tab === "처리 이력" && (
          <ol className="space-y-4 text-sm leading-6">
            {(record.histories?.histories ?? []).map((item) => (
              <li
                key={item.eventId}
                className="border-l-2 border-[#234f73] pl-3"
              >
                <p>
                  {item.title} · {item.statusLabel}
                </p>
                {item.description && <p>{item.description}</p>}
                <p>
                  {item.occurredAt
                    ? new Date(item.occurredAt).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })
                    : "시각 미기록"}{" "}
                  · {item.actorName || "처리자 미기록"}
                </p>
              </li>
            ))}
            {!record.errors.histories &&
              (record.histories ? (
                !record.histories.histories.length && (
                  <li>등록된 처리 이력이 없습니다.</li>
                )
              ) : (
                <li>처리 이력을 불러오는 중입니다.</li>
              ))}
          </ol>
        )}

        {tab === "지원 정보" &&
          !record.errors.support &&
          (support === undefined ? (
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
              <InfoRow label="신청 시설">
                {display(support.requestedFacility)}
              </InfoRow>
              <InfoRow label="지원 범위">
                {display(support.supportScope)}
              </InfoRow>
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
          ))}
        {tab === "시공 정보" &&
          !record.errors.construction &&
          (construction === undefined ? (
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
              <InfoRow label="지원 범위">
                {display(construction.supportScope)}
              </InfoRow>
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
              <InfoRow label="담당자">
                {display(construction.managerName)}
              </InfoRow>
              <InfoRow label="완료 시각">
                {display(construction.completedAt)}
              </InfoRow>
              <InfoRow label="최종 설치 결과">
                {display(construction.finalInstallationResult)}
              </InfoRow>
            </dl>
          ))}
      </div>

      <footer className="shrink-0 border-t border-[#f4f5f6] bg-white px-[15px] pt-[14px] pb-5">
        <label
          htmlFor="request-memo"
          className="mb-[5.5px] flex items-center gap-[10px] text-[15px] font-bold"
        >
          <img src={memoIcon} alt="" width={16} height={16} />
          내부 메모 · 주민 비공개
        </label>

        <div className="flex items-center gap-2">
          <input
            id="request-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={saving || !memoReady}
            maxLength={2000}
            placeholder="담당자 확인 내용을 입력하세요"
            className="h-9 min-w-0 flex-1 rounded-md border border-[#234f73] px-3 text-[13px] focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73] read-only:bg-[#f4f5f6]"
          />

          <button
            disabled={saving || !memoReady}
            onClick={() => void saveMemo()}
            className="h-9 w-[124px] shrink-0 cursor-pointer rounded-[7px] bg-[#234f73] text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:border disabled:border-[#cbd5e1] disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
          >
            메모 저장
          </button>
        </div>
        {record.errors.internalMemo && <p role="alert" className="mt-2 text-sm text-[#a53632]">{record.errors.internalMemo}</p>}
        {saveMessage && (
          <p role="status" className="mt-2 text-sm text-[#27654d]">
            {saveMessage}
          </p>
        )}
        {saveError && (
          <p role="alert" className="mt-2 text-sm text-[#a53632]">
            {saveError}
          </p>
        )}
      </footer>

      <dialog
        ref={dialog}
        aria-labelledby="photo-title"
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_40px)] max-w-3xl overflow-auto rounded-lg bg-white p-5 backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 id="photo-title" className="font-bold">
            {photo?.title}
          </h3>

          <button
            onClick={() => dialog.current?.close()}
            className="cursor-pointer px-3 py-2 text-sm text-[#234f73]"
          >
            닫기
          </button>
        </div>

        {photo && (
          <img
            src={photo.src}
            alt={photo.title}
            className="max-h-[70dvh] w-full object-contain"
          />
        )}
      </dialog>
    </section>
  );
}
