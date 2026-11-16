import { useParams, useSearchParams } from "react-router-dom";
import { inspectionResultReturn } from "../Inspection/resultNavigation";
import InspectionReturnLink from "../../components/inspection-results/InspectionReturnLink";
import InspectionResultEditor from "./InspectionResultEditor";
import { useInspectionResultApplication } from "./useInspectionResultApplication";
import emptyDocument from "../../assets/priority/empty-document.svg";

export default function InspectionResults() {
  const { requestId } = useParams();
  const [params] = useSearchParams();
  const returnLink = inspectionResultReturn(requestId, params);
  const { application, error, loading, retry } =
    useInspectionResultApplication(requestId);

  if (loading)
    return (
      <div>
        <InspectionReturnLink {...returnLink} />
        <p role="status">점검 정보를 불러오는 중…</p>
      </div>
    );

  if (!application)
    return (
      <section className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <img src={emptyDocument} alt="" width={56} height={56} />
        <h1 role="alert" className="text-xl font-bold">
          {error || "신청 정보를 찾을 수 없습니다."}
        </h1>
        <button type="button" onClick={retry}>
          다시 시도
        </button>
        <InspectionReturnLink {...inspectionResultReturn(undefined, params)} />
      </section>
    );

  return (
    <InspectionResultEditor
      key={application.id}
      application={application}
      returnLink={returnLink}
    />
  );
}
