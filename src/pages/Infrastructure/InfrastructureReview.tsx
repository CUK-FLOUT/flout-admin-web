import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import InfrastructureDialogs from "../../components/infrastructure/InfrastructureDialogs";
import {
  infrastructureFocus,
  infrastructureSecondary,
} from "../../components/infrastructure/styles";
import { infrastructureAssets as assets } from "./assets";
import InfrastructureReviewPanel from "./InfrastructureReviewPanel";
import {
  FacilityReferenceInformation,
  RelatedApplications,
} from "./InfrastructureReferencePanels";
import { facilityDraft } from "./model";
import {
  completePublicIssueAction,
  getPublicIssue,
  publicIssueError,
  savePublicIssueReview,
  uploadPublicIssueImages,
  validatePublicIssueImages,
} from "../../api/publicIssues";
import { publicReviewStatus } from "./apiMapping";
import { infrastructureDialogs } from "./types";
import type {
  FacilityDraft,
  InfrastructureDialogKind,
  InfrastructureIssue,
} from "./types";
import { useInfrastructureData } from "./useInfrastructureData";

export default function InfrastructureReview() {
  const { issueId } = useParams();
  const data = useInfrastructureData(undefined, issueId);
  const issue = data.issue;
  const [params] = useSearchParams();
  const p = new URLSearchParams(params);

  p.delete("dialog");

  if (!issue)
    return (
      <div className="py-6">
        <h1 className="text-2xl font-bold">
          {data.detailLoading
            ? "지역 문제를 불러오는 중입니다."
            : data.error || "지역 문제를 찾을 수 없습니다."}
        </h1>
        <Link
          to={{ pathname: "/infrastructure", search: p.toString() }}
          className={infrastructureSecondary + " mt-6"}
        >
          목록으로
        </Link>
      </div>
    );

  return <FacilityWorkspace key={issue.id} issue={issue} data={data} />;
}

