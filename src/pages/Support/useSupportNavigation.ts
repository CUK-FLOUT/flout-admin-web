import { useNavigate } from "react-router-dom";
import { supportInspectionResultPath } from "../Inspection/resultNavigation";
import type { SupportApplication, SupportDialogKind } from "./types";

function supportApplicationPath(
  id: number | undefined,
  params: URLSearchParams,
) {
  const query = params.toString();

  return `/support/${id}${query ? `?${query}` : ""}`;
}

export function useSupportNavigation(
  params: URLSearchParams,
  selected: SupportApplication | undefined,
) {
  const navigate = useNavigate();
  const baseQuery = new URLSearchParams(params);

  baseQuery.delete("dialog");
  baseQuery.delete("document");
  const returnQuery = () => new URLSearchParams(baseQuery);
  const returnPath = selected
    ? supportApplicationPath(selected.apiId, baseQuery)
    : null;

  function change(next: URLSearchParams, id?: string, replace = false) {
    navigate(
      { pathname: "/support" + (id ? "/" + id : ""), search: next.toString() },
      { replace },
    );
  }

  function showDialog(value: SupportDialogKind, document?: string) {
    if (!selected) return;
    const p = returnQuery();

    p.set("dialog", value);
    if (document) p.set("document", document);
    change(p, String(selected.apiId));
  }

  const inspectionPath =
    selected && returnPath
      ? supportInspectionResultPath(selected.inspectionId, returnPath)
      : null;

  function review() {
    if (!selected || !returnPath) return;
    if (selected.status === "승인" || selected.status === "미승인") {
      showDialog(
        selected.status === "승인" ? "approved-view" : "rejected-view",
      );

      return;
    }

    const p = returnQuery();

    p.delete("selected");
    p.set("returnTo", returnPath);
    navigate("/support/" + selected.apiId + "/review?" + p.toString());
  }

  return { navigate, returnQuery, change, showDialog, inspectionPath, review };
}
