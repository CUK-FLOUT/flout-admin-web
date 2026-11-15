import { createPublicIssue, inspectionError } from "../../api/inspections";
import { publicIssueRequest } from "./apiContent";
import type { RegionIssue, ResultsDialogKind } from "./types";
import type { InspectionResultActionOptions } from "./inspectionResultActionTypes";

type Options = InspectionResultActionOptions & {
  address: string;
  setDialog: (kind: ResultsDialogKind | null) => void;
};

export function useInspectionRegionRegistration({
  id,
  busy,
  readOnly,
  inFlightRef,
  isCurrent,
  setSaving,
  setError,
  address,
  setDialog,
}: Options) {
  async function registerRegion(
    issue: Omit<RegionIssue, "id" | "source" | "status" | "applicationId">,
  ) {
    if (busy || inFlightRef.current || readOnly || !isCurrent()) return false;
    inFlightRef.current = true;
    setSaving(true);
    try {
      await createPublicIssue(
        publicIssueRequest(id, {
          ...issue,
          location: issue.location.trim() === address ? "" : issue.location,
        }),
      );
      if (!isCurrent()) return false;
      inFlightRef.current = false;
      setError("");
      setDialog("region-saved");

      return true;
    } catch (cause) {
      if (isCurrent()) throw new Error(inspectionError(cause), { cause });

      return false;
    } finally {
      inFlightRef.current = false;
      if (isCurrent()) setSaving(false);
    }
  }

  return { registerRegion };
}
