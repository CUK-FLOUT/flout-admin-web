import type { ReactNode } from "react";
import type {
  ConstructionCandidate,
  ConstructionDialogKind,
  ConstructionRecord,
  EditableConstructionStatus,
  InstallationDraft,
} from "../../../pages/Construction/types";

export function Row({
  label,
  children,
  right = false,
  success = false,
}: {
  label: string;
  children: ReactNode;
  right?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={
        "grid items-start gap-3 " +
        (right
          ? "grid-cols-[minmax(120px,1fr)_minmax(0,206px)]"
          : "grid-cols-[116px_minmax(0,1fr)] max-[500px]:grid-cols-[96px_minmax(0,1fr)]")
      }
    >
      <dt
        className={
          "text-[13px] " +
          (right ? "leading-[22px]" : "leading-5 text-[#64748b]")
        }
      >
        {label}
      </dt>
      <dd
        className={
          "whitespace-pre-line text-sm " +
          (right ? "text-right leading-[22px] " : "leading-[21px] ") +
          (success ? "text-[#27654d]" : "")
        }
      >
        {children}
      </dd>
    </div>
  );
}

export type ConstructionDialogProps = {
  kind: ConstructionDialogKind;
  application?: ConstructionRecord;
  candidate?: ConstructionCandidate;
  candidates: ConstructionCandidate[];
  draft: InstallationDraft | null;
  target: EditableConstructionStatus | "";
  checked: boolean;
  error: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onInstall: () => void;
  onPublishedReview: () => void;
  onDraftSave: () => void;
  onCandidate: (id: string) => void;
  onChange: (draft: InstallationDraft) => void;
  onChecked: (checked: boolean) => void;
  onUpload: (files: File[]) => void;
};

export const fit = "max-h-[calc(var(--support-viewport-height,100dvh)_-_32px)]!";


export type DetailConstructionDialogProps = ConstructionDialogProps & {
  application: ConstructionRecord;
  draft: InstallationDraft;
};
