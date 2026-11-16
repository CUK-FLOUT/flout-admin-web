import FacilityWarning from "../../components/inspection-results/FacilityWarning";
import { Link } from "react-router-dom";
import type { InspectionResultReturn } from "../Inspection/resultNavigation";
import type { InspectionApplication } from "../Inspection/types";
import ResultPhotos from "../../components/inspection-results/ResultPhotos";
import ResultsDialogs from "../../components/inspection-results/ResultsDialogs";
import { ResidentPreview } from "../../components/inspection-results/ResultFeedback";
import { resultSecondary } from "../../components/inspection-results/styles";
import { inspectionFocus } from "../../components/inspection/styles";
import InspectionResultForm from "./InspectionResultForm";
import useInspectionResultEditor from "./useInspectionResultEditor";
import InspectionReturnLink from "../../components/inspection-results/InspectionReturnLink";

export default function InspectionResultEditor({
  application: a,
  returnLink,
}: {
  application: InspectionApplication;
  returnLink: InspectionResultReturn;
}) {
  const editor = useInspectionResultEditor(a);
  const {
    loading,
    loaded,
    retry,
    removePhoto,
    draft,
    error,
    busy,
    saving,
    editingPublished,
    readOnly,
    content,
    expanded,
    dialog,
    setDialog,
    update,
    persist,
    registerRegion,
    upload,
  } = editor;

  return (
    <div
      className={`w-full min-w-0 shrink-0 pb-[10px] font-[family-name:Inter,Pretendard,sans-serif] text-[#0f172a] ${expanded ? "pt-[2px]" : "pt-px"} ${inspectionFocus} [&_button:enabled]:cursor-pointer`}
    >
      <InspectionReturnLink {...returnLink} blocked={saving} />
      <div className="flex h-10 items-center justify-between gap-4">
        <h1 className="text-[30px] font-bold leading-[38px] max-sm:text-2xl">
          {readOnly
            ? "점검 결과 조회"
            : editingPublished
              ? "공개된 결과 조회·수정"
              : "점검 결과 등록·공개"}
        </h1>
        {editingPublished && (
          <Link
            to={`?${new URLSearchParams({ mode: "edit" })}`}
            className="shrink-0 text-sm font-bold text-[#234f73] underline underline-offset-4"
          >
            공개 결과 수정
          </Link>
        )}
      </div>
      <div
        className={`mt-4 flex items-center text-sm leading-5 text-[#64748b] ${expanded ? "h-5" : "min-h-7"}`}
      >
        {a.id} · {a.resident} · {a.address} · {a.assignee}
      </div>
      {loading && (
        <p role="status" className="my-3 text-xs text-[#64748b]">
          저장된 점검 결과를 불러오는 중…
        </p>
      )}
      {!loading && !loaded && (
        <button type="button" onClick={retry} className={resultSecondary}>
          다시 시도
        </button>
      )}
      {error && (
        <p role="alert" className="my-3 text-sm leading-[21px] text-[#a53632]">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-[minmax(0,760fr)_minmax(0,406fr)] items-start gap-4 max-[1101px]:grid-cols-1">
        <InspectionResultForm editor={editor} />
        {editingPublished ? (
          <ResidentPreview content={draft} />
        ) : (
          <ResultPhotos
            content={content}
            readOnly={readOnly}
            busy={busy}
            onUpload={(event) => {
              void upload(event);
            }}
            allowRemove={true}
            onRemove={(id) => {
              void removePhoto(id);
            }}
            onSave={() => persist(false)}
            onPublish={() => persist(true)}
          />
        )}
      </div>
      {editor.facilityWarning && (
        <FacilityWarning
          busy={busy}
          onClose={editor.dismissFacilityWarning}
          onPublish={() => {
            void editor.confirmFacilityPublish();
          }}
          onEdit={editor.editFacilityActions}
        />
      )}
      {!editor.facilityWarning && dialog && (
        <ResultsDialogs
          busy={busy}
          kind={dialog}
          application={a}
          content={draft}
          setDialog={setDialog}
          onActions={(actions) => {
            update("actions", actions);
            setDialog(null);
          }}
          readOnly={readOnly}
          onRegion={registerRegion}

        />
      )}
    </div>
  );
}

