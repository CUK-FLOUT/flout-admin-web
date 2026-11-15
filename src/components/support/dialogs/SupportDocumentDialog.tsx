import SupportDialog from "../SupportDialog";
import type { SupportDialogProps } from "./types";
import { supportSecondary } from "../styles";

type Props = Pick<
  SupportDialogProps,
  "application" | "document" | "busy" | "onClose"
>;

export default function SupportDocumentDialog({
  application: a,
  document,
  busy = false,
  onClose,
}: Props) {
  const documentIndex = a.attachmentKeys?.indexOf(document || "") ?? -1;
  const documentTitle =
    documentIndex >= 0 ? a.documents[documentIndex] : document;

  return (
    <SupportDialog
      title={documentTitle || "주민 제출 자료"}
      width="max-w-[480px]"
      height="min-h-[198px]"
      onClose={onClose}
    >
      <p className="text-sm leading-[21px]">주민 제출 자료 · {a.id}</p>
      <p className="text-sm leading-[21px] text-[#64748b]">
        {a.attachmentUrls?.[document || ""] ? (
          <a
            href={a.attachmentUrls[document || ""]}
            target="_blank"
            rel="noopener noreferrer"
          >
            첨부자료 열기
          </a>
        ) : (
          "파일 원본이 연결되지 않았습니다."
        )}
      </p>
      <button disabled={busy} onClick={onClose} className={supportSecondary}>
        닫기
      </button>
    </SupportDialog>
  );
}
