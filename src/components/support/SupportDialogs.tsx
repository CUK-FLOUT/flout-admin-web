import SupportDecisionDialogs from "./dialogs/SupportDecisionDialogs";
import SupportOutcomeDialogs from "./dialogs/SupportOutcomeDialogs";
import SupportDocumentDialog from "./dialogs/SupportDocumentDialog";
import SupportInspectionDialog from "./dialogs/SupportInspectionDialog";
import type { SupportDialogProps } from "./dialogs/types";

export default function SupportDialogs(props: SupportDialogProps) {
  switch (props.kind) {
    case "approve":
    case "reject":
    case "review-check":
      return <SupportDecisionDialogs {...props} />;
    case "approved":
    case "rejected":
    case "review-saved":
    case "approved-view":
    case "rejected-view":
      return <SupportOutcomeDialogs {...props} />;
    case "document":
      return <SupportDocumentDialog {...props} />;
    case "inspection":
      return <SupportInspectionDialog {...props} />;
  }
}
