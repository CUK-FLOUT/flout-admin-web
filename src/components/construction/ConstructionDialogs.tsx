import { useEffect } from "react";

import ConstructionRegistrationDialogs from "./dialogs/ConstructionRegistrationDialogs";
import ConstructionStatusDialogs from "./dialogs/ConstructionStatusDialogs";
import ConstructionInstallationDialogs from "./dialogs/ConstructionInstallationDialogs";
import type { ConstructionDialogProps } from "./dialogs/ConstructionDialogShared";

export default function ConstructionDialogs(props: ConstructionDialogProps) {
  useEffect(() => {
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");

      if (!dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not([type="file"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0],
        last = controls[controls.length - 1];

      if (!first || !last) return;
      const outside = !dialog.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || outside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", trapFocus, true);

    return () => window.removeEventListener("keydown", trapFocus, true);
  }, []);

  const { kind, application, draft } = props;

  if (kind === "register" || kind === "register-support") {
    return <ConstructionRegistrationDialogs {...props} />;
  }

  if (!application || !draft) return null;

  const detailProps = { ...props, application, draft };

  if (
    kind === "registered" ||
    kind === "registered-support" ||
    kind === "schedule-saved" ||
    kind === "draft-saved" ||
    kind === "status-confirm" ||
    kind === "status-saved" ||
    kind === "overall-saved"
  ) {
    return <ConstructionStatusDialogs {...detailProps} />;
  }

  return <ConstructionInstallationDialogs {...detailProps} />;
}