function FacilityWorkspace({
  issue,
  data,
}: {
  issue: InfrastructureIssue;
  data: ReturnType<typeof useInfrastructureData>;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<FacilityDraft>(() => {
    const initial = facilityDraft(issue);

    return {
      ...initial,
      status:
        issue.reviewState === "INSPECTION_REQUIRED"
          ? "점검 필요"
          : initial.status,
    };
  });
  const [previousIssue, setPreviousIssue] = useState(issue);

  if (issue !== previousIssue) {
    setPreviousIssue(issue);
    setDraft((current) => ({
      ...current,
      result:
        issue.status === "조치 완료" ? issue.action.result : current.result,
      verified:
        issue.status === "조치 완료" ? issue.action.verified : current.verified,
      photos: Array.from(
        new Map(
          [...current.photos, ...issue.action.photos].map((photo) => [
            photo.id,
            photo,
          ]),
        ).values(),
      ),
    }));
  }

  const [busy, setBusy] = useState(false);
  const [relatedPage, setRelatedPage] = useState(1);
  const requested = params.get("dialog");
  const kind = infrastructureDialogs.includes(
    requested as InfrastructureDialogKind,
  )
    ? (requested as InfrastructureDialogKind)
    : null;
  const readOnly = issue.status === "조치 완료";
  const active = useRef(false);
  const submitting = useRef(false);
  const completedActionId = useRef<number | undefined>(
    readOnly ? issue.actionId : undefined,
  );
  const completionUncertain = useRef(false);
  const photoUrls = useRef(new Set<string>());

  useEffect(() => {
    active.current = true;
    const urls = photoUrls.current;

    return () => {
      active.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function clean() {
    const p = new URLSearchParams(params);

    p.delete("dialog");

    return p;
  }

  function dialog(value: InfrastructureDialogKind | null) {
    if (submitting.current) return;
    const p = clean();

    if (value) p.set("dialog", value);
    navigate({ search: p.toString() }, { replace: true });
  }

  function update<K extends keyof FacilityDraft>(
    key: K,
    value: FacilityDraft[K],
  ) {
    if (submitting.current) return;
    const oldPhotos = draft.photos;

    if (key === "photos" && Array.isArray(value)) {
      for (const photo of oldPhotos) {
        if (photo.file && !value.some((item) => item.id === photo.id)) {
          URL.revokeObjectURL(photo.src);
          photoUrls.current.delete(photo.src);
        }
      }
    }

    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(!readOnly && ["result", "photos"].includes(key)
        ? { verified: false }
        : {}),
    }));
    data.setError("");
  }

  async function save(changeStatus: boolean) {
    if (submitting.current || readOnly) return;
    const reviewStatus = changeStatus
      ? publicReviewStatus(draft.status)
      : issue.reviewState || publicReviewStatus(draft.status);

    if (reviewStatus === "ACTION_IN_PROGRESS" || reviewStatus === "COMPLETED") {
      data.setError("검토 상태를 선택한 뒤 상태 저장을 눌러 주세요.");

      return;
    }

    submitting.current = true;
    setBusy(true);
    data.setError("");
    try {
      const saved = await savePublicIssueReview(Number(issue.id), {
        reviewTarget: draft.target,
        reviewStatus,
        inspectionNotes: draft.requirements,
        reviewReason: issue.reviewReason,
      });

      if (!active.current) return;
      setDraft((current) => ({
        ...current,
        target: saved.reviewTarget,
        requirements: saved.inspectionNotes,
      }));
      data.applyReview(saved);
      data.refresh();
      submitting.current = false;
      dialog(changeStatus ? "status-saved" : "requirements-saved");
    } catch (cause) {
      if (active.current) data.setError(publicIssueError(cause));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  function requestComplete() {
    if (submitting.current) return;
    if (readOnly) {
      void finishAction();

      return;
    }

    if (!issue.reviewId) {
      data.setError("공공시설 검토 내용을 먼저 저장해 주세요.");

      return;
    }

    if (
      !draft.result.trim() ||
      draft.result.trim().length > 4000 ||
      !draft.verified
    ) {
      data.setError(
        "조치 결과(1~4000자)와 조치·결과 확인 항목을 확인해 주세요.",
      );

      return;
    }

    data.setError("");
    dialog("complete-confirm");
  }

  async function upload(files: File[]) {
    if (!files.length || submitting.current) return;
    data.setError("");
    try {
      validatePublicIssueImages(files);
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

      setDraft((current) => ({
        ...current,
        photos: [...current.photos, ...photos],
        verified: readOnly ? current.verified : false,
      }));
    } catch (cause) {
      data.setError(publicIssueError(cause));
    }
  }

  async function reconcileCompletion() {
    try {
      const latest = await getPublicIssue(Number(issue.id));

      if (!active.current) return;
      if (latest.status === "COMPLETED") data.applyDetail(latest);
      const action = latest.actions
        .filter((item) => item.status === "COMPLETED")
        .sort((a, b) => b.actionId - a.actionId)[0];

      if (latest.status === "COMPLETED" && action) {
        completedActionId.current = action.actionId;
        data.setError(
          "서버의 조치 완료를 확인했습니다. 남은 사진이 있으면 사진만 다시 저장해 주세요.",
        );
      } else if (latest.status === "COMPLETED") {
        data.setError(
          "조치는 완료되었지만 사진 저장에 필요한 조치 ID를 확인하지 못했습니다. 다시 확인해 주세요.",
        );
        data.refresh();

        return;
      }

      completionUncertain.current = false;
      data.refresh();
    } catch {
      if (active.current)
        data.setError(
          "완료 여부를 확인하지 못했습니다. 완료 버튼을 누르면 상태부터 다시 확인합니다.",
        );
    }
  }

  async function finishAction() {
    if (submitting.current) return;
    if (
      !completionUncertain.current &&
      !completedActionId.current &&
      !readOnly &&
      (!issue.reviewId ||
        !draft.verified ||
        !draft.result.trim() ||
        draft.result.trim().length > 4000)
    ) {
      data.setError("저장된 검토 내용과 조치 결과·확인 항목을 확인해 주세요.");

      return;
    }

    submitting.current = true;
    setBusy(true);
    data.setError("");
    let actionId = readOnly
      ? issue.actionId || completedActionId.current
      : completedActionId.current;

    try {
      if (completionUncertain.current || (readOnly && !actionId)) {
        await reconcileCompletion();

        return;
      }

      if (!actionId) {
        completionUncertain.current = true;
        const completed = await completePublicIssueAction(
          Number(issue.id),
          draft.result,
        );

        actionId = completed.actionId;
        completedActionId.current = actionId;
        completionUncertain.current = false;
        if (active.current) {
          data.applyCompletion(completed);
          data.refresh();
        }
      }

      const pending = draft.photos.filter((photo) => photo.file);

      if (pending.length) {
        const uploaded = await uploadPublicIssueImages(
          Number(issue.id),
          actionId,
          pending.map((photo) => photo.file!),
        );

        pending.forEach((photo) => {
          URL.revokeObjectURL(photo.src);
          photoUrls.current.delete(photo.src);
        });

        if (active.current)
          setDraft((current) => ({
            ...current,
            photos: Array.from(
              new Map(
                [
                  ...current.photos.filter(
                    (photo) => !pending.some((item) => item.id === photo.id),
                  ),
                  ...uploaded.images.map((image) => ({
                    id: String(image.imageId),
                    name: `조치 사진 ${image.imageId}`,
                    src: image.imageUrl,
                  })),
                ].map((photo) => [photo.id, photo]),
              ).values(),
            ),
          }));
      }

      if (active.current) {
        data.refresh();
        submitting.current = false;
        dialog(null);
      }
    } catch (cause) {
      if (active.current) {
        data.setError(
          (actionId
            ? "조치 완료는 처리되었습니다. 사진 저장이 실패해 사진만 다시 저장할 수 있습니다. "
            : "") + publicIssueError(cause),
        );
        if (actionId) data.refresh();
        else if (completionUncertain.current) await reconcileCompletion();
      }
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  const relatedPages = Math.max(1, Math.ceil(data.related.length / 3));
  const page = Math.min(relatedPage, relatedPages);

  return (
    <div
      className={
        "w-full shrink-0 pt-0.5 text-[#202b36] " +
        infrastructureFocus +
        " [&_textarea]:block [&_button:enabled]:cursor-pointer"
      }
    >
      <div className="flex h-12 items-center">
        <h1 className="text-[30px] font-bold leading-9">공공시설 검토 상세</h1>
      </div>
      <div className="relative mt-4 min-h-[21px] pr-[170px]">
        <p className="text-sm leading-[21px]">
          {issue.code + " · " + issue.location + " · " + issue.kind}
        </p>
        <Link
          to={{ pathname: "/infrastructure", search: clean().toString() }}
          className={
            infrastructureSecondary +
            " absolute right-0 bottom-0 h-[42px] w-[150px] gap-4 text-[13px] font-medium"
          }
        >
          <img src={assets.back} alt="" width={18} height={18} />
          목록으로
        </Link>
      </div>
      {data.error && (
        <p role="alert" className="mt-3 text-sm text-[#a53632]">
          {data.error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-[minmax(0,752fr)_minmax(0,414fr)] items-start gap-4 max-[1101px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-4">
          <FacilityReferenceInformation issue={issue} />
          <RelatedApplications
            issue={{ ...issue, related: data.related }}
            relatedTotal={data.relatedTotal}
            loading={data.relatedLoading}
            error={data.relatedError}
            page={page}
            totalPages={relatedPages}
            onPageChange={setRelatedPage}
          />
        </div>
        <InfrastructureReviewPanel
          issue={issue}
          draft={draft}
          busy={busy}
          readOnly={readOnly}
          file={file}
          onUpdate={update}
          onSave={save}
          onComplete={requestComplete}
          onUpload={upload}
        />
      </div>
      {kind &&
        ["requirements-saved", "status-saved", "complete-confirm"].includes(
          kind,
        ) && (
          <InfrastructureDialogs
            kind={kind}
            issue={issue}
            error={data.error}
            busy={busy}
            onClose={() => dialog(null)}
            onConfirm={() => {
              void finishAction();
            }}
          />
        )}
    </div>
  );
}
