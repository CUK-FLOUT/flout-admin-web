import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdministrativeReview from "../../components/support/AdministrativeReview";
import ReviewInformation from "../../components/support/ReviewInformation";
import SupportDialogs from "../../components/support/SupportDialogs";
import { supportFocus, supportSecondary } from "../../components/support/styles";
import { approvalIssue, confirmApproval, confirmRejection, withReview } from "./model";
import { useSupportData } from "./useSupportData";
import type { ReviewDraft, SupportDialogKind } from "./types";
import back from "../../assets/support/back.svg";
const dialogKinds: SupportDialogKind[] = ["approve", "reject", "approved", "rejected", "review-saved", "review-check", "inspection", "document", "approved-view", "rejected-view"];
export default function SupportReview() {
  const {requestId} = useParams();
  return <SupportReviewScreen key={requestId}/>;
}
function SupportReviewScreen() {
  const {requestId} = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const {applications, error, updateApplication} = useSupportData();
  const a = applications.find(a => a.id === requestId);
  const [draft, setDraft] = useState<ReviewDraft | null>(() => a ? structuredClone(a.review) : null);
  const [reason, setReason] = useState(a?.rejectionReason || a?.review.memo || "");
  const kind = dialogKinds.includes(params.get("dialog") as SupportDialogKind) ? params.get("dialog") as SupportDialogKind : null;
  const returnValue = params.get("returnTo");
  const returnTo = returnValue && /^\/support(?:\/\d{6})?(?:\?[^#]*)?$/.test(returnValue) ? returnValue : "/support/" + (requestId || "");
  function show(kind: SupportDialogKind | null, document?: string) {
    const p = new URLSearchParams(params); p.delete("dialog"); p.delete("document"); if (kind) p.set("dialog", kind); if (document) p.set("document", document);
    setParams(p, {replace: true});
  }
  if (!a || !draft) return <section className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center"><h1 className="text-xl font-bold">지원 신청 정보를 찾을 수 없습니다.</h1><Link to="/support" className={supportSecondary}>지원 목록으로</Link></section>;
  const currentDraft = a.status === "검토 중" ? draft : a.review;
  function saveReview() {
    if (updateApplication(a!.id, original => original.status === "검토 중" ? withReview(original, currentDraft) : original)) show("review-saved");
  }
  function confirm() {
    if (a!.status !== "검토 중") return;
    const approved = kind === "approve" || kind === "review-check";
    if (updateApplication(a!.id, original => {
      if (original.status !== "검토 중") throw new Error("이미 검토 결과가 확정된 신청입니다. 목록에서 현재 상태를 확인해 주세요.");
      return approved ? confirmApproval(original, currentDraft) : confirmRejection(original, currentDraft, reason);
    })) show(approved ? "approved" : "rejected");
  }
  function register() {
    if (updateApplication(a!.id, original => {
      if (original.status !== "승인") throw new Error("승인된 신청만 시공 대상으로 등록할 수 있습니다.");
      return {...original, constructionRegistered: true};
    })) navigate("/construction?requestId=" + a!.id);
  }
  return <div className={"w-full shrink-0 pt-0.5 text-[#202b36] " + supportFocus + " [&_button:enabled]:cursor-pointer"}>
    <div className="relative min-h-[126px]">
      <h1 className="text-[30px] font-bold leading-9">지원 자격 검토</h1>
      <p className="mt-0.5 pr-[160px] text-sm leading-5 max-sm:pr-0">신청 정보와 제출 서류를 확인하고 지원 자격을 검토합니다.</p>
      <p className="mt-5 text-sm leading-5">{a.id + " · " + a.resident + " · " + a.address}</p>
      <Link to={returnTo} className={supportSecondary + " absolute top-[41px] right-0 h-[42px] w-[150px] gap-2 text-sm font-semibold max-sm:static max-sm:mt-3"}><img src={back} alt="" width={18} height={18}/>지원 목록으로</Link>
    </div>
    {error && <p role="alert" className="mb-3 text-sm leading-[21px] text-[#a53632]">{error}</p>}
    <div className="grid grid-cols-[minmax(0,1fr)_418px] items-start gap-4 pb-[34px] max-[1101px]:grid-cols-1">
      <ReviewInformation application={a} onInspection={() => show("inspection")} onDocument={document => show("document", document)}/>
      <AdministrativeReview application={a} draft={currentDraft} onChange={setDraft} onApprove={() => show(approvalIssue(a, currentDraft) ? "review-check" : "approve")} onReject={() => show("reject")} onSave={saveReview} onCheck={() => show("review-check")}/>
    </div>
    {kind && <SupportDialogs key={kind} kind={kind} application={a} draft={currentDraft} reason={reason} document={params.get("document") || undefined} error={error} onClose={() => show(null)} onConfirm={confirm} onReason={setReason} onRegister={register}/>}
  </div>;
}
