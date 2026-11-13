import Pagination from "../../components/common/Pagination";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ConstructionBadge from "../../components/construction/ConstructionBadge";
import ConstructionDetail from "../../components/construction/ConstructionDetail";
import ConstructionDialogs from "../../components/construction/ConstructionDialogs";
import ConstructionEmpty from "../../components/construction/ConstructionEmpty";
import {
  constructionFocus,
  constructionSecondary,
} from "../../components/construction/styles";
import { displayDate } from "./model";
import { constructionDialogKinds } from "./types";
import type {
  ConstructionCandidate,
  ConstructionDialogKind,
  ConstructionRecord,
  ConstructionTab,
} from "./types";
import type { ConstructionListStatus } from "../../api/constructions";
import { useConstructionData } from "./useConstructionData";
import { useConstructionActions } from "./useConstructionActions";

const tabs: ConstructionTab[] = ["전체", "예정", "진행", "완료"];

export default function ConstructionManagement() {
  const { requestId } = useParams();
  const [params] = useSearchParams();
  const keyboardTab = useRef(false);
  const navigate = useNavigate();
  const tab = tabs.includes(params.get("tab") as ConstructionTab)
    ? (params.get("tab") as ConstructionTab)
    : "전체";

  useEffect(() => {
    if (keyboardTab.current) {
      document
        .querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
        ?.focus();
      keyboardTab.current = false;
    }
  }, [tab]);
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const status = (
    { 예정: "SCHEDULED", 진행: "IN_PROGRESS", 완료: "COMPLETED" } as Partial<
      Record<ConstructionTab, ConstructionListStatus>
    >
  )[tab];
  const data = useConstructionData({
    keyword: params.get("keyword") || "",
    page: page - 1,
    status,
    selectedId: requestId || (params.has("requestId") ? "" : undefined),
  });
  const selected = data.selected;
  const key = selected?.id || "none";

  useEffect(() => {
    const lastPage = Math.max(1, data.totalPages);

    if (data.listLoading || data.listError || page <= lastPage) return;
    const next = new URLSearchParams(params);

    next.set("page", String(lastPage));
    navigate(
      {
        pathname: "/construction" + (requestId ? "/" + requestId : ""),
        search: next.toString(),
      },
      { replace: true },
    );
  }, [
    page,
    data.totalPages,
    data.listLoading,
    data.listError,
    params,
    navigate,
    requestId,
  ]);

  return (
    <ConstructionWorkspace
      key={key}
      data={data}
      onKeyboardTab={() => {
        keyboardTab.current = true;
      }}
      selected={selected}
      candidates={[]}
      visible={data.records}
      filteredCount={data.totalElements}
      hasData={tab !== "전체" || !!params.get("keyword")?.trim()}
      tab={tab}
      page={page}
      pages={Math.max(1, data.totalPages)}
    />
  );
}

