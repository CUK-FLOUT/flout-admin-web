import { useRef, useState } from "react";
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
import { infrastructureDialogs } from "./types";
import type {
  InfrastructureDialogKind,
  InfrastructureIssue,
} from "./types";
import { useInfrastructureData } from "./useInfrastructureData";
import { useInfrastructureReviewActions } from "./useInfrastructureReviewActions";

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
  const [relatedPage, setRelatedPage] = useState(1);
  const requested = params.get("dialog");
  const kind = infrastructureDialogs.includes(
    requested as InfrastructureDialogKind,
  )
    ? (requested as InfrastructureDialogKind)
    : null;
  const {
    draft,
    busy,
    readOnly,
    isSubmitting,
    update,
    save,
    requestComplete,
    upload,
    finishAction,
  } = useInfrastructureReviewActions({ issue, data, onDialog: dialog });

  function clean() {
    const p = new URLSearchParams(params);

    p.delete("dialog");

    return p;
  }

  function dialog(value: InfrastructureDialogKind | null) {
    if (isSubmitting()) return;
    const p = clean();

    if (value) p.set("dialog", value);
    navigate({ search: p.toString() }, { replace: true });
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
