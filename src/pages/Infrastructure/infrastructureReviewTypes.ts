import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  FacilityDraft,
  InfrastructureDialogKind,
  InfrastructureIssue,
} from "./types";
import type { useInfrastructureData } from "./useInfrastructureData";

export type InfrastructureReviewOptions = {
  issue: InfrastructureIssue;
  data: Pick<
    ReturnType<typeof useInfrastructureData>,
    "setError" | "applyReview" | "applyDetail" | "applyCompletion" | "refresh"
  >;
  onDialog: (kind: InfrastructureDialogKind | null) => void;
};

export type InfrastructureActionOptions = InfrastructureReviewOptions & {
  draft: FacilityDraft;
  readOnly: boolean;
  activeRef: RefObject<boolean>;
  submittingRef: RefObject<boolean>;
  setBusy: (busy: boolean) => void;
};
export type SetFacilityDraft = Dispatch<SetStateAction<FacilityDraft>>;