type Props = {
  onKeyboardTab: () => void;
  data: ReturnType<typeof useConstructionData>;
  selected?: ConstructionRecord;
  candidates: ConstructionCandidate[];
  visible: ConstructionRecord[];
  filteredCount: number;
  hasData: boolean;
  tab: ConstructionTab;
  page: number;
  pages: number;
};
function ConstructionWorkspace({
  data,
  onKeyboardTab,
  selected: a,
  candidates,
  visible,
  filteredCount,
  hasData,
  tab,
  page,
  pages,
}: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [candidateId, setCandidateId] = useState(params.get("candidate") || "");
  const requested = params.get("dialog");
  const kind =
    constructionDialogKinds.includes(requested as ConstructionDialogKind)
      ? (requested as ConstructionDialogKind)
      : null;
  const {
    draft,
    setDraft,
    restoring,
    draftBlocked,
    checked,
    setChecked,
    busy,
    isSubmitting,
    schedule,
    install,
    temporary,
    upload,
    removePhoto,
    finish,
    confirm,
  } = useConstructionActions({
    record: a,
    kind,
    show,
    setError: data.setError,
    refresh: data.refresh,
  });
  const candidate =
    candidates.find((c) => c.id === candidateId) ||
    candidates.find((c) => c.eligible);

  function query() {
    const p = new URLSearchParams(params);

    ["dialog", "target", "requestId"].forEach((k) => p.delete(k));

    return p;
  }

  function go(p: URLSearchParams, id?: string, replace = false) {
    navigate(
      {
        pathname: "/construction" + (id ? "/" + id : ""),
        search: p.toString(),
      },
      { replace },
    );
  }

  function show(value: ConstructionDialogKind | null, id = a?.id) {
    const p = query();

    if (value) p.set("dialog", value);
    go(p, id, true);
  }

  function close() {
    if (isSubmitting()) return;
    data.setError("");
    show(null);
  }

  function selectTab(value: ConstructionTab) {
    const p = query();

    p.delete("page");
    p.delete("dataset");
    p.delete("candidate");
    if (value === "전체") p.delete("tab");
    else p.set("tab", value);
    data.setError("");
    go(p);
  }

  function reset() {
    data.setError("");
    go(new URLSearchParams());
  }

  const error =
    data.error ||
    (params.has("requestId")
      ? "지원 신청 번호와 시공 ID는 다릅니다. 목록에서 시공 대상을 선택해 주세요."
      : "");

  return (
    <div
      data-layout="construction"
      className={
        "flex w-full shrink-0 flex-col text-[#202b36] min-[1102px]:-mb-0.5 " +
        constructionFocus +
        " [&_button:enabled]:cursor-pointer"
      }
    >
      <div className="h-[84px] shrink-0">
        <h1 className="text-[30px] font-bold leading-9">시공 관리</h1>
      </div>
      <div className="flex min-h-[42px] shrink-0 items-start justify-between gap-3 max-sm:flex-col">
        <div
          role="tablist"
          aria-label="시공 상태별 목록"
          className="flex gap-[10px]"
        >
          {tabs.map((value, index) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => selectTab(value)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 3
                        : (index + (e.key === "ArrowRight" ? 1 : -1) + 4) % 4;

                  onKeyboardTab();
                  selectTab(tabs[next]);
                }
              }}
              className={
                "h-[42px] w-[94px] rounded-md border text-sm font-semibold leading-[19px] " +
                (value === tab
                  ? "rounded-lg border-[#234f73] bg-[#234f73] text-white"
                  : "border-[#c8d0d7] bg-white")
              }
            >
              {value}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            data.setError("");
            data.setError(
              "시공 대상은 지원 승인 시 자동 생성됩니다. 지원 신청 관리에서 승인을 진행해 주세요.",
            );
          }}
          className={constructionSecondary + " h-[42px] w-[172px]"}
        >
          승인 대상 등록
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm leading-[21px] text-[#a53632]">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-[minmax(0,720fr)_minmax(0,446fr)] items-start gap-4 max-[1101px]:grid-cols-1">
        <section
          aria-labelledby="construction-list-title"
          className="flex h-[516px] min-w-0 flex-col rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[17.25px] pb-[17.25px] min-[1102px]:h-[calc(100dvh_-_384px)] min-[1102px]:min-h-[360px]"
        >
          <div className="flex h-6 shrink-0 items-start justify-between gap-2">
            <h2
              id="construction-list-title"
              className="text-base font-bold leading-[23px]"
            >
              시공 대상 목록
            </h2>
            <p className="text-xs leading-[18px]">총 {filteredCount}건 표시</p>
          </div>
          <div
            aria-busy={data.listLoading}
            className={
              "mt-4 min-h-0 flex-1 " +
              (visible.length
                ? "overflow-auto"
                : "flex flex-col overflow-x-auto")
            }
          >
            <div
              role="table"
              aria-label="시공 대상 목록"
              className="min-w-[680px]"
            >
              <div
                role="row"
                className="grid h-11 grid-cols-[minmax(186px,186fr)_minmax(190px,190fr)_minmax(93px,93fr)_183px] items-center px-[14px] text-xs leading-[18px]"
              >
                {["접수번호 · 신청자", "시공 시설", "시공일", "시공 상태"].map(
                  (label, index) => (
                    <div
                      role="columnheader"
                      key={label}
                      className={index === 3 ? "text-center" : ""}
                    >
                      {label}
                    </div>
                  ),
                )}
              </div>
              {visible.map((record) => (
                <div
                  role="row"
                  aria-selected={record.id === a?.id}
                  key={record.id}
                  className={
                    "relative grid min-h-[62px] grid-cols-[minmax(186px,186fr)_minmax(190px,190fr)_minmax(93px,93fr)_183px] items-center border-b border-[#f4f5f6] px-[14px] text-[13px] leading-5 " +
                    (record.id === a?.id ? "bg-[#f4f5f6]" : "")
                  }
                >
                  <div role="cell">
                    <button
                      type="button"
                      disabled={busy || restoring}
                      onClick={() => {
                        if (isSubmitting() || restoring) return;
                        data.setError("");
                        go(query(), record.id);
                      }}
                      aria-label={
                        (record.receiptNo || record.id) +
                        " · " +
                        record.resident +
                        " 시공 선택"
                      }
                      className="py-5 text-left after:absolute after:inset-0 after:content-['']"
                    >
                      {(record.receiptNo || record.id) +
                        " · " +
                        record.resident}
                    </button>
                  </div>
                  <div role="cell">{record.facility}</div>
                  <div role="cell">
                    {record.date ? displayDate(record.date) : "00.00.00"}
                  </div>
                  <div role="cell" className="text-center">
                    <ConstructionBadge status={record.status} />
                  </div>
                </div>
              ))}
            </div>
            {data.listLoading ? (
              <p role="status" className="py-6 text-center text-sm">
                시공 목록을 불러오는 중입니다.
              </p>
            ) : !visible.length && !data.error ? (
              <ConstructionEmpty search={hasData} onReset={reset} />
            ) : null}
          </div>
          {visible.length > 0 && (
            <Pagination
              label="시공 목록 페이지"
              page={page}
              totalPages={pages}
              disabled={data.listLoading || busy}
              onPageChange={(number) => {
                const p = query();

                p.set("page", String(number));
                data.setError("");
                go(p);
              }}
              className="mt-4"
            />
          )}
        </section>
        <ConstructionDetail
          application={a}
          draft={draft}
          busy={busy || draftBlocked}
          loading={restoring || (!a && data.detailLoading)}
          onChange={setDraft}
          onSchedule={schedule}
          onUpload={(files) => {
            void upload(files);
          }}
          onFinish={finish}
          onRemovePhoto={removePhoto}
        />
      </div>
      {kind && (
        <ConstructionDialogs
          key={kind}
          kind={kind}
          application={
            a && draft && kind === "completion-review"
              ? {
                  ...a,
                  published: {
                    completionDate: draft.completionDate,
                    note: draft.note,
                    photos: draft.photos,
                  },
                }
              : a
          }
          candidate={candidate}
          candidates={candidates}
          draft={draft}
          checked={checked}
          error={data.error}
          busy={busy || draftBlocked}
          onClose={close}
          onConfirm={confirm}
          onInstall={install}
          onPublishedReview={() => {
            setChecked(false);
            show("completion-review");
          }}
          onDraftSave={temporary}
          onCandidate={setCandidateId}
          onChange={setDraft}
          onChecked={setChecked}
          onUpload={(files) => {
            void upload(files);
          }}
        />
      )}
    </div>
  );
}
