import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  ConstructionDialogKind,
  ConstructionRecord,
  InstallationDraft,
} from "./types";
import type { ConstructionMutation } from "./useConstructionMutation";

export type ConstructionActionContext = {
  record?: ConstructionRecord;
  draft: InstallationDraft | null;
  mutation: ConstructionMutation;
  setError: (message: string) => void;
};

export type ConstructionDraftSetter = Dispatch<
  SetStateAction<InstallationDraft | null>
>;
export type ConstructionShowDialog = (
  kind: ConstructionDialogKind,
  id?: string,
) => void;
export type UploadedConstructionPhotoIds = RefObject<Set<string>>;
