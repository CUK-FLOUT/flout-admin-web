import type { RefObject } from "react";

export type InspectionResultActionOptions = {
  id: number;
  busy: boolean;
  readOnly: boolean;
  inFlightRef: RefObject<boolean>;
  isCurrent: () => boolean;
  setSaving: (saving: boolean) => void;
  setError: (message: string) => void;
};
