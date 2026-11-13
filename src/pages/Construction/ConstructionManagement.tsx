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
import {
  completeConstruction,
  constructionError,
  constructionScheduleError,
  saveConstructionSchedule,
  validateConstructionPhotos,
  uploadConstructionPhotos,
} from "../../api/constructions";
import type { ConstructionListStatus } from "../../api/constructions";
import { useConstructionData } from "./useConstructionData";
import { useConstructionDraft } from "./useConstructionDraft";
import { writeConstructionDraft } from "./draftStorage";

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
  const { draft, setDraft, restoring, restoreFailed, photoUrls } = useConstructionDraft(
    a,
    data.setError,
  );
  const draftBlocked = restoring || restoreFailed;
  const [candidateId, setCandidateId] = useState(params.get("candidate") || "");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const active = useRef(false);
  const uploadedPhotoIds = useRef(new Set<string>());

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);
  const requested = params.get("dialog");
  const kind =
    constructionDialogKinds.includes(requested as ConstructionDialogKind)
      ? (requested as ConstructionDialogKind)
      : null;
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
    if (submitting.current) return;
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

  async function request(
    action: () => Promise<unknown>,
    success?: ConstructionDialogKind,
  ) {
    if (submitting.current || draftBlocked || !a) return;
    submitting.current = true;
    setBusy(true);
    data.setError("");
    try {
      await action();
      data.refresh(a.id);
      if (active.current && success) show(success);
    } catch (cause) {
      if (active.current) data.setError(constructionError(cause));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  function hasSavedSchedule() {
    if (!a || !draft) return false;
    if (!a.date || !a.time) {
      data.setError("배정·일정을 먼저 저장해 주세요.");

      return false;
    }

    if (draft.date !== a.date || draft.time !== a.time) {
      data.setError(
        "저장된 시공 일정과 입력값이 다릅니다. 최신 일정을 확인해 주세요.",
      );

      return false;
    }

    return true;
  }

  function schedule() {
    if (!a || !draft) return;
    if (!a.scheduleEditable) {
      data.setError("일정은 미배정 시공에 최초 한 번만 저장할 수 있습니다.");

      return;
    }

    const issue = constructionScheduleError(draft.date, draft.time);

    if (issue) {
      data.setError(issue);

      return;
    }

    void request(
      () => saveConstructionSchedule(Number(a.id), draft.date, draft.time),
      "schedule-saved",
    );
  }

  function install() {
    if (!a || !draft || a.status === "전체 완료" || submitting.current) return;
    data.setError("");
    show("installation");
  }

  function temporary() {
    data.setError(
      "설치 결과 임시 저장 API는 제공되지 않습니다. 입력 내용은 현재 화면에서 유지되며, 전체 완료 시 서버에 저장됩니다.",
    );
  }

  function upload(files: File[]) {
    if (
      !files.length ||
      !draft ||
      !a ||
      a.status === "전체 완료" ||
      submitting.current
    )
      return;
    data.setError("");
    try {
      validateConstructionPhotos([
        ...draft.photos.flatMap((photo) => (photo.file ? [photo.file] : [])),
        ...files,
      ]);
      const photos = files.map((file) => {
        const src = URL.createObjectURL(file);

        photoUrls.current.add(src);

        return {
          id: "pending-" + crypto.randomUUID(),
          name: file.name,
          src,
          file,
        };
      });

      setDraft((current) =>
        current
          ? {
              ...current,
              photos: [...current.photos, ...photos],
              verified: false,
            }
          : current,
      );
    } catch (cause) {
      data.setError(constructionError(cause));
    }
  }

  function removePhoto(id: string) {
    if (!draft || !a || a.status === "전체 완료" || submitting.current) return;
    const photo = draft.photos.find((item) => item.id === id);

    if (!photo?.file || uploadedPhotoIds.current.has(id)) {
      data.setError("이미 서버에 업로드된 사진은 삭제할 수 없습니다.");

      return;
    }

    URL.revokeObjectURL(photo.src);
    photoUrls.current.delete(photo.src);
    setDraft((current) =>
      current
        ? {
            ...current,
            photos: current.photos.filter((item) => item.id !== id),
            verified: false,
          }
        : current,
    );
    setChecked(false);
    data.setError("");
  }

  async function completeWithPhotos() {
    if (!a || !draft) return;
    const pending = draft.photos.filter(
      (photo) => photo.file && !uploadedPhotoIds.current.has(photo.id),
    );

    if (pending.length) {
      const response = await uploadConstructionPhotos(
        Number(a.id),
        pending.map((photo) => photo.file!),
      );
      const uploaded = response.photos.map((photo) => ({
        id: String(photo.photoId),
        name: photo.fileName,
        src: photo.url,
      }));

      pending.forEach((photo) => uploadedPhotoIds.current.add(photo.id));
      const savedDraft = {
        ...draft,
        photos: [
          ...draft.photos.filter(
            (photo) => !pending.some((item) => item.id === photo.id),
          ),
          ...uploaded,
        ],
      };

      await writeConstructionDraft(a.id, savedDraft);
      if (active.current)
        setDraft((current) =>
          current
            ? {
                ...current,
                photos: [
                  ...current.photos.filter(
                    (photo) => !pending.some((item) => item.id === photo.id),
                  ),
                  ...uploaded,
                ],
              }
            : current,
        );
    }

    try {
      const result = await completeConstruction(Number(a.id), draft.note);

      await writeConstructionDraft(a.id, null).catch((cause) => {
        if (active.current)
          data.setError(
            "전체 완료는 처리되었지만 기기의 초안을 정리하지 못했습니다. " +
              constructionError(cause),
          );
      });

      return result;
    } catch (cause) {
      if (pending.length || uploadedPhotoIds.current.size) {
        throw new Error(
          "사진 업로드는 완료되었지만 전체 완료 처리가 실패했습니다. 사진을 다시 업로드하지 않고 완료 처리를 재시도할 수 있습니다. " +
            constructionError(cause),
          { cause },
        );
      }

      throw cause;
    }
  }

  function finish() {
    if (!a || !draft || submitting.current) return;
    if (a.status === "전체 완료") {
      show("completed-view");

      return;
    }

    if (!hasSavedSchedule()) return;
    if (!draft.note.trim() || draft.note.trim().length > 4000) {
      data.setError("최종 설치 결과를 1~4000자로 입력해 주세요.");

      return;
    }

    if (!draft.photos.length) {
      data.setError("시공 사진을 1장 이상 선택해 주세요.");

      return;
    }

    setChecked(false);
    data.setError("");
    show("completion-review");
  }

  function confirm() {
    if (submitting.current) return;
    if (kind === "register" || kind === "register-support") {
      data.setError(
        "시공 대상은 지원 승인 시 서버에서 생성됩니다. 별도 등록 API는 제공되지 않습니다.",
      );

      return;
    }

    if (!a || !draft) return;
    if (kind !== "completion-review" && kind !== "installation") return;
    if (!hasSavedSchedule() || a.status === "전체 완료") return;
    if (!(kind === "completion-review" ? checked : draft.verified)) {
      data.setError("설치 결과·사진 확인 항목을 선택해 주세요.");

      return;
    }

    if (!draft.photos.length) {
      data.setError("시공 사진을 1장 이상 선택해 주세요.");

      return;
    }

    if (!draft.note.trim() || draft.note.trim().length > 4000) {
      data.setError("최종 설치 결과를 1~4000자로 입력해 주세요.");

      return;
    }

    void request(completeWithPhotos, "overall-saved");
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
                        if (submitting.current || restoring) return;
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
