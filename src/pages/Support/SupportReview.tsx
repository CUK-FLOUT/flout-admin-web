import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AdministrativeReview from "../../components/support/AdministrativeReview";
import ReviewInformation from "../../components/support/ReviewInformation";
import SupportDialogs from "../../components/support/SupportDialogs";
import {
  supportFocus,
  supportSecondary,
} from "../../components/support/styles";
import { approvalIssue } from "./model";
import { useSupportRecord } from "./useSupportApi";
import {
  approveSupport,
  rejectSupport,
  supportError,
} from "../../api/supportApplications";
import type { SupportApplication } from "./types";
import type { ReviewDraft, SupportDialogKind } from "./types";
import back from "../../assets/support/back.svg";

const dialogKinds: SupportDialogKind[] = [
  "approve",
  "reject",
  "approved",
  "rejected",
  "review-check",
  "inspection",
  "document",
  "approved-view",
  "rejected-view",
];

export default function SupportReview() {
  const { requestId } = useParams();

  const record = useSupportRecord(Number(requestId), true);

  if (!record.application)
    return (
      <section
        role="status"
        className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center"
      >
        <p>{record.error || "지원 신청을 불러오는 중입니다."}</p>
        <Link to="/support" className={supportSecondary}>
          지원 목록으로
        </Link>
      </section>
    );

  return (
    <SupportReviewScreen
      key={requestId + ":" + Boolean(record.application.reviewLoaded)}
      initial={record.application}
      loadError={record.reviewError || ""}
    />
  );
}

function SupportReviewScreen({
  initial,
  loadError = "",
}: {
  initial: SupportApplication;
  loadError?: string;
}) {
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();

  const [a, setApplication] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);
  const [draft, setDraft] = useState<ReviewDraft | null>(() =>
    a ? structuredClone(a.review) : null,
  );

  const [reason, setReason] = useState(a?.review.memo || "");
  const kind = dialogKinds.includes(params.get("dialog") as SupportDialogKind)
    ? (params.get("dialog") as SupportDialogKind)
    : null;
  const returnValue = params.get("returnTo");
  const returnTo =
    returnValue && /^\/support(?:\/\d+)?(?:\?[^#]*)?$/.test(returnValue)
      ? returnValue
      : "/support/" + (requestId || "");

  function show(kind: SupportDialogKind | null, document?: string) {
    const p = new URLSearchParams(params);

    p.delete("dialog");
    p.delete("document");
    if (kind) p.set("dialog", kind);
    if (document) p.set("document", document);
    setParams(p, { replace: true });
  }

  if (!a || !draft)
    return (
      <section className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-bold">
          지원 신청 정보를 찾을 수 없습니다.
        </h1>
        <Link to="/support" className={supportSecondary}>
          지원 목록으로
        </Link>
      </section>
    );
  const currentDraft = a.serverStatus === "SUBMITTED" ? draft : a.review;

  async function confirm() {
    if (
      !mounted.current ||
      saving.current ||
      !a.reviewLoaded ||
      a.serverStatus !== "SUBMITTED" ||
      !a.apiId
    )
      return;
    const approved = kind === "approve" || kind === "review-check";

    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = approved
        ? await approveSupport(a.apiId, currentDraft.scope, currentDraft.checks)
        : await rejectSupport(a.apiId, reason);

      if (!mounted.current) return;
      setApplication({
        ...a,
        serverStatus: result.status,
        status: approved ? "승인" : "미승인",
        review: structuredClone(currentDraft),
        rejectionReason: approved ? "" : reason.trim(),
      });
      show(approved ? "approved" : "rejected");
    } catch (cause) {
      if (mounted.current) setError(supportError(cause));
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function register() {
    window.alert(
      "승인된 신청의 시공 연계는 서버에서 처리합니다. 시공 관리 API 연동 후 목록에서 확인할 수 있습니다.",
    );
  }

  return (
    <div
      className={
        "w-full shrink-0 pt-0.5 text-[#202b36] " +
        supportFocus +
        " [&_button:enabled]:cursor-pointer"
      }
    >
      <div className="relative min-h-[126px]">
        <h1 className="text-[30px] font-bold leading-9">지원 자격 검토</h1>
        <p className="mt-0.5 pr-[160px] text-sm leading-5 max-sm:pr-0">
          신청 정보와 제출 서류를 확인하고 지원 자격을 검토합니다.
        </p>
        <p className="mt-5 text-sm leading-5">
          {a.id + " · " + a.resident + " · " + a.address}
        </p>
        <Link
          to={returnTo}
          className={
            supportSecondary +
            " absolute top-[41px] right-0 h-[42px] w-[150px] gap-2 text-sm font-semibold max-sm:static max-sm:mt-3"
          }
        >
          <img src={back} alt="" width={18} height={18} />
          지원 목록으로
        </Link>
      </div>
      {(error || loadError) && (
        <p role="alert" className="mb-3 text-sm leading-[21px] text-[#a53632]">
          {error || loadError}
        </p>
      )}
      <div
        className={
          "grid grid-cols-[minmax(0,748fr)_minmax(0,418fr)] items-start gap-4 max-[1101px]:grid-cols-1 " +
          (a.ownership === "소유자" ? "pb-0" : "pb-[34px]")
        }
      >
        <ReviewInformation
          application={a}
          onInspection={() => show("inspection")}
          onDocument={(document) => show("document", document)}
        />
        <AdministrativeReview
          application={a}
          draft={currentDraft}
          busy={busy}
          onChange={setDraft}
          onApprove={() =>
            show(approvalIssue(a, currentDraft) ? "review-check" : "approve")
          }
          onReject={() => {
            setReason(currentDraft.memo);
            show("reject");
          }}
          onCheck={() => show("review-check")}
        />
      </div>
      {kind && (
        <SupportDialogs
          key={kind}
          kind={kind}
          application={a}
          draft={currentDraft}
          busy={busy}
          reason={reason}
          document={params.get("document") || undefined}
          error={error || loadError}
          onClose={() => {
            if (!saving.current) show(null);
          }}
          onConfirm={confirm}
          onReason={setReason}
          onRegister={register}
        />
      )}
    </div>
  );
}
