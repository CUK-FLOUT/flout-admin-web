import type {
  ReviewDraft,
  SupportApplication,
  SupportDialogKind,
} from "../../../pages/Support/types";

export type SupportDialogProps = {
  kind: SupportDialogKind;
  application: SupportApplication;
  draft?: ReviewDraft;
  reason?: string;
  document?: string;
  error?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onReason?: (value: string) => void;
  onRegister?: () => void;
};
