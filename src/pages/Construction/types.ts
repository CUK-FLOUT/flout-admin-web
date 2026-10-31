export const constructionStatuses = [
  "일정 미등록",
  "예정",
  "진행",
  "완료",
  "전체 완료",
] as const;
export type ConstructionStatus = (typeof constructionStatuses)[number];
export type EditableConstructionStatus = "예정" | "진행" | "완료";
export type ConstructionTab = "전체" | "예정" | "진행" | "완료";
export type ConstructionPhoto = { id: string; name: string; src: string };
export type InstallationDraft = {
  date: string;
  time: string;
  completionDate: string;
  note: string;
  photos: ConstructionPhoto[];
  verified: boolean;
};
export type PublishedInstallation = Pick<
  InstallationDraft,
  "completionDate" | "note" | "photos"
>;
export type ConstructionRecord = {
  id: string;
  resident: string;
  address: string;
  facility: string;
  scope: string;
  consent: string;
  preferred: string;
  status: ConstructionStatus;
  date: string;
  time: string;
  draft: InstallationDraft;
  published: PublishedInstallation | null;
  revision: number;
};
export type ConstructionCandidate = {
  id: string;
  resident: string;
  address: string;
  facility: string;
  scope: string;
  consent: string;
  preferred: string;
  eligible: boolean;
};
export const constructionDialogKinds = [
  "register",
  "register-support",
  "registered",
  "registered-support",
  "schedule-saved",
  "status-confirm",
  "status-saved",
  "installation",
  "draft-saved",
  "published",
  "completion-review",
  "completed-view",
  "overall-saved",
] as const;
export type ConstructionDialogKind = (typeof constructionDialogKinds)[number];
