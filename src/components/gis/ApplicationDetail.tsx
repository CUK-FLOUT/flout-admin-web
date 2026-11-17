import { useRef, useState } from "react";
import type { Application } from "../../pages/GIS/types";

import back from "../../assets/gis/imgIconBack.svg";
import memoIcon from "../../assets/gis/imgIconMemo.svg";
import type { GisRecord } from "../../pages/GIS/useGisApi";
import { useGisMemo } from "../../pages/GIS/useGisMemo";

import ApplicationInfoTab from "./detail/ApplicationInfoTab";
import ApplicationHistoryTab from "./detail/ApplicationHistoryTab";
import ApplicationSupportTab from "./detail/ApplicationSupportTab";
import ApplicationConstructionTab from "./detail/ApplicationConstructionTab";

type Props = {
  application: Application;
  onClose: () => void;
  onAccept: (id: string, memo: string) => Promise<string>;
  record: GisRecord;
};

const tabs = ["신청 정보", "처리 이력", "지원 정보", "시공 정보"] as const;

export default function ApplicationDetail({
  application: a,
  onClose,
  onAccept,
  record,
}: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("신청 정보");
  const { memo, setMemo, memoReady, saving, saveError, saveMessage, saveMemo } = useGisMemo({
    applicationId: a.id,
    sourceMemo: record.internalMemo,
    loadError: record.errors.internalMemo,
    onSave: onAccept,
  });
  const [photo, setPhoto] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);

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
          <ApplicationInfoTab
            application={a}
            attachments={record.attachments}
            error={record.errors.attachments}
            onOpenPhoto={openPhoto}
          />
        )}
        {tab === "처리 이력" && (
          <ApplicationHistoryTab histories={record.histories} error={record.errors.histories} />
        )}
        {tab === "지원 정보" && !record.errors.support && (
          <ApplicationSupportTab support={record.support} />
        )}
        {tab === "시공 정보" && !record.errors.construction && (
          <ApplicationConstructionTab construction={record.construction} />
        )}
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
