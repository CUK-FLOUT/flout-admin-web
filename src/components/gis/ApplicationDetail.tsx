import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Application } from "../../pages/GIS/types";

import back from "../../assets/gis/imgIconBack.svg";
import basic from "../../assets/gis/imgIconBasicInfo.svg";
import resident from "../../assets/gis/imgIconResident.svg";
import attachment from "../../assets/gis/imgIconAttachment.svg";
import memoIcon from "../../assets/gis/imgIconMemo.svg";
import door from "../../assets/gis/imgJpg.png";
import drain from "../../assets/gis/imgJpg1.png";

type Props = {
  application: Application;
  onClose: () => void;
  onAccept: (id: string, memo: string) => void;
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
    <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold leading-5">
      <img src={icon} alt="" width={16} height={16} />
      {children}
    </h3>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-[13px] leading-[19px]">
      <dt>{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function ApplicationDetail({
  application: a,
  onClose,
  onAccept,
}: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("신청 정보");
  const [memo, setMemo] = useState(a.memo);
  const [photo, setPhoto] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);

  const pending = a.status === "접수";

  function openPhoto(src: string, title: string) {
    setPhoto({ src, title });
    dialog.current?.showModal();
  }

  return (
    <section
      aria-label={`${a.id} 신청 상세`}
      className="flex h-[568px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#c8d0d7] bg-white"
    >
      <header className="flex min-h-12 shrink-0 items-center gap-2 px-4 pt-2">
        <button
          onClick={onClose}
          aria-label="신청 목록으로 돌아가기"
          className="grid h-8 w-6 cursor-pointer place-items-center rounded focus-visible:outline-2 focus-visible:outline-[#234f73]"
        >
          <img src={back} alt="" width={20} height={20} />
        </button>

        <h2 className="text-lg font-bold">
          {a.id} · {a.resident}님의 신청
        </h2>
      </header>

      <div
        role="tablist"
        aria-label="신청 상세 정보"
        className="grid shrink-0 grid-cols-4 gap-1 px-4 py-2"
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            id={`request-tab-${i}`}
            aria-controls="request-tab-panel"
            aria-selected={tab === label}
            onClick={() => setTab(label)}
            className={`min-h-[35px] cursor-pointer rounded-md border border-[#234f73] px-1 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] ${
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
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2"
      >
        {tab === "신청 정보" && (
          <>
            <section className="pb-3">
              <SectionTitle icon={basic}>기본 정보</SectionTitle>

              <dl className="space-y-[5px]">
                <InfoRow label="신청자 / 연락처">
                  {a.resident} / {a.phone}
                </InfoRow>

                <InfoRow label="주택 / 거주 형태">
                  {a.address} · {a.houseType} / {a.tenure}
                </InfoRow>

                <InfoRow label="AI 취약도 / 이력">
                  {a.risk} / {a.floodHistory}
                </InfoRow>
              </dl>
            </section>

            <section className="border-t border-[#f4f5f6] py-3">
              <SectionTitle icon={resident}>주민 입력정보</SectionTitle>

              <dl className="space-y-[5px]">
                <InfoRow label="유입 위치 / 시설">
                  {a.inflow} / {a.facilities}
                </InfoRow>

                <InfoRow label="방문 희망일">{a.visitDate}</InfoRow>

                <InfoRow label="점검 요청 사유">{a.reason}</InfoRow>

                <InfoRow label="방문 가능시간">
                  <div className="flex flex-wrap gap-1">
                    {["오전 9~12시", "오후 13~18시", "상관없음"].map((t) => (
                      <span
                        key={t}
                        className={`rounded-md border bg-[#f4f5f6] px-2 py-1 text-[11px] ${
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

            <section className="border-t border-[#f4f5f6] py-3">
              <SectionTitle icon={attachment}>첨부 자료</SectionTitle>

              <div className="flex flex-wrap items-start gap-2">
                {[
                  [door, "출입구.jpg"],
                  [drain, "배수구.jpg"],
                ].map(([src, title]) => (
                  <button
                    key={title}
                    onClick={() => openPhoto(src, title)}
                    className="w-32 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#234f73]"
                  >
                    <img
                      src={src}
                      alt={`${title} 첨부사진`}
                      className="h-[68px] w-32 rounded-[7px] border border-[#c8d0d7] object-cover"
                    />

                    <span className="mt-1 block text-xs">{title}</span>
                  </button>
                ))}

                <span className="pt-1 text-xs">첨부사진 2개</span>
              </div>
            </section>
          </>
        )}

        {tab === "처리 이력" && (
          <ol className="space-y-4 text-sm leading-6">
            {a.history.map((item, i) => (
              <li
                key={`${i}-${item}`}
                className="border-l-2 border-[#234f73] pl-3"
              >
                {item}
              </li>
            ))}
          </ol>
        )}

        {tab === "지원 정보" && (
          <p className="py-4 text-sm leading-6 text-[#43515e]">
            {a.status.startsWith("지원")
              ? `지원 상태: ${a.status}`
              : "등록된 지원 정보가 없습니다."}
          </p>
        )}

        {tab === "시공 정보" && (
          <p className="py-4 text-sm leading-6 text-[#43515e]">
            {a.status === "시공 진행"
              ? "시공 진행 중입니다."
              : "등록된 시공 정보가 없습니다."}
          </p>
        )}
      </div>

      <footer className="shrink-0 border-t border-[#f4f5f6] bg-white p-4 pt-2">
        <label
          htmlFor="request-memo"
          className="mb-2 flex items-center gap-2 text-[15px] font-bold"
        >
          <img src={memoIcon} alt="" width={16} height={16} />
          내부 메모 · 주민 비공개
        </label>

        <div className="flex items-center gap-2">
          <input
            id="request-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            readOnly={!pending}
            placeholder="담당자 확인 내용을 입력하세요"
            className="h-11 min-w-0 flex-1 rounded-md border border-[#234f73] px-3 text-[13px] focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73] read-only:bg-[#f4f5f6]"
          />

          <button
            disabled={!pending}
            onClick={() => onAccept(a.id, memo.trim())}
            className="h-11 w-[124px] shrink-0 cursor-pointer rounded-[7px] bg-[#234f73] text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:border disabled:border-[#cbd5e1] disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
          >
            접수하기
          </button>
        </div>
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
